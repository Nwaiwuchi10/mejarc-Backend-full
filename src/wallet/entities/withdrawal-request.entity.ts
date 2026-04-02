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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
