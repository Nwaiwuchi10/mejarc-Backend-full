import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { Agent } from '../../agent/entities/agent.entity';
import { Admin } from '../../admin/entities/admin.entity';

export enum AuditAction {
  WITHDRAWAL_REQUESTED = 'Withdrawal Requested',
  WITHDRAWAL_APPROVED = 'Withdrawal Approved',
  WITHDRAWAL_REJECTED = 'Withdrawal Rejected',
  TRANSFER_INITIATED = 'Transfer Initiated',
  TRANSFER_SUCCESS = 'Transfer Success',
  TRANSFER_FAILED = 'Transfer Failed',
  TRANSFER_REVERSED = 'Transfer Reversed',
  BANK_ACCOUNT_VERIFIED = 'Bank Account Verified',
  BANK_ACCOUNT_REJECTED = 'Bank Account Rejected',
  WALLET_CREDITED = 'Wallet Credited',
  WALLET_DEBITED = 'Wallet Debited',
}

/**
 * Complete audit trail for all wallet-related transactions
 * Ensures transparency and regulatory compliance
 */
@Entity('withdrawal_audit_logs')
@Index(['agentId', 'createdAt'])
@Index(['withdrawalId'])
@Index(['action'])
export class WithdrawalAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column('uuid', { nullable: true })
  withdrawalId: string;

  @ManyToOne(() => WithdrawalRequest, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'withdrawalId' })
  withdrawal: WithdrawalRequest;

  @Column('uuid', { nullable: true })
  adminId: string;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'adminId' })
  admin: Admin;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'text' })
  description: string;

  /**
   * Paystack reference for transfers
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  paystackReference: string;

  /**
   * Paystack transfer code
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  paystackTransferCode: string;

  /**
   * IP address of the user performing action (if applicable)
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  /**
   * User agent / device information
   */
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /**
   * Additional metadata in JSON format
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
