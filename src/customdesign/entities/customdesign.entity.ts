/**
 * Custom Design Entity
 * Database model aligned with the 6-step frontend wizard flow
 *
 * Frontend state shape:
 *   { serviceContext, projectType, scopeDeliverables[], sizeComplexity,
 *     style, budget, timeline, attachedFiles[] }
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
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

  // ----- Ownership -----

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  agentId?: string;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent?: Agent;

  // ----- Step 1: Service Context -----

  @Column({ type: 'enum', enum: ServiceType })
  serviceType: ServiceType;

  @Column({ type: 'varchar', length: 255 })
  serviceContext: string;

  // ----- Step 2: Project Type -----

  @Column({ type: 'varchar', length: 255, nullable: true })
  projectType?: string;

  // ----- Step 3: Scope & Deliverables -----
  // Single array holding both the base package title AND any selected add-on
  // titles, matching the frontend's scopeDeliverables[] state field exactly.

  @Column({ type: 'simple-array', nullable: true })
  scopeDeliverables?: string[];

  // ----- Step 4: Size / Complexity -----

  @Column({ type: 'varchar', length: 255, nullable: true })
  sizeComplexity?: string;

  // ----- Step 5: Style / Standards / Regulations -----

  @Column({ type: 'varchar', length: 255, nullable: true })
  style?: string;

  // ----- Step 6: Budget & Timeline -----

  @Column({ type: 'bigint', nullable: true })
  budget?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  timeline?: string;

  @Column({ type: 'text', nullable: true })
  additionalInformation?: string;

  // ----- Attached Files (file URLs or IDs) -----

  @Column({ type: 'simple-array', nullable: true })
  attachedFiles?: string[];

  // ----- Meta -----

  @Column({ type: 'enum', enum: SelectionMethod, default: SelectionMethod.MANUAL })
  selectionMethod: SelectionMethod;

  /** Tracks the furthest step reached (1–6). */
  @Column({ type: 'int', default: 1 })
  currentStep: number;

  @Column({
    type: 'enum',
    enum: CustomDesignStatus,
    default: CustomDesignStatus.IN_PROGRESS,
  })
  status: CustomDesignStatus;

  // ----- Estimate (filled after submission/review) -----

  @Column({ type: 'bigint', nullable: true })
  estimateCost?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  estimateTimeline?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  estimateNotes?: string;

  // ----- Submission tracking -----

  @Column({ type: 'boolean', default: false })
  isSubmitted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  // ----- Admin review -----

  @Column({ type: 'varchar', length: 500, nullable: true })
  reviewNotes?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  // ----- Timestamps -----

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
