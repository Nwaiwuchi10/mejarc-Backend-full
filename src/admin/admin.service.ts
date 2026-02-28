import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { Admin } from './entities/admin.entity';
import { User } from '../user/entities/user.entity';
import { Agent } from '../agent/entities/agent.entity';
import { AgentService } from '../agent/agent.service';
import { AgentMailService } from '../agent/service/mail.service';
import { MailService } from '../user/service/mail.service';
import { PaginationDto } from '../utils/pagination.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    private readonly agentService: AgentService,
    private readonly agentMailService: AgentMailService,
    private readonly userMailService: MailService,
    private readonly jwtService: JwtService,
  ) { }

  // ══════════════════════════════════════════
  // 1.  MAKE USER AN ADMIN
  // ══════════════════════════════════════════

  /**
   * Promotes an existing User to Admin.
   * POST /admin/make-admin  { userId, role? }
   */
  async makeAdmin(userId: string, role?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.adminRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('User is already an admin');

    const admin = this.adminRepo.create({
      userId,
      user,
      role: role ?? 'admin',
      isAdmin: true,
      isActive: true,
    });

    const saved = await this.adminRepo.save(admin);
    this.logger.log(`User ${userId} promoted to admin`);

    const { user: _u, ...adminData } = saved;
    return {
      success: true,
      message: `User has been promoted to admin`,
      admin: adminData,
    };
  }

  // ══════════════════════════════════════════
  // 2.  ADMIN LOGIN — Step 1: Validate creds & send OTP
  // ══════════════════════════════════════════

  /**
   * POST /admin/login  { email, password }
   * Finds the user, verifies password, checks admin record, sends OTP.
   */
  async adminLogin(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const adminRecord = await this.adminRepo.findOne({
      where: { userId: user.id },
    });
    if (!adminRecord || !adminRecord.isAdmin || !adminRecord.isActive) {
      throw new UnauthorizedException('Not authorised as admin');
    }

    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Generate a 6-character OTP
    const otp = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    user.loginVerificationToken = otp;
    user.loginVerificationTokenExpiry = expiry;
    await this.userRepo.save(user);

    // Re-use existing mail service to send OTP
    try {
      await this.userMailService.sendLoginVerificationEmail(
        user.email,
        user.firstName,
        otp,
      );
    } catch (err) {
      this.logger.warn('Failed to send admin OTP email', err);
    }

    return {
      success: true,
      message: 'OTP sent to admin email',
      email: user.email,
      expiresIn: '15 minutes',
    };
  }

  // ══════════════════════════════════════════
  // 3.  ADMIN LOGIN — Step 2: Verify OTP & issue admin JWT
  // ══════════════════════════════════════════

  /**
   * POST /admin/verify-login  { email, token }
   * Verifies OTP, issues an admin-scoped JWT.
   */
  async verifyAdminLogin(email: string, token: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    const adminRecord = await this.adminRepo.findOne({
      where: { userId: user.id },
    });
    if (!adminRecord) throw new UnauthorizedException('Not an admin');

    if (!user.loginVerificationToken) {
      throw new UnauthorizedException('No OTP found. Please login first.');
    }

    if (
      user.loginVerificationTokenExpiry &&
      user.loginVerificationTokenExpiry < new Date()
    ) {
      user.loginVerificationToken = undefined;
      user.loginVerificationTokenExpiry = undefined;
      await this.userRepo.save(user);
      throw new UnauthorizedException('OTP expired. Please login again.');
    }

    if (user.loginVerificationToken !== token) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear token
    user.loginVerificationToken = undefined;
    user.loginVerificationTokenExpiry = undefined;
    user.isEmailVerified = true;
    await this.userRepo.save(user);

    // Issue admin-scoped JWT
    const adminToken = this.jwtService.sign({
      userId: user.id,
      adminId: adminRecord.id,
      role: 'admin',
    });

    const { password: _p, ...safeUser } = user;
    return {
      success: true,
      message: 'Admin login successful',
      adminToken,
      admin: {
        ...safeUser,
        adminId: adminRecord.id,
        adminRole: adminRecord.role,
      },
    };
  }

  // ══════════════════════════════════════════
  // 4.  ADMIN — VIEW ALL AGENT REGISTRATIONS
  // ══════════════════════════════════════════

  /**
   * GET /admin/agents
   * Returns all agents with profile + latest KYC summary.
   */
  async getAllAgents(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      relations: ['user', 'profile', 'bioRecord', 'kycRecords'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
    };

    if (search) {
      queryOptions.where = [
        { businessName: Like(`%${search}%`) },
        { user: { firstName: Like(`%${search}%`) } },
        { user: { lastName: Like(`%${search}%`) } },
        { user: { email: Like(`%${search}%`) } },
      ];
    }

    const [agents, total] = await this.agentRepo.findAndCount(queryOptions);

    return {
      data: agents.map((agent) => this.formatAgentSummary(agent)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ══════════════════════════════════════════
  // 5.  ADMIN — VIEW SINGLE AGENT DETAIL
  // ══════════════════════════════════════════

  /**
   * GET /admin/agents/:agentId
   * Returns a single agent's full detail with all KYC records.
   */
  async getAgentDetail(agentId: string) {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['user', 'profile', 'bioRecord', 'kycRecords'],
    });

    if (!agent) throw new NotFoundException('Agent not found');

    return this.formatAgentDetail(agent);
  }

  // ══════════════════════════════════════════
  // LEGACY / EXISTING HELPERS
  // ══════════════════════════════════════════

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      relations: ['user'],
      take: limit,
      skip: skip,
    };

    if (search) {
      queryOptions.where = [
        { role: Like(`%${search}%`) },
        { user: { firstName: Like(`%${search}%`) } },
        { user: { lastName: Like(`%${search}%`) } },
        { user: { email: Like(`%${search}%`) } },
      ];
    }

    const [data, total] = await this.adminRepo.findAndCount(queryOptions);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.adminRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async create(admin: Partial<Admin>) {
    const ent = this.adminRepo.create(admin);
    return this.adminRepo.save(ent);
  }

  async approveAgent(agentId: string) {
    const agent = await this.agentService.findOne(agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    await this.agentService.update(agentId, {
      isApprovedByAdmin: true,
      kycStatus: 'VERIFIED',
    } as any);

    try {
      if (agent.user)
        await this.agentMailService.sendAgentApprovalNotification(
          agent.user as any,
          agent as any,
          true,
        );
    } catch (e) { }

    return { success: true };
  }

  async rejectAgent(agentId: string, reason?: string) {
    const agent = await this.agentService.findOne(agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    await this.agentService.update(agentId, {
      isApprovedByAdmin: false,
      kycStatus: 'REJECTED',
    } as any);

    try {
      if (agent.user)
        await this.agentMailService.sendAgentApprovalNotification(
          agent.user as any,
          agent as any,
          false,
        );
    } catch (e) { }

    return { success: true };
  }

  // ══════════════════════════════════════════
  // PRIVATE FORMATTERS
  // ══════════════════════════════════════════

  private formatAgentSummary(agent: Agent) {
    const latestKyc = (agent.kycRecords ?? [])
      .slice()
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];

    return {
      id: agent.id,
      userId: agent.userId,
      registrationStatus: agent.registrationStatus,
      kycStatus: agent.kycStatus,
      isApprovedByAdmin: agent.isApprovedByAdmin,
      approvedAt: agent.approvedAt,
      rejectionReason: agent.rejectionReason,
      createdAt: agent.createdAt,
      // User info
      user: agent.user
        ? {
          id: agent.user.id,
          firstName: agent.user.firstName,
          lastName: agent.user.lastName,
          email: agent.user.email,
          phoneNumber: agent.user.phoneNumber,
        }
        : null,
      // Profile summary
      profile: agent.profile
        ? {
          preferredTitle: agent.profile.preferredTitle,
          licenseNumber: agent.profile.licenseNumber,
          yearsOfExperience: agent.profile.yearsOfExperience,
          specialization: agent.profile.specialization,
          portfolioLink: agent.profile.portfolioLink,
          profilePicture: agent.profile.profilePicture,
        }
        : null,
      // Latest KYC summary
      latestKyc: latestKyc
        ? {
          id: latestKyc.id,
          status: latestKyc.status,
          idType: latestKyc.idType,
          idNumber: latestKyc.idNumber,
          bankName: latestKyc.bankName,
          accountNumber: latestKyc.accountNumber,
          accountHolderName: latestKyc.accountHolderName,
          submittedAt: latestKyc.createdAt,
        }
        : null,
    };
  }

  private formatAgentDetail(agent: Agent) {
    return {
      id: agent.id,
      userId: agent.userId,
      registrationStatus: agent.registrationStatus,
      kycStatus: agent.kycStatus,
      isApprovedByAdmin: agent.isApprovedByAdmin,
      approvedAt: agent.approvedAt,
      rejectionReason: agent.rejectionReason,
      businessName: agent.businessName,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      // Full user info
      user: agent.user
        ? {
          id: agent.user.id,
          firstName: agent.user.firstName,
          lastName: agent.user.lastName,
          email: agent.user.email,
          phoneNumber: agent.user.phoneNumber,
          profilePics: agent.user.profilePics,
        }
        : null,
      // Full profile
      profile: agent.profile ?? null,
      // Bio
      bio: agent.bioRecord?.bio ?? null,
      // All KYC records (full details)
      kycRecords: (agent.kycRecords ?? [])
        .slice()
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
        .map((k) => ({
          id: k.id,
          status: k.status,
          idType: k.idType,
          idNumber: k.idNumber,
          idDocument: k.idDocument,
          architectCert: k.architectCert,
          bankName: k.bankName,
          accountNumber: k.accountNumber,
          accountHolderName: k.accountHolderName,
          documents: k.documents,
          submittedAt: k.createdAt,
          updatedAt: k.updatedAt,
        })),
    };
  }
}
