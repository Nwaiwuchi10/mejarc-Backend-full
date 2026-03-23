/**
 * Custom Design DTOs
 * Data Transfer Objects for all custom design operations
 */

import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType, SelectionMethod } from '../customdesign.types';

/**
 * Step 1: Service Context DTO
 */
export class ServiceContextStepDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  serviceContext: string;
}

/**
 * Step 2: Project Type DTO
 */
export class ProjectTypeStepDto {
  @IsString()
  projectType: string;
}

/**
 * Step 3: Scope & Deliverables DTO
 */
export class ScopeDeliverableStepDto {
  @IsString()
  scopeDeliverable: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addons?: string[];
}

/**
 * Step 4: Size / Complexity DTO
 */
export class SizeComplexityStepDto {
  @IsString()
  sizeComplexity: string;
}

/**
 * Step 5: Style DTO
 */
export class StyleStepDto {
  @IsString()
  style: string;
}

/**
 * Step 6: Budget & Timeline DTO
 */
export class BudgetTimelineStepDto {
  @IsNumber()
  @Min(0)
  budget: number;

  @IsString()
  timeline: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachedFileIds?: string[];

  @IsString()
  @IsOptional()
  additionalInformation?: string;
}

/**
 * Complete Custom Design Submission DTO
 * Combines all steps into one submission
 */
export class CreateCustomDesignDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsEnum(SelectionMethod)
  selectionMethod: SelectionMethod;

  @ValidateNested()
  @Type(() => ServiceContextStepDto)
  serviceContext: ServiceContextStepDto;

  @ValidateNested()
  @Type(() => ProjectTypeStepDto)
  projectType: ProjectTypeStepDto;

  @ValidateNested()
  @Type(() => ScopeDeliverableStepDto)
  scopeDeliverable: ScopeDeliverableStepDto;

  @ValidateNested()
  @Type(() => SizeComplexityStepDto)
  sizeComplexity: SizeComplexityStepDto;

  @ValidateNested()
  @Type(() => StyleStepDto)
  style: StyleStepDto;

  @ValidateNested()
  @Type(() => BudgetTimelineStepDto)
  budgetTimeline: BudgetTimelineStepDto;
}

/**
 * Update Custom Design DTO
 * Allows updating a custom design submission
 */
export class UpdateCustomDesignDto {
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType;

  @IsString()
  @IsOptional()
  serviceContext?: string;

  @IsString()
  @IsOptional()
  projectType?: string;

  @IsString()
  @IsOptional()
  scopeDeliverable?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addons?: string[];

  @IsString()
  @IsOptional()
  sizeComplexity?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  budget?: number;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsString()
  @IsOptional()
  additionalInformation?: string;
}

/**
 * Update Single Step DTO
 * Generic DTO for updating individual steps
 */
export class UpdateCustomDesignStepDto {
  @IsNumber()
  step: number;

  @IsOptional()
  data: Record<string, any>;
}

/**
 * Attach Files DTO
 */
export class AttachFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  fileIds: string[];

  @IsString()
  @IsOptional()
  purpose?: string; // e.g., 'reference', 'specification', 'additional-info'
}

/**
 * Custom Design Response DTO
 */
export class CustomDesignResponseDto {
  id: string;
  userId: string;
  agentId?: string;
  serviceType: ServiceType;
  selectionMethod: SelectionMethod;
  serviceContext: string;
  projectType: string;
  scopeDeliverable: string;
  addons: string[];
  sizeComplexity: string;
  style: string;
  budget: number;
  timeline: string;
  additionalInformation?: string;
  attachedFiles: string[];
  currentStep: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  estimateCost?: number;
  estimateTimeline?: string;
}

/**
 * List Custom Designs Query DTO
 */
export class ListCustomDesignsQueryDto {
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number = 10;
}

/**
 * Validate Custom Design Step DTO
 */
export class ValidateCustomDesignStepDto {
  @IsNumber()
  step: number;

  @IsOptional()
  data: Record<string, any>;
}
