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
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      User,
      MarketProduct,
      Admin,
      WalletTransaction,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, MailService, PaystackService],
})
export class OrderModule { }
