import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { CustomDesign } from '../../customdesign/entities/customdesign.entity';
import { User } from '../../user/entities/user.entity';

export enum CustomDesignPaymentStatus {
    PENDING_AGREEMENT = 'Pending Agreement',
    AWAITING_PAYMENT = 'Awaiting Payment',
    PAID = 'Paid',
    FAILED = 'Failed',
}

@Entity('custom_design_payments')
export class CustomDesignPayment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    agreedPrice: number;

    @Column({
        type: 'enum',
        enum: CustomDesignPaymentStatus,
        default: CustomDesignPaymentStatus.PENDING_AGREEMENT,
    })
    status: CustomDesignPaymentStatus;

    @Column({ type: 'jsonb', nullable: true })
    paystackData: any;

    @Column({ type: 'boolean', default: false })
    isConfirmedByAgent: boolean;

    @OneToOne(() => CustomDesign, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customDesignId' })
    customDesign: CustomDesign;

    @Column('uuid')
    customDesignId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column('uuid')
    userId: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    amountPaid: number;

    @Column({ type: 'timestamp', nullable: true })
    paidAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
