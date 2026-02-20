import { IsString, IsOptional } from 'class-validator';

export class SubmitAgentRegistrationDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
