import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsEnum,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import {
  ProfessionalTitle,
  TITLES_REQUIRING_LICENSE,
} from '../entities/agent-profile.entity';

export class CreateAgentProfileDto {
  @IsNumber()
  @Min(0)
  @Max(70)
  yearsOfExperience: number;

  @IsEnum(ProfessionalTitle, {
    message: `preferredTitle must be one of: ${Object.values(ProfessionalTitle).join(', ')}`,
  })
  preferredTitle: ProfessionalTitle;

  /**
   * Required when preferredTitle is 'Architect' or 'Structural Engineer'.
   */
  @ValidateIf(
    (o) =>
      TITLES_REQUIRING_LICENSE.includes(o.preferredTitle as ProfessionalTitle),
  )
  @IsNotEmpty({ message: 'licenseNumber is required for your selected title' })
  @IsString()
  licenseNumber?: string;

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
