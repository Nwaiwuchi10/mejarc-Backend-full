/**
 * Custom Design DTOs
 * Flat Data Transfer Objects aligned with the frontend 6-step wizard state shape:
 *   { serviceContext, projectType, scopeDeliverables[], sizeComplexity,
 *     style, budget, timeline, attachedFiles[] }
 */

import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceType, SelectionMethod, CustomDesignStatus } from '../customdesign.types';

// ---------------------------------------------------------------------------
// Wizard: Initialize (Step 1 only)
// POST /custom-design/initialize
// ---------------------------------------------------------------------------

export class InitializeCustomDesignDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  serviceContext: string;

  @IsEnum(SelectionMethod)
  @IsOptional()
  selectionMethod?: SelectionMethod;
}

// ---------------------------------------------------------------------------
// Wizard: Save a single step mid-flow
// PATCH /custom-design/:id/step
// ---------------------------------------------------------------------------

export class SaveStepDto {
  @IsInt()
  @Min(1)
  @Max(6)
  step: number;

  // Free-form step data — validated server-side against service config
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// One-shot: Submit full design (all 6 steps at once)
// Frontend completes the wizard locally then POSTs everything at once.
// POST /custom-design  OR  POST /custom-design/:id/submit
// ---------------------------------------------------------------------------

export class SubmitCustomDesignDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  serviceContext: string;

  @IsString()
  @IsOptional()
  projectType?: string;

  /** Contains base package title AND any addon titles */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopeDeliverables?: string[];

  @IsString()
  @IsOptional()
  sizeComplexity?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  budget?: number;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsString()
  @IsOptional()
  additionalInformation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachedFiles?: string[];

  @IsEnum(SelectionMethod)
  @IsOptional()
  selectionMethod?: SelectionMethod;
}

// ---------------------------------------------------------------------------
// Update: Partial update of a draft
// PATCH /custom-design/:id
// ---------------------------------------------------------------------------

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopeDeliverables?: string[];

  @IsString()
  @IsOptional()
  sizeComplexity?: string;

  @IsString()
  @IsOptional()
  style?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  budget?: number;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsString()
  @IsOptional()
  additionalInformation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachedFiles?: string[];
}

// ---------------------------------------------------------------------------
// Query: List custom designs
// GET /custom-design/my  |  GET /custom-design/user/:id
// ---------------------------------------------------------------------------

export class ListCustomDesignsQueryDto {
  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType;

  @IsEnum(CustomDesignStatus)
  @IsOptional()
  status?: CustomDesignStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

// ---------------------------------------------------------------------------
// Admin: Approve / Reject
// ---------------------------------------------------------------------------

export class ReviewCustomDesignDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

// ---------------------------------------------------------------------------
// Response DTO
// ---------------------------------------------------------------------------

export class CustomDesignResponseDto {
  id: string;
  userId: string;
  agentId?: string;

  serviceType: ServiceType;
  selectionMethod: SelectionMethod;

  /** Step 1 */
  serviceContext: string;
  /** Step 2 */
  projectType?: string;
  /** Step 3 – base package + addons combined */
  scopeDeliverables: string[];
  /** Step 4 */
  sizeComplexity?: string;
  /** Step 5 */
  style?: string;
  /** Step 6 */
  budget?: number;
  timeline?: string;
  additionalInformation?: string;
  attachedFiles: string[];

  currentStep: number;
  status: CustomDesignStatus;
  isSubmitted: boolean;
  submittedAt?: Date;

  /** Server-computed estimate */
  estimateCost?: number;
  estimateTimeline?: string;
  estimateNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}
