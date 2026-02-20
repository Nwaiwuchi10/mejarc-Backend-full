import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToOne,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserAddress } from './user-adress.entity';

export enum UserType {
  CUSTOMER = 'Customer',
}

@Entity('users')
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===== Basic Info =====
  @Column({ length: 80 })
  firstName: string;

  @Column({ length: 80 })
  lastName: string;

  @Column({ length: 180 })
  email: string;

  @Column({ length: 30, nullable: true })
  phoneNumber?: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.CUSTOMER,
  })
  userType: UserType;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  profilePics?: string;

  // ===== Auth =====
  @Column({ nullable: true })
  password?: string;

  // ===== Login Verification =====
  @Column({ nullable: true })
  loginVerificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  loginVerificationTokenExpiry?: Date;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAttempt?: Date;

  @BeforeInsert()
  async hashPassword() {
    if (!this.password) return;

    if (!this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  // ===== Relations =====
  @OneToOne(() => UserAddress, { cascade: true, eager: true })
  @JoinColumn()
  address?: UserAddress;

  //   @ManyToOne(() => PricingPlan, { nullable: true })
  //   pricingPlan?: PricingPlan;

  //   @ManyToOne(() => PricingPlanPayment, { nullable: true })
  //   pricingPlanPayment?: PricingPlanPayment;

  // ===== Flags =====
  @Column({ default: false })
  isSuspended: boolean;

  @Column({ nullable: true })
  resetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetTokenExpires?: Date;

  // ===== Soft Delete & Timestamps =====
  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
