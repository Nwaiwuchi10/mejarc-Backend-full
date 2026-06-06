import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

/**
 * DTO for bank account registration
 * Collects necessary information for Paystack verification
 */
export class RegisterBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  accountHolderName: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Account number must be 10 digits' })
  @Matches(/^\d+$/, { message: 'Account number must contain only digits' })
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 10)
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  bankName: string;
}

/**
 * DTO for verifying bank account with Paystack
 * Only accountNumber and bankCode are sent to Paystack API
 */
export class VerifyBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;
}

/**
 * Response DTO for successful bank account verification
 */
export class BankAccountVerifiedDto {
  id: string;
  agentId: string;
  accountHolderName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  paystackRecipientCode: string;
  status: 'Verified';
  resolvedAccountName: string;
  isDefault: boolean;
  createdAt: Date;
  verifiedAt: Date;
}

/**
 * DTO for retrieving bank accounts
 */
export class GetBankAccountDto {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  status: string;
  isDefault: boolean;
  createdAt: Date;
}

/**
 * DTO for updating default bank account
 */
export class SetDefaultBankAccountDto {
  @IsString()
  @IsNotEmpty()
  bankAccountId: string;
}
