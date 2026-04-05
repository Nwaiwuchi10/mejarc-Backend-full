import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  @IsOptional()
  messagesAdmin?: boolean;

  @IsBoolean()
  @IsOptional()
  messagesAgent?: boolean;

  @IsBoolean()
  @IsOptional()
  projectFileUploaded?: boolean;

  @IsBoolean()
  @IsOptional()
  projectStatusChanged?: boolean;

  @IsBoolean()
  @IsOptional()
  projectRevisionUpdates?: boolean;

  @IsBoolean()
  @IsOptional()
  paymentSuccessful?: boolean;

  @IsBoolean()
  @IsOptional()
  paymentOrderConfirmation?: boolean;

  @IsBoolean()
  @IsOptional()
  reviewReminder?: boolean;

  @IsBoolean()
  @IsOptional()
  reviewResponse?: boolean;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;
}
