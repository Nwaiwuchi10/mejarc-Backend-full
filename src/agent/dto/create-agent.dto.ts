import { IsOptional, IsString } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  profilePics?: string;
}
