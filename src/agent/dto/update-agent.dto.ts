import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(70)
  yearsOfExperience?: number;

  @IsString()
  @IsOptional()
  preferredTitle?: string;

  @IsArray()
  @IsOptional()
  specialization?: string[];

  @IsString()
  @IsOptional()
  portfolioLink?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  idType?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  idDocument?: string;

  @IsString()
  @IsOptional()
  architectCert?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
