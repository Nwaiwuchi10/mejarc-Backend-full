import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { ConversationMember } from './conversation-member.entity';
import { Message } from './message.entity';


export enum ConversationType {
  DM = 'dm',
  GROUP = 'group',
  CUSTOMDESIGN = 'customdesign',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DM,
  })
  type: ConversationType;

  @Column({ nullable: true })
  customdesignId?: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  isArchived: boolean;

  @OneToMany(() => ConversationMember, (m) => m.conversation, { cascade: true })
  members: ConversationMember[];

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @ManyToOne(() => Message, { nullable: true, eager: true })
  lastMessage?: Message;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
