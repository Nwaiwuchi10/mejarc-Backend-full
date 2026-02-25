import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MarketproductService } from './marketproduct.service';
import { CreateMarketproductDto } from './dto/create-marketproduct.dto';
import { UpdateMarketproductDto } from './dto/update-marketproduct.dto';

@Controller('marketproduct')
export class MarketproductController {
  constructor(private readonly marketproductService: MarketproductService) {}

  @Post()
  create(@Body() createMarketproductDto: CreateMarketproductDto) {
    return this.marketproductService.create(createMarketproductDto);
  }

  @Get()
  findAll() {
    return this.marketproductService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketproductService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMarketproductDto: UpdateMarketproductDto) {
    return this.marketproductService.update(+id, updateMarketproductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marketproductService.remove(+id);
  }
}
