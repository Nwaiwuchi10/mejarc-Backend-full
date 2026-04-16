import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CustomDesign } from './customdesign.entity';
import { User } from '../../user/entities/user.entity';
import { ActivityType } from '../customdesign.types';

@Entity('project_activities')
export class ProjectActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customDesignId: string;

  @ManyToOne(() => CustomDesign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customDesignId' })
  customDesign: CustomDesign;

  @Column('uuid', { nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
