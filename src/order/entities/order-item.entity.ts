import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { MarketProduct } from '../../marketproduct/entities/marketproduct.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column('uuid')
  orderId: string;

  @ManyToOne(() => MarketProduct, { eager: true, nullable: true })
  @JoinColumn({ name: 'productId' })
  product: MarketProduct;

  @Column('uuid', { nullable: true })
  productId: string;

  @Column({ type: 'int', default: 1 })
  totalQuantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.0 })
  totalPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
