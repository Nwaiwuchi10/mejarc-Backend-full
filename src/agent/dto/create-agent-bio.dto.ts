import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateAgentBioDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  bio: string;
}
