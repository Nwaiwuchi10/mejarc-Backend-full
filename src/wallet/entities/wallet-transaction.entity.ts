import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
    CREDIT = 'Credit',
    DEBIT = 'Debit',
}

export enum TransactionCategory {
    PRODUCT_SALE = 'Product Sale',
    CUSTOM_DESIGN = 'Custom Design',
    WITHDRAWAL = 'Withdrawal',
    OTHER = 'Other',
}

@Entity('wallet_transactions')
export class WalletTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    balanceAfter: number;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'enum', enum: TransactionCategory, default: TransactionCategory.OTHER })
    category: TransactionCategory;

    @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { onDelete: 'CASCADE' })
    wallet: Wallet;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
