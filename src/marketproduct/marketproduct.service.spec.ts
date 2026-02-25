import { Test, TestingModule } from '@nestjs/testing';
import { MarketproductService } from './marketproduct.service';

describe('MarketproductService', () => {
  let service: MarketproductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketproductService],
    }).compile();

    service = module.get<MarketproductService>(MarketproductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
