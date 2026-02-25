import { Test, TestingModule } from '@nestjs/testing';
import { MarketproductController } from './marketproduct.controller';
import { MarketproductService } from './marketproduct.service';

describe('MarketproductController', () => {
  let controller: MarketproductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketproductController],
      providers: [MarketproductService],
    }).compile();

    controller = module.get<MarketproductController>(MarketproductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
