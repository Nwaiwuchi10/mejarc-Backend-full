import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  street?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  zipcode?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  county?: string;

  @Column({ nullable: true })
  country?: string;
}
