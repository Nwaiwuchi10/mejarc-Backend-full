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

@Entity('project_files')
export class ProjectFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customDesignId: string;

  @ManyToOne(() => CustomDesign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customDesignId' })
  customDesign: CustomDesign;

  @Column('uuid', { nullable: true })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fileType: string;

  @Column({ type: 'boolean', default: false })
  isDeliverable: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
