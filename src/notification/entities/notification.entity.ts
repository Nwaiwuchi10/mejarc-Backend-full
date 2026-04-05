import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

export enum NotificationType {
    PRODUCT = 'product',
    ORDER = 'order',
    WALLET = 'wallet',
    WITHDRAWAL = 'withdrawal',
    ADMIN = 'admin',
    AGENT_MESSAGE = 'agent_message',
    CUSTOMDESIGN = 'customdesign',
    PRODUCTPAYMENT = "productpayment",
    CUSTOMDESIGNPAYMENT = "customdesignpayment",
    KYC = "kyc",
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ default: false })
    isRead: boolean;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('uuid')
    userId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
