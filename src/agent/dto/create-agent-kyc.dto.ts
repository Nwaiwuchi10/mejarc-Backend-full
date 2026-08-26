import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateAgentKycDto {
  @IsString()
  @IsNotEmpty()
  idType: string; // NIN, Passport, DriversLicense, VotersCard

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsString()
  @IsOptional()
  idDocument?: string; // File URL after S3 upload

  @IsString()
  @IsOptional()
  architectCert?: string; // File URL after S3 upload

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountHolderName: string;
}
