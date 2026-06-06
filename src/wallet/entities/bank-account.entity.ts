import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../../agent/entities/agent.entity';

export enum BankAccountStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected',
}

@Entity('bank_accounts')
@Index(['agentId', 'isDefault'])
@Index(['status'])
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'varchar', length: 255 })
  accountHolderName: string;

  @Column({ type: 'varchar', length: 50 })
  accountNumber: string;

  @Column({ type: 'varchar', length: 10 })
  bankCode: string;

  @Column({ type: 'varchar', length: 255 })
  bankName: string;

  /**
   * Paystack recipient code for automated transfers
   * Generated after bank account verification
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  paystackRecipientCode: string;

  /**
   * Account verification status
   */
  @Column({
    type: 'enum',
    enum: BankAccountStatus,
    default: BankAccountStatus.PENDING,
  })
  status: BankAccountStatus;

  /**
   * Resolved account name from Paystack verification
   * Helps confirm account validity
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  resolvedAccountName: string;

  /**
   * Whether this is the primary bank account for withdrawals
   */
  @Column({ type: 'boolean', default: true })
  isDefault: boolean;

  /**
   * Verification rejection reason (if rejected)
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  /**
   * Verification rejection date
   */
  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  /**
   * Verification verified date
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
