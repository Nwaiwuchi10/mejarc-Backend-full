import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { AgentProfile } from './agent-profile.entity';
import { AgentBio } from './agent-bio.entity';
import { AgentKyc } from './agent-kyc.entity';

export enum AgentKycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum AgentRegistrationStatus {
  PROFILE_PENDING = 'profile_pending',
  BIO_PENDING = 'bio_pending',
  KYC_PENDING = 'kyc_pending',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;
  // Related entities (split for clarity)
  @OneToOne(() => AgentProfile, (p) => p.agent, { cascade: true, eager: true })
  profile?: AgentProfile;

  @OneToOne(() => AgentBio, (b) => b.agent, { cascade: true, eager: true })
  @JoinColumn()
  bioRecord?: AgentBio;

  @OneToMany(() => AgentKyc, (k) => k.agent, { cascade: true, eager: true })
  kycRecords?: AgentKyc[];

  // ===== LEGACY/BUSINESS FIELDS =====
  @Column({ nullable: true })
  businessName?: string;

  @Column({ type: 'simple-json', nullable: true })
  kycDocuments?: { key: string; url: string; name?: string }[];

  // ===== STATUS & APPROVAL =====
  @Column({
    type: 'enum',
    enum: AgentRegistrationStatus,
    default: AgentRegistrationStatus.PROFILE_PENDING,
  })
  registrationStatus: AgentRegistrationStatus;

  @Column({
    type: 'enum',
    enum: AgentKycStatus,
    default: AgentKycStatus.PENDING,
  })
  kycStatus: AgentKycStatus;

  @Column({ default: false })
  isApprovedByAdmin: boolean;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // ===== TIMESTAMPS =====
  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
