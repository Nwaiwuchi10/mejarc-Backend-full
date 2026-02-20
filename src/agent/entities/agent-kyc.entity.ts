import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

export enum KycRecordStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Entity('agent_kyc')
export class AgentKyc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, (agent) => agent.kycRecords, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column('uuid')
  agentId: string;

  @Column({ nullable: true })
  idType?: string;

  @Column({ nullable: true })
  idNumber?: string;

  @Column({ nullable: true })
  idDocument?: string;

  @Column({ nullable: true })
  architectCert?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  accountNumber?: string;

  @Column({ nullable: true })
  accountHolderName?: string;

  @Column({ type: 'simple-json', nullable: true })
  documents?: { key: string; url: string; name?: string }[];

  @Column({
    type: 'enum',
    enum: KycRecordStatus,
    default: KycRecordStatus.PENDING,
  })
  status: KycRecordStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
