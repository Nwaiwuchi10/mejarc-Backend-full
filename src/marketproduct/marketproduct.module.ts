import { Module } from '@nestjs/common';
import { MarketproductService } from './marketproduct.service';
import { MarketproductController } from './marketproduct.controller';

@Module({
  controllers: [MarketproductController],
  providers: [MarketproductService],
})
export class MarketproductModule {}
