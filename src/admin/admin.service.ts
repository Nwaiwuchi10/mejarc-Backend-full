import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual } from 'typeorm';
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
import { Order } from '../order/entities/order.entity';
import {
  MarketProduct,
  MarketProductStatus,
} from '../marketproduct/entities/marketproduct.entity';
import { Conversation } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(MarketProduct)
    private marketProductRepo: Repository<MarketProduct>,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    private readonly agentService: AgentService,
    private readonly agentMailService: AgentMailService,
    private readonly userMailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  // ══════════════════════════════════════════
  // 1.  MAKE USER AN ADMIN
  // ══════════════════════════════════════════

  /**
   * Promotes an existing User to Admin.
   * POST /admin/make-admin  { userId, role? }
   */
  async makeAdmin(userId: string, role?: string) {
    this.validateUUID(userId, 'user ID');
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
    this.validateUUID(agentId, 'agent ID');

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
    this.validateUUID(id, 'admin ID');
    return this.adminRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async create(admin: Partial<Admin>) {
    const ent = this.adminRepo.create(admin);
    return this.adminRepo.save(ent);
  }

  async approveAgent(agentId: string) {
    this.validateUUID(agentId, 'agent ID');
    const agent = await this.agentService.findOne(agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    await this.agentService.update(agentId, {
      isApprovedByAdmin: true,
      kycStatus: 'VERIFIED',
      registrationStatus: 'APPROVED',
    } as any);

    try {
      if (agent.user)
        await this.agentMailService.sendAgentApprovalNotification(
          agent.user as any,
          agent as any,
          true,
        );
    } catch (e) {}

    return { success: true };
  }

  async rejectAgent(agentId: string, reason?: string) {
    this.validateUUID(agentId, 'agent ID');
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
    } catch (e) {}

    return { success: true };
  }

  // ══════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════

  private validateUUID(id: string, fieldName: string = 'ID'): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(
        `Invalid ${fieldName} format. Must be a valid UUID.`,
      );
    }
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

  // ══════════════════════════════════════════
  // SECTION: USERS
  // ══════════════════════════════════════════

  async getAdminUsers(query: any) {
    const { page = 1, limit = 20, search, status, tab } = query;
    const skip = (page - 1) * limit;

    const where: any[] = [];
    const base: any = {};
    if (status && status !== 'All') base.isSuspended = status === 'Disabled';

    if (search) {
      const s = `%${search}%`;
      where.push({ ...base, firstName: Like(s) });
      where.push({ ...base, lastName: Like(s) });
      where.push({ ...base, email: Like(s) });
    } else {
      where.push(base);
    }

    const [users, total] = await this.userRepo.findAndCount({
      where: where.length ? where : undefined,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const mapStatus = (u: User) =>
      u.isSuspended ? 'Disabled' : u.isEmailVerified ? 'Active' : 'Pending';

    const data = users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.userType,
      userType: u.userType,
      phoneNumber: u.phoneNumber,
      status: mapStatus(u),
      verification: u.isEmailVerified ? 'Verified' : 'Pending',
      lastLogin: u.lastLoginAttempt ?? u.updatedAt,
      profilePics: u.profilePics,
      createdAt: u.createdAt,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAdminUserDetail(userId: string) {
    this.validateUUID(userId, 'user ID');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { password, loginVerificationToken, ...safe } = user as any;
    return safe;
  }

  async suspendUser(userId: string) {
    this.validateUUID(userId, 'user ID');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isSuspended = true;
    await this.userRepo.save(user);
    return { success: true, message: 'User suspended' };
  }

  async activateUser(userId: string) {
    this.validateUUID(userId, 'user ID');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isSuspended = false;
    await this.userRepo.save(user);
    return { success: true, message: 'User activated' };
  }

  // ══════════════════════════════════════════
  // SECTION: COMMUNICATION
  // ══════════════════════════════════════════

  async getCommunicationStats() {
    const total = await this.conversationRepo.count();
    const archived = await this.conversationRepo.count({
      where: { isArchived: true },
    });
    const active = total - archived;
    const unread = await this.messageRepo.count({ where: { isRead: false } });
    return { total, active, archived, unreadMessages: unread };
  }

  async getConversations(query: any) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('conv.lastMessage', 'lastMsg')
      .orderBy('conv.lastMessageAt', 'DESC')
      .take(limit)
      .skip(skip);

    if (search) {
      qb.andWhere(
        '(conv.name ILIKE :s OR user.firstName ILIKE :s OR user.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [convs, total] = await qb.getManyAndCount();

    const data = convs.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      isArchived: c.isArchived,
      lastMessage: (c.lastMessage as any)?.text ?? null,
      lastMessageAt: c.lastMessageAt,
      memberCount: c.members?.length ?? 0,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getConversationDetail(conversationId: string) {
    this.validateUUID(conversationId, 'conversation ID');
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['members', 'members.user', 'messages', 'messages.author'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async escalateConversation(conversationId: string, reason: string) {
    this.validateUUID(conversationId, 'conversation ID');
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    this.logger.log(`Conversation ${conversationId} escalated: ${reason}`);
    return {
      success: true,
      message: 'Conversation escalated to support team',
      conversationId,
      reason,
    };
  }

  // ══════════════════════════════════════════
  // SECTION: MESSAGES
  // ══════════════════════════════════════════

  async getAdminMessages(query: any) {
    return this.getConversations(query);
  }

  async getConversationMessages(conversationId: string) {
    this.validateUUID(conversationId, 'conversation ID');
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['members', 'members.user'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const messages = await this.messageRepo.find({
      where: { conversation: { id: conversationId } } as any,
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    return { conversation: conv, messages };
  }

  async adminSendMessage(
    conversationId: string,
    adminId: string,
    text: string,
    attachments?: string[],
  ) {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const adminRecord = await this.adminRepo.findOne({
      where: { id: adminId },
      relations: ['user'],
    });
    if (!adminRecord) throw new NotFoundException('Admin not found');

    const msg = this.messageRepo.create({
      conversation: conv,
      author: adminRecord.user,
      text,
      attachments: attachments ?? [],
    });
    const saved = await this.messageRepo.save(msg);
    conv.lastMessageAt = new Date();
    conv.lastMessage = saved as any;
    await this.conversationRepo.save(conv);
    return saved;
  }

  // ══════════════════════════════════════════
  // SECTION: FINANCIALS
  // ══════════════════════════════════════════

  async getFinancialStats() {
    const orders = await this.orderRepo.find({ where: { isPaid: true } });
    const totalRevenue = orders.reduce((s, o) => s + Number(o.grandTotal), 0);
    const orderCount = orders.length;
    return {
      totalRevenue,
      customerPayments: totalRevenue,
      agentPayouts: 0,
      platformCommission: +(totalRevenue * 0.05).toFixed(2),
      totalOrders: orderCount,
    };
  }

  async getCustomerTransactions(query: any) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'All') {
      if (status === 'Completed') where.isPaid = true;
      if (status === 'Pending') where.isPaid = false;
    }

    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const data = orders.map((o) => ({
      id: o.id,
      customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Unknown',
      amount: o.grandTotal,
      method: o.paymentMethod ?? 'N/A',
      status: o.isPaid ? 'Completed' : 'Pending',
      date: o.createdAt,
      project: o.projectDsc ?? 'N/A',
      category: 'Marketplace',
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAgentPayouts(query: any) {
    const agents = await this.agentRepo.find({ relations: ['user'], take: 20 });
    const data = agents.map((a) => ({
      id: a.id,
      agent: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown',
      amount: 0,
      status: 'Pending Release',
      date: a.createdAt,
      project: 'N/A',
    }));
    return { data, meta: { total: data.length, page: 1, limit: 20 } };
  }

  async getDisputes(query: any) {
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        note: 'Dispute tracking coming soon',
      },
    };
  }

  async getRefunds(query: any) {
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        note: 'Refund tracking coming soon',
      },
    };
  }

  async releasePayout(payoutId: string, notes?: string) {
    return { success: true, message: `Payout ${payoutId} released`, notes };
  }

  async resolveDispute(
    disputeId: string,
    resolution: string,
    refundTo?: string,
  ) {
    return {
      success: true,
      message: `Dispute ${disputeId} resolved`,
      resolution,
      refundTo,
    };
  }

  async approveRefund(refundId: string, notes?: string) {
    return { success: true, message: `Refund ${refundId} approved`, notes };
  }

  // ══════════════════════════════════════════
  // SECTION: MARKETPLACE
  // ══════════════════════════════════════════

  async getMarketplaceStats() {
    const total = await this.marketProductRepo.count();
    const approved = await this.marketProductRepo.count({
      where: { status: MarketProductStatus.APPROVED },
    });
    const pending = await this.marketProductRepo.count({
      where: { status: MarketProductStatus.PENDING_REVIEW },
    });
    const rejected = await this.marketProductRepo.count({
      where: { status: MarketProductStatus.REJECTED },
    });
    return { total, approved, pending, rejected };
  }

  async getMarketplaceListings(query: any) {
    const { page = 1, limit = 20, search, status, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'All') {
      const map: any = {
        Approved: MarketProductStatus.APPROVED,
        'Pending Approval': MarketProductStatus.PENDING_REVIEW,
        Rejected: MarketProductStatus.REJECTED,
      };
      if (map[status]) where.status = map[status];
    }
    if (type) where.category = type;

    const [products, total] = await this.marketProductRepo.findAndCount({
      where,
      relations: ['agent', 'agent.user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const data = products.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      planType: p.planType,
      price: p.price,
      status: p.status,
      agent: p.agent?.user
        ? `${p.agent.user.firstName} ${p.agent.user.lastName}`
        : 'Unknown',
      agentId: p.agentId,
      createdAt: p.createdAt,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMarketplaceListing(listingId: string) {
    this.validateUUID(listingId, 'listing ID');
    const product = await this.marketProductRepo.findOne({
      where: { id: listingId },
      relations: ['agent', 'agent.user', 'ratings'],
    });
    if (!product) throw new NotFoundException('Listing not found');
    return product;
  }

  async approveMarketplaceListing(listingId: string) {
    this.validateUUID(listingId, 'listing ID');
    const product = await this.marketProductRepo.findOne({
      where: { id: listingId },
    });
    if (!product) throw new NotFoundException('Listing not found');
    product.status = MarketProductStatus.APPROVED;
    await this.marketProductRepo.save(product);
    return { success: true, message: 'Listing approved' };
  }

  async rejectMarketplaceListing(listingId: string, reason?: string) {
    this.validateUUID(listingId, 'listing ID');
    const product = await this.marketProductRepo.findOne({
      where: { id: listingId },
    });
    if (!product) throw new NotFoundException('Listing not found');
    product.status = MarketProductStatus.REJECTED;
    await this.marketProductRepo.save(product);
    return { success: true, message: 'Listing rejected', reason };
  }

  async requestMarketplaceChange(listingId: string, feedback: string) {
    this.validateUUID(listingId, 'listing ID');
    const product = await this.marketProductRepo.findOne({
      where: { id: listingId },
    });
    if (!product) throw new NotFoundException('Listing not found');
    this.logger.log(`Change requested for listing ${listingId}: ${feedback}`);
    return { success: true, message: 'Change request sent to agent', feedback };
  }

  // ══════════════════════════════════════════
  // SECTION: PROJECT OVERSIGHT
  // ══════════════════════════════════════════

  async getProjectStats() {
    const total = await this.orderRepo.count();
    const paid = await this.orderRepo.count({ where: { isPaid: true } });
    const unpaid = total - paid;
    return {
      totalProjects: total,
      ongoing: paid,
      completed: 0,
      disputed: 0,
      cancelled: unpaid,
    };
  }

  async getCustomerProjects(query: any) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepo.findAndCount({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const data = orders.map((o) => ({
      projectId: o.id.slice(0, 8).toUpperCase(),
      orderId: o.id,
      customerName: o.user
        ? `${o.user.firstName} ${o.user.lastName}`
        : 'Unknown',
      planType: o.projectDsc ?? 'N/A',
      purchaseType: o.paymentMethod ?? 'N/A',
      budget: o.grandTotal,
      status: o.isPaid ? 'Ongoing' : 'Pending',
      startDate: o.createdAt,
      deadline: null,
      agentAssigned: null,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAgentPerformance(query: any) {
    const agents = await this.agentRepo.find({
      relations: ['user'],
      take: 50,
    });

    const data = agents.map((a) => ({
      id: a.id,
      name: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown',
      handled: 0,
      completed: 0,
      ongoing: 0,
      cancelled: 0,
      disputed: 0,
      earnings: '₦0',
      rating: 'N/A',
    }));

    return { data, meta: { total: data.length } };
  }

  async getCustomProjectSubmissions(query: any) {
    const products = await this.marketProductRepo.find({
      where: { status: MarketProductStatus.PENDING_REVIEW },
      relations: ['agent', 'agent.user'],
      order: { createdAt: 'DESC' },
    });

    const data = products.map((p) => ({
      submissionId: p.id.slice(0, 8).toUpperCase(),
      productId: p.id,
      agentName: p.agent?.user
        ? `${p.agent.user.firstName} ${p.agent.user.lastName}`
        : 'Unknown',
      projectTitle: p.title,
      planType: p.planType,
      projectValue: p.price,
      submissionDate: p.createdAt,
      status: 'Pending Approval',
    }));

    return { data, meta: { total: data.length } };
  }

  async getProjectDetail(projectId: string) {
    this.validateUUID(projectId, 'project ID');
    const order = await this.orderRepo.findOne({
      where: { id: projectId },
      relations: ['user'],
    });
    if (!order) throw new NotFoundException('Project not found');
    return order;
  }

  async assignAgentToProject(projectId: string, agentId: string) {
    this.validateUUID(projectId, 'project ID');
    this.validateUUID(agentId, 'agent ID');
    const order = await this.orderRepo.findOne({ where: { id: projectId } });
    if (!order) throw new NotFoundException('Project not found');
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    return {
      success: true,
      message: `Agent ${agentId} assigned to project ${projectId}`,
    };
  }

  async approveCustomProject(submissionId: string) {
    this.validateUUID(submissionId, 'submission ID');
    const product = await this.marketProductRepo.findOne({
      where: { id: submissionId },
    });
    if (!product) throw new NotFoundException('Submission not found');
    product.status = MarketProductStatus.APPROVED;
    await this.marketProductRepo.save(product);
    return { success: true, message: 'Custom project approved' };
  }

  async rejectCustomProject(submissionId: string, reason?: string) {
    this.validateUUID(submissionId, 'submission ID');
    const product = await this.marketProductRepo.findOne({
      where: { id: submissionId },
    });
    if (!product) throw new NotFoundException('Submission not found');
    product.status = MarketProductStatus.REJECTED;
    await this.marketProductRepo.save(product);
    return { success: true, message: 'Custom project rejected', reason };
  }

  // ══════════════════════════════════════════
  // SECTION: REPORTS
  // ══════════════════════════════════════════

  async getReportsSummary() {
    const paidOrders = await this.orderRepo.find({ where: { isPaid: true } });
    const totalRevenue = paidOrders.reduce(
      (s, o) => s + Number(o.grandTotal),
      0,
    );
    const totalUsers = await this.userRepo.count();
    const totalAgents = await this.agentRepo.count();
    const totalProducts = await this.marketProductRepo.count();

    return {
      totalRevenue,
      customerPayments: totalRevenue,
      agentPayouts: +(totalRevenue * 0.7).toFixed(2),
      platformCommission: +(totalRevenue * 0.05).toFixed(2),
      totalUsers,
      totalAgents,
      totalProducts,
    };
  }

  async getProjectPerformance() {
    const total = await this.orderRepo.count();
    const completed = await this.orderRepo.count({ where: { isPaid: true } });
    const inProgress = total - completed;
    return {
      total,
      completed,
      inProgress,
      disputed: 0,
      cancelled: 0,
      completionRate: total > 0 ? +((completed / total) * 100).toFixed(1) : 0,
    };
  }

  async getRevenueChart() {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        label: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      };
    }).reverse();

    const data = await Promise.all(
      months.map(async (m) => {
        const start = new Date(m.year, m.month, 1);
        const end = new Date(m.year, m.month + 1, 0, 23, 59, 59);
        const orders = await this.orderRepo.find({
          where: { isPaid: true, createdAt: MoreThanOrEqual(start) },
        });
        const revenue = orders.reduce((s, o) => s + Number(o.grandTotal), 0);
        return { month: m.label, revenue };
      }),
    );

    return { data };
  }

  async getTopAgents() {
    const agents = await this.agentRepo.find({
      relations: ['user', 'profile'],
      take: 10,
      order: { createdAt: 'DESC' },
    });

    const data = agents.map((a) => ({
      id: a.id,
      name: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown',
      avatar: a.user?.profilePics ?? null,
      rating: 0,
      projectsCompleted: 0,
      earnings: 0,
    }));

    return { data };
  }

  async getCustomerActivity() {
    const recent = await this.orderRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const data = recent.map((o) => ({
      userId: o.userId,
      customer: o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Unknown',
      action: o.isPaid ? 'Payment made' : 'Order placed',
      amount: o.grandTotal,
      date: o.createdAt,
    }));

    return { data };
  }

  // ══════════════════════════════════════════
  // SECTION: ROLES
  // ══════════════════════════════════════════

  private rolesStore: any[] = [
    {
      id: '1',
      name: 'Super Admin',
      department: 'Executive',
      users: 1,
      permissions: 'Full System Access',
      createdAt: new Date('2024-01-10'),
    },
    {
      id: '2',
      name: 'Project Manager',
      department: 'Operations',
      users: 6,
      permissions: 'Manage Projects, Assign Agents',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '3',
      name: 'Finance Manager',
      department: 'Finance',
      users: 3,
      permissions: 'Transactions, Refunds, Payouts',
      createdAt: new Date('2024-01-20'),
    },
    {
      id: '4',
      name: 'Support Manager',
      department: 'Customer Support',
      users: 5,
      permissions: 'Handle Disputes, Customer Issues',
      createdAt: new Date('2024-02-02'),
    },
  ];

  async getRolesStats() {
    const totalRoles = this.rolesStore.length;
    const activeStaff = await this.adminRepo.count({
      where: { isActive: true },
    });
    return {
      totalRoles,
      activeStaff,
      departmentsCovered: totalRoles,
      customRolesCreated: 2,
    };
  }

  async getAllRoles() {
    return { data: this.rolesStore, total: this.rolesStore.length };
  }

  async createRole(dto: any) {
    const newRole = {
      id: Date.now().toString(),
      ...dto,
      users: 0,
      createdAt: new Date(),
    };
    this.rolesStore.push(newRole);
    return { success: true, role: newRole };
  }

  async updateRole(roleId: string, dto: any) {
    const idx = this.rolesStore.findIndex((r) => r.id === roleId);
    if (idx < 0) throw new NotFoundException('Role not found');
    this.rolesStore[idx] = { ...this.rolesStore[idx], ...dto };
    return { success: true, role: this.rolesStore[idx] };
  }

  async deleteRole(roleId: string) {
    const idx = this.rolesStore.findIndex((r) => r.id === roleId);
    if (idx < 0) throw new NotFoundException('Role not found');
    this.rolesStore.splice(idx, 1);
    return { success: true, message: 'Role deleted' };
  }

  async getStaffList() {
    const admins = await this.adminRepo.find({ relations: ['user'] });
    const data = admins.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown',
      email: a.user?.email,
      role: a.role ?? 'admin',
      isActive: a.isActive,
      createdAt: a.createdAt,
    }));
    return { data, total: data.length };
  }

  async assignRoleToStaff(userId: string, roleId: string) {
    const admin = await this.adminRepo.findOne({ where: { userId } });
    if (!admin) throw new NotFoundException('Staff member not found');
    const role = this.rolesStore.find((r) => r.id === roleId);
    if (!role) throw new NotFoundException('Role not found');
    admin.role = role.name;
    await this.adminRepo.save(admin);
    return {
      success: true,
      message: `Role "${role.name}" assigned to user ${userId}`,
    };
  }

  async getPermissionMatrix() {
    const permissions = [
      'View Users',
      'Edit Users',
      'Assign Agents',
      'Manage Projects',
      'Approve Refunds',
      'Process Payouts',
      'Access Reports',
    ];
    const roles = [
      'Super Admin',
      'Project Manager',
      'Finance Manager',
      'Support Manager',
    ];
    const matrix: Record<string, number[]> = {
      'Super Admin': [1, 1, 1, 1, 1, 1, 1],
      'Project Manager': [1, 1, 1, 1, 0, 0, 1],
      'Finance Manager': [1, 0, 0, 0, 1, 1, 1],
      'Support Manager': [1, 0, 0, 0, 1, 0, 1],
    };
    return { permissions, roles, matrix };
  }

  // ══════════════════════════════════════════
  // SECTION: SETTINGS
  // ══════════════════════════════════════════

  async getAdminProfile(adminId: string) {
    const admin = await this.adminRepo.findOne({
      where: { id: adminId },
      relations: ['user'],
    });
    if (!admin) throw new NotFoundException('Admin not found');
    const { password, loginVerificationToken, ...safeUser } = admin.user as any;
    return { ...safeUser, adminId: admin.id, adminRole: admin.role };
  }

  async updateAdminProfile(adminId: string, dto: any) {
    const admin = await this.adminRepo.findOne({
      where: { id: adminId },
      relations: ['user'],
    });
    if (!admin) throw new NotFoundException('Admin not found');
    const user = admin.user;
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phoneNumber) user.phoneNumber = dto.phoneNumber;
    if (dto.profilePics) user.profilePics = dto.profilePics;
    await this.userRepo.save(user);
    return { success: true, message: 'Profile updated' };
  }

  async changeAdminPassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const admin = await this.adminRepo.findOne({
      where: { id: adminId },
      relations: ['user'],
    });
    if (!admin) throw new NotFoundException('Admin not found');
    const user = admin.user;
    const valid = await bcrypt.compare(currentPassword, user.password ?? '');
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await this.userRepo.save(user);
    return { success: true, message: 'Password changed successfully' };
  }
}
