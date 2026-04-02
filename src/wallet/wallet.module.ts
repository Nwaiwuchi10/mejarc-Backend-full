import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { AgentModule } from '../agent/agent.module';
import { UserModule } from '../user/user.module';
import { User } from 'src/user/entities/user.entity';
import { Agent } from 'src/agent/entities/agent.entity';
import { Admin } from '../admin/entities/admin.entity';
import { NotificationModule } from '../notification/notification.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction, WithdrawalRequest, User, Agent, Admin]),
    // forwardRef(() => AgentModule),
    UserModule,
    NotificationModule,
    AdminModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule { }
