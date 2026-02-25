import { Injectable } from '@nestjs/common';
import { CreateMarketproductDto } from './dto/create-marketproduct.dto';
import { UpdateMarketproductDto } from './dto/update-marketproduct.dto';

@Injectable()
export class MarketproductService {
  create(createMarketproductDto: CreateMarketproductDto) {
    return 'This action adds a new marketproduct';
  }

  findAll() {
    return `This action returns all marketproduct`;
  }

  findOne(id: number) {
    return `This action returns a #${id} marketproduct`;
  }

  update(id: number, updateMarketproductDto: UpdateMarketproductDto) {
    return `This action updates a #${id} marketproduct`;
  }

  remove(id: number) {
    return `This action removes a #${id} marketproduct`;
  }
}
