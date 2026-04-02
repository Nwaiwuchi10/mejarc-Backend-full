import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentProfile } from './entities/agent-profile.entity';
import { AgentBio } from './entities/agent-bio.entity';
import { AgentKyc } from './entities/agent-kyc.entity';
import { User } from '../user/entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { MarketProduct } from '../marketproduct/entities/marketproduct.entity';
import { CustomDesign } from '../customdesign/entities/customdesign.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WithdrawalRequest } from '../wallet/entities/withdrawal-request.entity';
import { Notification } from '../notification/entities/notification.entity';
import { AgentAnalyticsService } from './agent-analytics.service';

import { MulterModule } from '@nestjs/platform-express';
import { UverifyKycProvider } from './provider/uverify.provider';
import { AgentMailService } from './service/mail.service';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MulterModule.register(),
    TypeOrmModule.forFeature([
      Agent,
      AgentProfile,
      AgentBio,
      AgentKyc,
      User,
      Admin,
      MarketProduct,
      CustomDesign,
      Wallet,
      WalletTransaction,
      WithdrawalRequest,
      Notification,
    ]),
    UserModule,
    NotificationModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, UverifyKycProvider, AgentMailService, AgentAnalyticsService],
  exports: [AgentService, AgentMailService, AgentAnalyticsService],
})
export class AgentModule {}
