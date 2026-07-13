import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('contact_inquiry')
export class ContactInquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  subject?: string;

  @Column('text')
  message: string;

  @CreateDateColumn()
  createdAt: Date;
}
