import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

export class CreateAgentProfileDto {
  @IsNumber()
  @Min(0)
  @Max(70)
  yearsOfExperience: number;

  @IsString()
  preferredTitle: string;

  @IsArray()
  @IsString({ each: true })
  specialization: string[];

  @IsString()
  @IsOptional()
  portfolioLink?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string; // Will be file URL after S3 upload

  @IsString()
  @IsOptional()
  phoneNumber?: string; // From previous signup
}
