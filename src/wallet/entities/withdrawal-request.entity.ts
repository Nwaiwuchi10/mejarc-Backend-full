import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from '../../agent/entities/agent.entity';

export enum WithdrawalStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PROCESSING = 'Processing',
  TRANSFERRED = 'Transferred',
  FAILED = 'Failed',
  REVERSED = 'Reversed',
}

@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  accountDetails: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column('uuid')
  agentId: string;

  // ===== PAYSTACK INTEGRATION FIELDS =====
  /**
   * Paystack transfer reference for tracking
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  paystackReference: string;

  /**
   * Paystack transfer code for verification
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  paystackTransferCode: string;

  /**
   * Amount in Kobo (smallest unit) as sent to Paystack
   * (Naira amount × 100)
   */
  @Column({ type: 'bigint', nullable: true })
  amountInKobo: number;

  /**
   * Number of retry attempts for failed transfers
   */
  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  /**
   * Maximum retry attempts before marking as failed
   */
  @Column({ type: 'integer', default: 3 })
  maxRetries: number;

  /**
   * Last error message from Paystack or system
   */
  @Column({ type: 'text', nullable: true })
  lastErrorMessage: string;

  /**
   * Timestamp when transfer was initiated
   */
  @Column({ type: 'timestamp', nullable: true })
  transferInitiatedAt: Date;

  /**
   * Timestamp when transfer completed (success or failure)
   */
  @Column({ type: 'timestamp', nullable: true })
  transferCompletedAt: Date;

  /**
   * Whether automatic processing is enabled for this withdrawal
   */
  @Column({ type: 'boolean', default: true })
  autoProcess: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
