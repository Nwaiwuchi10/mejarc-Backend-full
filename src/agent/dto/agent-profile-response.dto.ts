import {
  Agent,
  AgentRegistrationStatus,
  AgentKycStatus,
} from '../entities/agent.entity';

/**
 * Agent Profile Response with registration status
 */
export class AgentProfileResponseDto {
  id: string;
  userId: string;
  registrationStatus: AgentRegistrationStatus;
  kycStatus: AgentKycStatus;
  isApprovedByAdmin: boolean;
  approvedAt?: Date;
  rejectionReason?: string;

  // Profile fields
  yearsOfExperience?: number;
  preferredTitle?: string;
  licenseNumber?: string;
  specialization?: string[];
  portfolioLink?: string;
  profilePicture?: string;

  // Bio fields
  bio?: string;

  // KYC fields
  idType?: string;
  idNumber?: string;
  idDocument?: string;
  architectCert?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;

  createdAt: Date;
  updatedAt: Date;

  static fromEntity(agent: Agent): AgentProfileResponseDto {
    const profile = agent.profile;
    const bio = agent.bioRecord;
    const latestKyc = (agent.kycRecords || [])
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt?.getTime() || 0;
        const tb = b.createdAt?.getTime() || 0;
        return ta - tb;
      })
      .pop();

    return {
      id: agent.id,
      userId: agent.userId,
      registrationStatus: agent.registrationStatus,
      kycStatus: agent.kycStatus,
      isApprovedByAdmin: agent.isApprovedByAdmin,
      approvedAt: agent.approvedAt,
      rejectionReason: agent.rejectionReason,
      yearsOfExperience: profile?.yearsOfExperience,
      preferredTitle: profile?.preferredTitle,
      licenseNumber: profile?.licenseNumber,
      specialization: profile?.specialization,
      portfolioLink: profile?.portfolioLink,
      profilePicture: profile?.profilePicture,
      bio: bio?.bio,
      idType: latestKyc?.idType,
      idNumber: latestKyc?.idNumber,
      idDocument: latestKyc?.idDocument,
      architectCert: latestKyc?.architectCert,
      bankName: latestKyc?.bankName,
      accountNumber: latestKyc?.accountNumber,
      accountHolderName: latestKyc?.accountHolderName,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}

/**
 * Agent Status Summary (minimal response)
 */
export class AgentStatusResponseDto {
  id: string;
  registrationStatus: AgentRegistrationStatus;
  kycStatus: AgentKycStatus;
  isApproved: boolean;
  approvedAt?: Date;
  rejectionReason?: string;

  static fromEntity(agent: Agent): AgentStatusResponseDto {
    return {
      id: agent.id,
      registrationStatus: agent.registrationStatus,
      kycStatus: agent.kycStatus,
      isApproved: agent.isApprovedByAdmin,
      approvedAt: agent.approvedAt,
      rejectionReason: agent.rejectionReason,
    };
  }
}
