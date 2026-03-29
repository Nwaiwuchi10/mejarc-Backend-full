import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketproductService } from './marketproduct.service';
import { MarketproductController } from './marketproduct.controller';
import { MarketProduct } from './entities/marketproduct.entity';
import { Rating } from './entities/rating.entity';
import { Agent } from '../agent/entities/agent.entity';
import { AgentModule } from '../agent/agent.module';
import { MulterModule } from '@nestjs/platform-express';

import { MarketProductMailService } from './service/mail.service';

import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketProduct, Agent, Rating]),
    AgentModule,
    MulterModule.register(),
    NotificationModule,
  ],
  controllers: [MarketproductController],
  providers: [MarketproductService, MarketProductMailService],
  exports: [MarketproductService, MarketProductMailService],
})
export class MarketproductModule { }
