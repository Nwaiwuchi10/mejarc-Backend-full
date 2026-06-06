import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BankAccount,
  BankAccountStatus,
} from '../entities/bank-account.entity';
import { Agent } from '../../agent/entities/agent.entity';
import { PaystackService } from './paystack.service';
import {
  RegisterBankAccountDto,
  VerifyBankAccountDto,
} from '../dto/bank-account.dto';

@Injectable()
export class BankAccountService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankAccountRepository: Repository<BankAccount>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly paystackService: PaystackService,
  ) {}

  private async getAgentIdByUserId(userId: string): Promise<string> {
    const agent = await this.agentRepository.findOne({
      where: { userId },
    });
    if (!agent) {
      throw new NotFoundException('Agent profile not found for this user');
    }
    return agent.id;
  }

  /**
   * Register a new bank account for a vendor
   * Initial status is PENDING until verification
   */
  async registerBankAccount(
    agentId: string,
    registerDto: RegisterBankAccountDto,
  ): Promise<BankAccount> {
    // Validate agent exists
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Check if account already registered
    const existingAccount = await this.bankAccountRepository.findOne({
      where: {
        agentId,
        accountNumber: registerDto.accountNumber,
        bankCode: registerDto.bankCode,
      },
    });

    if (
      existingAccount &&
      existingAccount.status === BankAccountStatus.VERIFIED
    ) {
      throw new ConflictException(
        'This bank account is already verified for your account',
      );
    }

    // Create new bank account record
    const bankAccount = this.bankAccountRepository.create({
      agentId,
      accountHolderName: registerDto.accountHolderName.trim(),
      accountNumber: registerDto.accountNumber.trim(),
      bankCode: registerDto.bankCode.trim(),
      bankName: registerDto.bankName.trim(),
      status: BankAccountStatus.PENDING,
      isDefault: true, // First account is default
    });

    try {
      return await this.bankAccountRepository.save(bankAccount);
    } catch (error) {
      throw new InternalServerErrorException('Failed to register bank account');
    }
  }

  /**
   * Verify bank account with Paystack and create transfer recipient
   * This is the critical step before allowing withdrawals
   */
  async verifyBankAccount(
    agentId: string,
    bankAccountId: string,
    verifyDto: VerifyBankAccountDto,
  ): Promise<BankAccount> {
    // Get bank account
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { id: bankAccountId, agentId },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.status === BankAccountStatus.VERIFIED) {
      throw new ConflictException('This bank account is already verified');
    }

    try {
      // Step 1: Verify account with Paystack
      const verificationResult = await this.paystackService.verifyBankAccount(
        verifyDto.accountNumber,
        verifyDto.bankCode,
      );

      // Step 2: Create transfer recipient for automated transfers
      const recipientResult =
        await this.paystackService.createTransferRecipient({
          name: bankAccount.accountHolderName,
          accountNumber: verifyDto.accountNumber,
          bankCode: verifyDto.bankCode,
        });

      // Step 3: Update bank account with verification details
      bankAccount.status = BankAccountStatus.VERIFIED;
      bankAccount.resolvedAccountName = verificationResult.accountName;
      bankAccount.paystackRecipientCode = recipientResult.recipientCode;
      bankAccount.verifiedAt = new Date();

      return await this.bankAccountRepository.save(bankAccount);
    } catch (error: any) {
      // If Paystack verification fails, update status to rejected
      bankAccount.status = BankAccountStatus.REJECTED;
      bankAccount.rejectionReason = error.message;
      bankAccount.rejectedAt = new Date();
      await this.bankAccountRepository.save(bankAccount);

      throw new BadRequestException(
        `Bank account verification failed: ${error.message}`,
      );
    }
  }

  /**
   * Get all bank accounts for an agent
   */
  async getBankAccounts(agentId: string): Promise<BankAccount[]> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
    });
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return this.bankAccountRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get default bank account for withdrawals
   */
  async getDefaultBankAccount(agentId: string): Promise<BankAccount | null> {
    const account = await this.bankAccountRepository.findOne({
      where: {
        agentId,
        isDefault: true,
        status: BankAccountStatus.VERIFIED,
      },
    });

    return account || null;
  }

  /**
   * Set a bank account as default
   * Only verified accounts can be default
   */
  async setDefaultBankAccount(
    agentId: string,
    bankAccountId: string,
  ): Promise<BankAccount> {
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { id: bankAccountId, agentId },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.status !== BankAccountStatus.VERIFIED) {
      throw new BadRequestException(
        'Only verified accounts can be set as default',
      );
    }

    // Remove default from all other accounts
    await this.bankAccountRepository.update(
      { agentId, isDefault: true },
      { isDefault: false },
    );

    // Set this account as default
    bankAccount.isDefault = true;
    return await this.bankAccountRepository.save(bankAccount);
  }

  /**
   * Delete a bank account (soft delete by marking as rejected)
   */
  async deleteBankAccount(
    agentId: string,
    bankAccountId: string,
  ): Promise<void> {
    const bankAccount = await this.bankAccountRepository.findOne({
      where: { id: bankAccountId, agentId },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    // Don't allow deletion of default accounts
    if (bankAccount.isDefault) {
      throw new BadRequestException(
        'Cannot delete default bank account. Set another account as default first.',
      );
    }

    // Mark as rejected instead of deleting (audit trail)
    bankAccount.status = BankAccountStatus.REJECTED;
    bankAccount.rejectionReason = 'Deleted by user';
    bankAccount.rejectedAt = new Date();
    await this.bankAccountRepository.save(bankAccount);
  }

  /**
   * Get recipient code for verified bank account
   * Used when initiating transfers
   */
  async getRecipientCode(agentId: string): Promise<string> {
    const bankAccount = await this.getDefaultBankAccount(agentId);

    if (!bankAccount || !bankAccount.paystackRecipientCode) {
      throw new BadRequestException(
        'No verified bank account found. Please verify your bank account first.',
      );
    }

    return bankAccount.paystackRecipientCode;
  }

  /**
   * Get verified account details for display in withdrawal modal
   */
  async getAccountDetailsForWithdrawal(agentId: string): Promise<{
    accountNumber: string;
    bankName: string;
    accountHolderName: string;
    resolvedName: string;
  }> {
    const bankAccount = await this.getDefaultBankAccount(agentId);

    if (!bankAccount) {
      throw new BadRequestException(
        'No verified bank account found for withdrawals',
      );
    }

    return {
      accountNumber: bankAccount.accountNumber,
      bankName: bankAccount.bankName,
      accountHolderName: bankAccount.accountHolderName,
      resolvedName: bankAccount.resolvedAccountName || '',
    };
  }

  /**
   * Validate if agent can withdraw (has verified bank account)
   */
  async validateWithdrawalEligibility(agentId: string): Promise<boolean> {
    const bankAccount = await this.getDefaultBankAccount(agentId);
    return !!bankAccount;
  }

  // === Wrapper methods for Controller (using userId) ===

  async registerBankAccountByUserId(userId: string, registerDto: RegisterBankAccountDto): Promise<BankAccount> {
    const agentId = await this.getAgentIdByUserId(userId);
    return this.registerBankAccount(agentId, registerDto);
  }

  async verifyBankAccountByUserId(userId: string, bankAccountId: string, verifyDto: VerifyBankAccountDto): Promise<BankAccount> {
    const agentId = await this.getAgentIdByUserId(userId);
    return this.verifyBankAccount(agentId, bankAccountId, verifyDto);
  }

  async getBankAccountsByUserId(userId: string): Promise<BankAccount[]> {
    const agentId = await this.getAgentIdByUserId(userId);
    return this.getBankAccounts(agentId);
  }

  async setDefaultBankAccountByUserId(userId: string, bankAccountId: string): Promise<BankAccount> {
    const agentId = await this.getAgentIdByUserId(userId);
    return this.setDefaultBankAccount(agentId, bankAccountId);
  }

  async deleteBankAccountByUserId(userId: string, bankAccountId: string): Promise<void> {
    const agentId = await this.getAgentIdByUserId(userId);
    return this.deleteBankAccount(agentId, bankAccountId);
  }
}
