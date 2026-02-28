import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketproductService } from './marketproduct.service';
import { MarketproductController } from './marketproduct.controller';
import { MarketProduct } from './entities/marketproduct.entity';
import { Agent } from '../agent/entities/agent.entity';
import { AgentModule } from '../agent/agent.module';
import { MulterModule } from '@nestjs/platform-express';

import { MarketProductMailService } from './service/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketProduct, Agent]),
    AgentModule,
    MulterModule.register(),
  ],
  controllers: [MarketproductController],
  providers: [MarketproductService, MarketProductMailService],
  exports: [MarketproductService, MarketProductMailService],
})
export class MarketproductModule { }
