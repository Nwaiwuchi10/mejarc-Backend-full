import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddProjectDescDto {
  @IsOptional()
  @IsString()
  desc: string;

  @IsOptional()
  fileUrl: string;
}
