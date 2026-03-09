import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Agent } from '../../agent/entities/agent.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Entity('wallets')
export class Wallet {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
    balance: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
    pendingClearance: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
    lifetimeEarnings: number;

    @OneToOne(() => Agent, (agent) => agent.wallet, { onDelete: 'CASCADE' })
    @JoinColumn()
    agent: Agent;

    @OneToMany(() => WalletTransaction, (transaction) => transaction.wallet, { cascade: true })
    transactions: WalletTransaction[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
