import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { BankAccount } from './entities/bank-account.entity';
import { WithdrawalAuditLog } from './entities/withdrawal-audit-log.entity';
import { AgentModule } from '../agent/agent.module';
import { UserModule } from '../user/user.module';
import { User } from 'src/user/entities/user.entity';
import { Agent } from 'src/agent/entities/agent.entity';
import { Admin } from '../admin/entities/admin.entity';
import { NotificationModule } from '../notification/notification.module';
import { AdminModule } from '../admin/admin.module';
import { PaystackService } from './services/paystack.service';
import { BankAccountService } from './services/bank-account.service';
import { AuditLogService } from './services/audit-log.service';
import { WithdrawalQueueService } from './services/withdrawal-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      WalletTransaction,
      WithdrawalRequest,
      BankAccount,
      WithdrawalAuditLog,
      User,
      Agent,
      Admin,
    ]),
    UserModule,
    NotificationModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    PaystackService,
    BankAccountService,
    AuditLogService,
    WithdrawalQueueService,
  ],
  exports: [
    WalletService,
    PaystackService,
    BankAccountService,
    AuditLogService,
    WithdrawalQueueService,
  ],
})
export class WalletModule {}
