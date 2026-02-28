import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

export enum ProfessionalTitle {
  ARCHITECT = 'Architect',
  STRUCTURAL_ENGINEER = 'Structural Engineer',
  MEP_ENGINEER = 'MEP Engineer',
  ARCHITECTURAL_DESIGNER = 'Architectural Designer',
  BIM_MODELLER = 'BIM Modeller',
  LANDSCAPE_ARCHITECT = 'Landscape Architect',
  PRODUCT_DESIGNER = 'Product Designer',
}

/** Titles that legally require a professional license number */
export const TITLES_REQUIRING_LICENSE: ProfessionalTitle[] = [
  ProfessionalTitle.ARCHITECT,
  ProfessionalTitle.STRUCTURAL_ENGINEER,
];

@Entity('agent_profiles')
export class AgentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Agent, (agent) => agent.profile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column('uuid')
  agentId: string;

  @Column({ type: 'int', nullable: true })
  yearsOfExperience?: number;

  @Column({
    type: 'enum',
    enum: ProfessionalTitle,
    nullable: true,
  })
  preferredTitle?: ProfessionalTitle;

  @Column({ nullable: true })
  licenseNumber?: string;

  @Column({ type: 'simple-array', nullable: true })
  specialization?: string[];

  @Column({ nullable: true })
  portfolioLink?: string;

  @Column({ nullable: true })
  profilePicture?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
