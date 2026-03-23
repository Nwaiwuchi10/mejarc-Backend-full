import {
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsObject,
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDTO {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNumber()
  totalQuantity: number;

  @IsNumber()
  totalPrice: number;
}

class BillingInfoDTO {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  date?: Date;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  redirect_url: string;

  @IsOptional()
  projectDsc: string;

  // @IsArray()
  //   @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => OrderItemDTO)
  orderItems: OrderItemDTO[];

  @IsOptional()
  @IsNumber()
  amountPaid?: number



  @IsOptional()
  @IsString()
  email?: string;
  @IsObject()
  @ValidateNested()
  @Type(() => BillingInfoDTO)
  billingInfo: BillingInfoDTO;
}
