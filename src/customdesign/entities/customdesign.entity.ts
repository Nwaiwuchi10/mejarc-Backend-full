/**
 * Custom Design Entity
 * Database model for storing custom design submissions
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Agent } from '../../agent/entities/agent.entity';
import {
  ServiceType,
  CustomDesignStatus,
  SelectionMethod,
} from '../customdesign.types';

@Entity('custom_designs')
export class CustomDesign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User who created the custom design
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Agent associated (if created through agent)
  @Column('uuid', { nullable: true })
  agentId?: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent?: Agent;

  // Step 1: Service Context
  @Column('enum', { enum: ServiceType })
  serviceType: ServiceType;

  @Column('varchar', { length: 255 })
  serviceContext: string;

  // Step 2: Project Type
  @Column('varchar', { length: 255 })
  projectType: string;

  // Step 3: Scope & Deliverables
  @Column('varchar', { length: 255 })
  scopeDeliverable: string;

  @Column('simple-array', { nullable: true })
  addons: string[];

  // Step 4: Size / Complexity
  @Column('varchar', { length: 255 })
  sizeComplexity: string;

  // Step 5: Style / Standards / Regulations
  @Column('varchar', { length: 255 })
  style: string;

  // Step 6: Budget & Timeline
  @Column('bigint')
  budget: number;

  @Column('varchar', { length: 255 })
  timeline: string;

  @Column('text', { nullable: true })
  additionalInformation?: string;

  // Attached files
  @Column('simple-array', { nullable: true })
  attachedFileIds: string[];

  // Selection method (manual, template, ai-advice)
  @Column('enum', { enum: SelectionMethod, default: SelectionMethod.MANUAL })
  selectionMethod: SelectionMethod;

  // Current step (for progress tracking)
  @Column('int', { default: 1 })
  currentStep: number;

  // Status tracking
  @Column('enum', {
    enum: CustomDesignStatus,
    default: CustomDesignStatus.IN_PROGRESS,
  })
  status: CustomDesignStatus;

  // Estimate information
  @Column('bigint', { nullable: true })
  estimateCost?: number;

  @Column('varchar', { length: 255, nullable: true })
  estimateTimeline?: string;

  @Column('varchar', { length: 500, nullable: true })
  estimateNotes?: string;

  // Completion tracking
  @Column('boolean', { default: false })
  isSubmitted: boolean;

  @Column('timestamp', { nullable: true })
  submittedAt?: Date;

  @Column('boolean', { default: false })
  isApproved: boolean;

  @Column('timestamp', { nullable: true })
  approvedAt?: Date;

  @Column('varchar', { length: 500, nullable: true })
  approvalNotes?: string;

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  deletedAt?: Date;
}
