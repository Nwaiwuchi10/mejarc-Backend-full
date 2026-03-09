import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
export class BillingInfoDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  // @IsPhoneNumber(null)
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export type PaystackCreateTransactionDto = {
  amount: number;
  email: string;
  callback_url?: string;
  metadata: PaystackMetadata;
};

class OrderItemsDto {
  @IsMongoId()
  eventId: string;

  @IsNumber()
  totalQuantity: number;

  @IsNumber()
  totalPrice: number;
}

export class CreateOrderItemsDto {
  @IsArray()
  orderItems: OrderItemsDto[];

  @IsOptional()
  @IsNumber()
  grandTotal?: number;
}

export type PaystackMetadata = {
  userId: string;
  OrderItems: CreateOrderItemsDto[];
  callback_url?: string;
  billingInfo: BillingInfoDto;
  custom_fields: PaystackMetadataCustomField[];
};

export type PaystackMetadataCustomField = {
  display_name: string;
  variable_name: string;
  value: string | number;
};

export type PaystackCreateTransactionResponseDto = {
  status: boolean;
  message: string;
  data: { authorization_url: string; access_code: string; reference: string };
};

export type PaystackVerifyTransactionResponseDto = {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
  };
};

export type PaystackWebhookDto = {
  event: string;
  data: Data;
};

export type Data = {
  id?: number;
  domain?: string;
  status?: string;
  reference?: string;
  amount?: number;

  gateway_response?: string;
  paid_at?: string;
  created_at?: string;
  channel?: string;
  currency?: string;
  ip_address?: string;
  metadata?: any;

  message?: any;
  fees: any;
  log: any;
  customer: any;
  authorization: any;
  plan: any;
};

export class PaystackCallbackDto {
  reference: string;
}

export enum PaymentStatus {
  paid = 'paid',
  notPaid = 'not paid',
}
