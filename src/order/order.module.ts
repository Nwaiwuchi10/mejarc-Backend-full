import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { User } from '../user/entities/user.entity';
import { MarketProduct } from '../marketproduct/entities/marketproduct.entity';
import { Admin } from '../admin/entities/admin.entity';
import { PaystackService } from './paystack.service';
import { MailService } from './Services/mail.service';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';

import { OrderItem } from './entities/order-item.entity';

import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      User,
      MarketProduct,
      Admin,
      Wallet,
      WalletTransaction,
    ]),
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, MailService, PaystackService],
})
export class OrderModule { }
