import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// ─── Shared Query ────────────────────────────────────────────────────────────

export class AdminPaginatedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  tab?: string;

  @IsOptional()
  @IsString()
  userType?: string;

  @IsOptional()
  isApproved?: any;

  @IsOptional()
  @IsString()
  role?: string;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export class UpdateUserStatusDto {
  @IsString()
  @IsNotEmpty()
  reason?: string;
}

// ─── Communication / Messages ────────────────────────────────────────────────

export class AdminSendMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];
}

export class AdminEscalateConversationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// ─── Financials ───────────────────────────────────────────────────────────────

export class ResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @IsOptional()
  @IsString()
  refundTo?: 'customer' | 'agent';
}

export class ApproveRefundDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReleasePayoutDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export class AdminMarketActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminRequestChangeDto {
  @IsString()
  @IsNotEmpty()
  feedback: string;
}

// ─── Project Oversight ────────────────────────────────────────────────────────

export class AssignAgentDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

export class AdminProjectActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsOptional()
  @IsString()
  permissions?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  permissions?: string;
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsNotEmpty()
  department?: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export class UpdateAdminProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profilePics?: string;
}

export class ChangeAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
