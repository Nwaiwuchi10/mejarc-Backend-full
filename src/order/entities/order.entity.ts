import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
export enum PaymentStatus {
  paid = 'paid',
  notPaid = 'not paid',
}

export class BillingInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  address?: string;
  date?: Date;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ type: 'jsonb', nullable: true })
  orderItems: any[];

  @Column({ type: 'jsonb', nullable: true })
  billingInfo: BillingInfo;

  @Column({ type: 'jsonb', nullable: true })
  payStackPayment: any;

  @Column({ nullable: true })
  redirect_url: string;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'jsonb', nullable: true })
  deliveryStatus: any;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
  grandTotal: number;

  @Column({ nullable: true })
  projectDsc: string;

  @Column({ type: 'jsonb', default: [] })
  comments: any[];

  @Column({ type: 'jsonb', default: [] })
  deliveryComment: any[];

  @Column({ nullable: true })
  amountPaid: string;

  @Column({ nullable: true })
  date: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
