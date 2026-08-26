import { PartialType } from '@nestjs/swagger';
import { CreateMarketproductDto } from './create-marketproduct.dto';

export class UpdateMarketproductDto extends PartialType(
  CreateMarketproductDto,
) {}
