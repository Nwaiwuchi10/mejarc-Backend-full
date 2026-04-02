/**
 * Custom Design Module
 * NestJS module for custom design resource
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomDesign } from './entities/customdesign.entity';
import { CustomDesignPayment } from './entities/custom-design-payment.entity';
import { CustomDesignService } from './customdesign.service';
import { CustomDesignController } from './customdesign.controller';
import { UserModule } from '../user/user.module';
import { AgentModule } from '../agent/agent.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { Admin } from '../admin/entities/admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomDesign, CustomDesignPayment, Admin]),
    UserModule,
    AgentModule,
    WalletModule,
    NotificationModule,
  ],
  controllers: [CustomDesignController],
  providers: [CustomDesignService],
  exports: [CustomDesignService],
})
export class CustomDesignModule {}
