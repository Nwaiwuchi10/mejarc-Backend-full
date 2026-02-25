import { PartialType } from '@nestjs/mapped-types';
import { CreateMarketproductDto } from './create-marketproduct.dto';

export class UpdateMarketproductDto extends PartialType(CreateMarketproductDto) {}
