import { IsString, IsOptional } from 'class-validator';

export class AgentKycUploadDto {
  @IsString()
  documentName: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
