import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateAgentProfileDto } from './dto/create-agent-profile.dto';
import { CreateAgentBioDto } from './dto/create-agent-bio.dto';
import { CreateAgentKycDto } from './dto/create-agent-kyc.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Agent,
  AgentKycStatus,
  AgentRegistrationStatus,
} from './entities/agent.entity';
import { AgentProfile } from './entities/agent-profile.entity';
import { AgentBio } from './entities/agent-bio.entity';
import { AgentKyc } from './entities/agent-kyc.entity';
import { User } from '../user/entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { UverifyKycProvider } from './provider/uverify.provider';
import { AgentMailService } from './service/mail.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(AgentProfile)
    private profileRepo: Repository<AgentProfile>,
    @InjectRepository(AgentBio)
    private bioRepo: Repository<AgentBio>,
    @InjectRepository(AgentKyc)
    private kycRepo: Repository<AgentKyc>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private readonly kycProvider: UverifyKycProvider,
    private readonly mailService: AgentMailService,
  ) {}

  /**
   * Initialize agent registration - Creates agent record after user signup
   */
  async initializeAgent(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check if agent already exists
    const existingAgent = await this.agentRepo.findOne({ where: { userId } });
    if (existingAgent) {
      throw new ConflictException('Agent profile already exists for this user');
    }

    const agent = this.agentRepo.create({
      user,
      userId,
      registrationStatus: AgentRegistrationStatus.PROFILE_PENDING,
    });

    return this.agentRepo.save(agent);
  }

  /**
   * Step 1: Submit Profile Information with optional file upload
   */
  async submitProfile(
    userId: string,
    profileDto: CreateAgentProfileDto,
    file?: Express.Multer.File,
  ) {
    let agent = await this.agentRepo.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException(
        'Agent profile not found. Please initialize first.',
      );
    }

    // === Validate required fields ===
    if (
      !profileDto.yearsOfExperience ||
      !profileDto.preferredTitle ||
      !profileDto.specialization
    ) {
      throw new BadRequestException(
        'yearsOfExperience, preferredTitle, and specialization are required',
      );
    }

    // create or update profile entity
    let profile = await this.profileRepo.findOne({
      where: { agentId: agent.id },
    });
    if (!profile) {
      profile = this.profileRepo.create({ agent, agentId: agent.id });
    }

    profile.yearsOfExperience = profileDto.yearsOfExperience;
    profile.preferredTitle = profileDto.preferredTitle;
    profile.specialization = profileDto.specialization;
    profile.portfolioLink = profileDto.portfolioLink;
    profile.phoneNumber = profileDto.phoneNumber;

    // === Handle profile picture upload (S3) ===
    if (file) {
      const uploadedFile = file as Express.Multer.File & {
        location?: string;
      };
      if (!uploadedFile.location) {
        throw new BadRequestException('File upload failed: location missing');
      }
      profile.profilePicture = uploadedFile.location;
    } else if (profileDto.profilePicture) {
      // Fallback to DTO provided URL if no file uploaded
      profile.profilePicture = profileDto.profilePicture;
    }

    await this.profileRepo.save(profile);

    // Update phone on user if provided
    if (profileDto.phoneNumber) {
      agent.user.phoneNumber = profileDto.phoneNumber;
      await this.userRepo.save(agent.user);
    }

    // Move to bio step
    agent.registrationStatus = AgentRegistrationStatus.BIO_PENDING;
    return this.agentRepo.save(agent);
  }

  /**
   * Step 2: Submit Bio
   */
  async submitBio(agentId: string, bioDto: CreateAgentBioDto) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.registrationStatus === AgentRegistrationStatus.APPROVED) {
      throw new BadRequestException('Cannot update approved agent profile');
    }

    // create or update bio record
    let bio = await this.bioRepo.findOne({ where: { agentId: agent.id } });
    if (!bio) {
      bio = this.bioRepo.create({ agent, agentId: agent.id, bio: bioDto.bio });
    } else {
      bio.bio = bioDto.bio;
    }
    await this.bioRepo.save(bio);

    agent.registrationStatus = AgentRegistrationStatus.KYC_PENDING;
    return this.agentRepo.save(agent);
  }

  /**
   * Step 3: Submit KYC Information with file uploads
   */
  async submitKyc(
    agentId: string,
    kycDto: CreateAgentKycDto,
    files?: {
      idDocument?: Express.Multer.File[];
      architectCert?: Express.Multer.File[];
    },
  ) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.registrationStatus === AgentRegistrationStatus.APPROVED) {
      throw new BadRequestException('Cannot update approved agent profile');
    }

    // Validate KYC fields
    if (!kycDto.idType || !kycDto.idNumber) {
      throw new BadRequestException('ID type and number are required');
    }

    if (
      !kycDto.bankName ||
      !kycDto.accountNumber ||
      !kycDto.accountHolderName
    ) {
      throw new BadRequestException('Bank details are required');
    }

    // === Handle file uploads (S3) ===
    let idDocumentUrl: string | undefined;
    let architectCertUrl: string | undefined;

    if (files?.idDocument && files.idDocument.length > 0) {
      const uploadedFile = files.idDocument[0] as Express.Multer.File & {
        location?: string;
      };
      if (!uploadedFile.location) {
        throw new BadRequestException(
          'ID Document upload failed: location missing',
        );
      }
      idDocumentUrl = uploadedFile.location;
    } else if (kycDto.idDocument) {
      // Fallback to DTO provided URL if no file uploaded
      idDocumentUrl = kycDto.idDocument;
    }

    if (files?.architectCert && files.architectCert.length > 0) {
      const uploadedFile = files.architectCert[0] as Express.Multer.File & {
        location?: string;
      };
      if (!uploadedFile.location) {
        throw new BadRequestException(
          'Architect Certificate upload failed: location missing',
        );
      }
      architectCertUrl = uploadedFile.location;
    } else if (kycDto.architectCert) {
      // Fallback to DTO provided URL if no file uploaded
      architectCertUrl = kycDto.architectCert;
    }

    // Find existing KYC record for this agent (e.g., latest or PENDING)
    let kyc = await this.kycRepo.findOne({
      where: { agentId: agent.id },
      order: { createdAt: 'DESC' },
    });

    if (kyc) {
      // Update existing KYC record
      kyc.agent = agent;
      kyc.agentId = agent.id;
      kyc.idType = kycDto.idType;
      kyc.idNumber = kycDto.idNumber;
      kyc.idDocument = idDocumentUrl;
      kyc.architectCert = architectCertUrl;
      kyc.bankName = kycDto.bankName;
      kyc.accountNumber = kycDto.accountNumber;
      kyc.accountHolderName = kycDto.accountHolderName;
      kyc.documents = [];
      kyc.status = 'PENDING' as any;
    } else {
      // Create new KYC record
      kyc = this.kycRepo.create({
        agent,
        agentId: agent.id,
        idType: kycDto.idType,
        idNumber: kycDto.idNumber,
        idDocument: idDocumentUrl,
        architectCert: architectCertUrl,
        bankName: kycDto.bankName,
        accountNumber: kycDto.accountNumber,
        accountHolderName: kycDto.accountHolderName,
        documents: [],
        status: 'PENDING' as any,
      });
    }
    // Always ensure agentId is set
    kyc.agentId = agent.id;
    await this.kycRepo.save(kyc);

    // Move to awaiting approval
    agent.registrationStatus = AgentRegistrationStatus.AWAITING_APPROVAL;
    agent.kycStatus = AgentKycStatus.PENDING;

    const savedAgent = await this.agentRepo.save(agent);

    // Reload agent with user relation to ensure user is populated
    const agentWithUser = await this.agentRepo.findOne({
      where: { id: savedAgent.id },
      relations: ['user'],
    });

    // Send notification to agent that registration is submitted
    try {
      if (agentWithUser && agentWithUser.user) {
        await this.mailService.sendAgentRegistrationSubmittedNotification(
          agentWithUser.user,
          agentWithUser,
        );
      } else {
        this.logger.warn(
          'Agent user relation not found for registration notification',
        );
      }
    } catch (error) {
      this.logger.warn('Failed to send registration submitted email', error);
    }

    // Notify admins about new KYC submission
    try {
      const admins = await this.adminRepo.find({ relations: ['user'] });
      for (const admin of admins) {
        if (admin.user) {
          await this.mailService.sendKycUploadedNotification(
            admin.user,
            savedAgent,
          );
        }
      }
    } catch (error) {
      this.logger.warn('Failed to notify admins about KYC submission', error);
    }

    // Attempt automatic KYC verification via provider
    try {
      // Build documents list from latest KYC record
      const latestKyc = await this.kycRepo.findOne({
        where: { agentId: agent.id },
        order: { createdAt: 'DESC' },
      });
      const documents: { key: string; url: string; name: string }[] = [];
      if (latestKyc?.idDocument) {
        documents.push({
          key: 'idDocument',
          url: latestKyc.idDocument,
          name: 'ID Document',
        });
      }
      if (latestKyc?.architectCert) {
        documents.push({
          key: 'architectCert',
          url: latestKyc.architectCert,
          name: 'Architect Certificate',
        });
      }

      if (documents.length > 0) {
        const verificationResult =
          await this.kycProvider.verifyDocuments(documents);
        if (verificationResult.success) {
          savedAgent.kycStatus = AgentKycStatus.VERIFIED;
          if (latestKyc) {
            latestKyc.status = 'VERIFIED' as any;
            await this.kycRepo.save(latestKyc);
          }
        } else {
          savedAgent.kycStatus = AgentKycStatus.PENDING; // Await manual review
        }
        await this.agentRepo.save(savedAgent);
      }
    } catch (error) {
      this.logger.warn('KYC provider verification failed', error);
      // Continue without automatic verification
    }

    return savedAgent;
  }

  /**
   * Admin: Approve Agent Registration
   */
  async approveAgent(agentId: string, adminId: string) {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.registrationStatus = AgentRegistrationStatus.APPROVED;
    agent.isApprovedByAdmin = true;
    agent.kycStatus = AgentKycStatus.VERIFIED;
    agent.approvedAt = new Date();

    const savedAgent = await this.agentRepo.save(agent);

    // Send approval email to agent
    try {
      await this.mailService.sendAgentApprovalNotification(
        savedAgent.user,
        savedAgent,
        true,
      );
    } catch (error) {
      this.logger.warn('Failed to send approval email', error);
    }

    return savedAgent;
  }

  /**
   * Admin: Reject Agent Registration
   */
  async rejectAgent(agentId: string, adminId: string, reason: string) {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.registrationStatus = AgentRegistrationStatus.REJECTED;
    agent.rejectionReason = reason;
    agent.kycStatus = AgentKycStatus.REJECTED;

    const savedAgent = await this.agentRepo.save(agent);

    // Send rejection email to agent
    try {
      await this.mailService.sendAgentRejectionNotification(
        savedAgent.user,
        savedAgent,
        reason,
      );
    } catch (error) {
      this.logger.warn('Failed to send rejection email', error);
    }

    return savedAgent;
  }

  /**
   * Get agent by userId
   */
  async getAgentByUserId(userId: string) {
    const agent = await this.agentRepo.findOne({
      where: { userId },
      relations: ['user', 'profile', 'bioRecord', 'kycRecords'],
    });

    if (!agent) {
      throw new NotFoundException('Agent profile not found for this user');
    }

    return agent;
  }

  /**
   * Get agent status
   */
  async getAgentStatus(agentId: string) {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['user', 'kycRecords'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return {
      id: agent.id,
      registrationStatus: agent.registrationStatus,
      kycStatus: agent.kycStatus,
      isApproved: agent.isApprovedByAdmin,
      approvedAt: agent.approvedAt,
      rejectionReason: agent.rejectionReason,
    };
  }

  // ===== LEGACY METHODS =====

  async create(userId: string, dto: CreateAgentDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const agent = this.agentRepo.create({ ...dto, user, userId });
    return this.agentRepo.save(agent);
  }

  findAll() {
    return this.agentRepo.find({ relations: ['user'] });
  }

  findOne(id: string) {
    return this.agentRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async update(id: string, dto: UpdateAgentDto) {
    const agent = await this.findOne(id);
    if (!agent) throw new NotFoundException('Agent not found');
    Object.assign(agent, dto);
    return this.agentRepo.save(agent);
  }

  async remove(id: string) {
    const agent = await this.findOne(id);
    if (!agent) throw new NotFoundException('Agent not found');
    return this.agentRepo.softRemove(agent);
  }

  async addKycDocument(
    id: string,
    doc: { key: string; url: string; name?: string },
  ) {
    const agent = await this.findOne(id);
    if (!agent) throw new NotFoundException('Agent not found');

    // attach document to latest KYC record or create a new one
    let latestKyc = await this.kycRepo.findOne({
      where: { agentId: agent.id },
      order: { createdAt: 'DESC' },
    });

    if (!latestKyc) {
      latestKyc = this.kycRepo.create({
        agent,
        agentId: agent.id,
        idType: null as any,
        idNumber: null as any,
        documents: [doc],
        status: 'PENDING' as any,
      });
    } else {
      latestKyc.documents = latestKyc.documents || [];
      latestKyc.documents.push(doc as any);
      latestKyc.status = 'PENDING' as any;
    }

    await this.kycRepo.save(latestKyc);

    agent.kycStatus = AgentKycStatus.PENDING;
    const savedAgent = await this.agentRepo.save(agent);

    // notify admins that KYC was uploaded
    try {
      const admins = await this.adminRepo.find({ relations: ['user'] });
      for (const adm of admins) {
        if (adm.user)
          await this.mailService.sendKycUploadedNotification(
            adm.user,
            savedAgent as any,
          );
      }
    } catch (e) {
      this.logger.warn(
        'Failed to notify admins about KYC upload',
        e?.toString(),
      );
    }

    // run provider verification (uVerify)
    try {
      const docs = (latestKyc.documents || []).map((d) => ({
        key: d.key,
        url: d.url,
        name: d.name || d.key,
      }));
      const result = await this.kycProvider.verifyDocuments(docs);
      if (result.success) {
        latestKyc.status = 'VERIFIED' as any;
        await this.kycRepo.save(latestKyc);
        savedAgent.kycStatus = AgentKycStatus.VERIFIED;
      } else {
        latestKyc.status = 'REJECTED' as any;
        await this.kycRepo.save(latestKyc);
        savedAgent.kycStatus = AgentKycStatus.REJECTED;
      }
      await this.agentRepo.save(savedAgent);
    } catch (err) {
      this.logger.warn('KYC provider call failed', err?.toString());
    }

    return savedAgent;
  }

  async setKycStatus(id: string, status: AgentKycStatus) {
    const agent = await this.findOne(id);
    if (!agent) throw new NotFoundException('Agent not found');

    // update latest kyc record if exists
    const latestKyc = await this.kycRepo.findOne({
      where: { agentId: agent.id },
      order: { createdAt: 'DESC' },
    });
    if (latestKyc) {
      latestKyc.status =
        status === AgentKycStatus.VERIFIED
          ? ('VERIFIED' as any)
          : status === AgentKycStatus.REJECTED
            ? ('REJECTED' as any)
            : ('PENDING' as any);
      await this.kycRepo.save(latestKyc);
    }

    agent.kycStatus = status;
    return this.agentRepo.save(agent);
  }
}
