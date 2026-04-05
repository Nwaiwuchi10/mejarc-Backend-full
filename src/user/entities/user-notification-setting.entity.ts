import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_notification_settings')
export class UserNotificationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // MESSAGES
  @Column({ default: true })
  messagesAdmin: boolean;

  @Column({ default: true })
  messagesAgent: boolean;

  // PROJECT UPDATES
  @Column({ default: true })
  projectFileUploaded: boolean;

  @Column({ default: true })
  projectStatusChanged: boolean;

  @Column({ default: true })
  projectRevisionUpdates: boolean;

  // PAYMENTS & ORDERS
  @Column({ default: true })
  paymentSuccessful: boolean;

  @Column({ default: true })
  paymentOrderConfirmation: boolean;

  // REVIEWS & FEEDBACK
  @Column({ default: true })
  reviewReminder: boolean;

  @Column({ default: true })
  reviewResponse: boolean;

  // Delivery Channels
  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: false })
  smsNotifications: boolean;

  @OneToOne(() => User, (user) => user.notificationSettings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
