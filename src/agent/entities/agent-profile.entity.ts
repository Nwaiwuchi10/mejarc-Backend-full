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

  @Column({ nullable: true })
  preferredTitle?: string;

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
