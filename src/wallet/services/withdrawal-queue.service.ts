import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from '../entities/withdrawal-request.entity';
import { PaystackService } from './paystack.service';
import { BankAccountService } from './bank-account.service';
import { AuditLogService } from './audit-log.service';
import { NotificationService } from '../../notification/notification.service';
import { AuditAction } from '../entities/withdrawal-audit-log.entity';
import { NotificationType } from '../../notification/entities/notification.entity';
import { Agent } from '../../agent/entities/agent.entity';

interface WithdrawalJob {
  withdrawalId: string;
  agentId: string;
  amount: number;
}

/**
 * Service to process withdrawal jobs from BullMQ queue
 * Handles Paystack transfer initiation and error handling
 * with automatic retry logic
 */
@Injectable()
export class WithdrawalQueueService {
  private readonly logger = new Logger(WithdrawalQueueService.name);

  constructor(
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly paystackService: PaystackService,
    private readonly bankAccountService: BankAccountService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process a withdrawal job
   * This is the main entry point for BullMQ worker
   */
  async processWithdrawal(job: WithdrawalJob): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: job.withdrawalId },
      relations: ['agent', 'agent.user', 'agent.wallet'],
    });

    if (!withdrawal) {
      throw new BadRequestException(`Withdrawal ${job.withdrawalId} not found`);
    }

    try {
      // Step 1: Validate withdrawal is approved
      if (withdrawal.status !== WithdrawalStatus.APPROVED) {
        throw new BadRequestException(
          `Withdrawal status is ${withdrawal.status}, cannot process`,
        );
      }

      // Step 2: Get recipient code from verified bank account
      const recipientCode = await this.bankAccountService.getRecipientCode(
        withdrawal.agentId,
      );

      // Step 3: Convert amount to Kobo for Paystack API
      const amountInKobo = this.paystackService.convertToKobo(
        Number(withdrawal.amount),
      );

      // Step 4: Update withdrawal status to PROCESSING
      withdrawal.status = WithdrawalStatus.PROCESSING;
      withdrawal.transferInitiatedAt = new Date();
      withdrawal.amountInKobo = amountInKobo;
      await this.withdrawalRepository.save(withdrawal);

      // Log: Transfer Initiated
      await this.auditLogService.logAction(AuditAction.TRANSFER_INITIATED, {
        withdrawalId: withdrawal.id,
        agentId: withdrawal.agentId,
        amount: withdrawal.amount,
        description: `Paystack transfer initiated for ₦${withdrawal.amount}`,
        metadata: {
          amountInKobo,
          recipientCode,
        },
      });

      // Step 5: Initiate transfer with Paystack
      let transferResult;
      try {
        transferResult = await this.paystackService.initiateTransfer(
          recipientCode,
          amountInKobo,
          `Vendor Withdrawal - ${withdrawal.id}`,
        );
      } catch (paystackError: any) {
        return this.handleTransferFailure(withdrawal, paystackError.message);
      }

      // Step 6: Store Paystack reference
      withdrawal.paystackReference = transferResult.reference;
      withdrawal.paystackTransferCode = transferResult.transferCode;
      await this.withdrawalRepository.save(withdrawal);

      this.logger.log(
        `Withdrawal ${withdrawal.id} transfer initiated: ${transferResult.reference}`,
      );

      // Step 7: Send notification to agent
      if (withdrawal.agent?.user) {
        await this.notificationService.createNotification(
          withdrawal.agent.user.id,
          NotificationType.WITHDRAWAL,
          'Withdrawal Processing',
          `Your withdrawal of ₦${withdrawal.amount} is being processed. Reference: ${transferResult.reference}`,
          {
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            reference: transferResult.reference,
          },
          'paymentPending',
        );
      }

      return {
        success: true,
        message: 'Withdrawal transfer initiated successfully',
        data: {
          withdrawalId: withdrawal.id,
          reference: transferResult.reference,
          transferCode: transferResult.transferCode,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Error processing withdrawal ${job.withdrawalId}: ${error.message}`,
        error.stack,
      );
      return this.handleTransferFailure(
        withdrawal,
        error.message || 'Unknown error occurred',
      );
    }
  }

  /**
   * Handle failed transfer attempts with retry logic
   */
  private async handleTransferFailure(
    withdrawal: WithdrawalRequest,
    errorMessage: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    withdrawal.lastErrorMessage = errorMessage;
    withdrawal.retryCount += 1;

    if (withdrawal.retryCount >= withdrawal.maxRetries) {
      // Final failure - mark as failed and refund
      withdrawal.status = WithdrawalStatus.FAILED;
      withdrawal.transferCompletedAt = new Date();
      await this.withdrawalRepository.save(withdrawal);

      // Refund money back to wallet
      await this.refundWithdrawal(withdrawal);

      // Log: Transfer Failed
      await this.auditLogService.logAction(AuditAction.TRANSFER_FAILED, {
        withdrawalId: withdrawal.id,
        agentId: withdrawal.agentId,
        amount: withdrawal.amount,
        description: `Transfer failed after ${withdrawal.retryCount} attempts: ${errorMessage}`,
      });

      // Notify agent
      if (withdrawal.agent?.user) {
        await this.notificationService.createNotification(
          withdrawal.agent.user.id,
          NotificationType.WITHDRAWAL,
          'Withdrawal Failed',
          `Your withdrawal of ₦${withdrawal.amount} failed. Funds have been refunded. Error: ${errorMessage}`,
          { withdrawalId: withdrawal.id, amount: withdrawal.amount },
          'paymentFailed',
        );
      }

      return {
        success: false,
        message: `Transfer failed after ${withdrawal.retryCount} attempts: ${errorMessage}`,
      };
    } else {
      // Retry - set status back to APPROVED so it can be picked up by next retry attempt or cron
      withdrawal.status = WithdrawalStatus.APPROVED;
      await this.withdrawalRepository.save(withdrawal);

      // Log: Retry attempt
      await this.auditLogService.logAction(AuditAction.TRANSFER_FAILED, {
        withdrawalId: withdrawal.id,
        agentId: withdrawal.agentId,
        amount: withdrawal.amount,
        description: `Transfer attempt ${withdrawal.retryCount} failed. Will retry. Error: ${errorMessage}`,
      });

      return {
        success: false,
        message: `Transfer attempt ${withdrawal.retryCount} failed. Will retry later: ${errorMessage}`,
      };
    }
  }

  /**
   * Refund withdrawal amount back to wallet
   */
  private async refundWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    const agent = await this.agentRepository.findOne({
      where: { id: withdrawal.agentId },
      relations: ['wallet'],
    });

    if (!agent?.wallet) {
      this.logger.error(
        `Cannot refund - agent or wallet not found for ${withdrawal.agentId}`,
      );
      return;
    }

    const refundAmount = Number(withdrawal.amount);
    agent.wallet.balance = Number(agent.wallet.balance) + refundAmount;

    await this.agentRepository.manager.save(agent.wallet);

    this.logger.log(
      `Refunded ₦${refundAmount} to agent ${withdrawal.agentId} wallet`,
    );
  }

  /**
   * Handle Paystack webhook callback for transfer status updates
   */
  async handlePaystackWebhookCallback(webhookData: {
    event: string;
    data: any;
  }): Promise<void> {
    const { event, data } = webhookData;

    if (!event?.startsWith('transfer')) {
      return;
    }

    const transferCode = data?.transfer_code;
    const reference = data?.reference;

    if (!transferCode && !reference) {
      this.logger.warn('Webhook received without transfer code or reference');
      return;
    }

    // Find withdrawal by Paystack reference
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { paystackTransferCode: transferCode },
      relations: ['agent', 'agent.user', 'agent.wallet'],
    });

    if (!withdrawal) {
      this.logger.warn(
        `Withdrawal not found for transfer code: ${transferCode}`,
      );
      return;
    }

    if (event === 'transfer.success') {
      await this.handleTransferSuccess(withdrawal);
    } else if (event === 'transfer.failed') {
      await this.handleTransferFailed(withdrawal, data?.reason);
    } else if (event === 'transfer.reversed') {
      await this.handleTransferReversed(withdrawal);
    }
  }

  /**
   * Handle successful transfer
   */
  private async handleTransferSuccess(
    withdrawal: WithdrawalRequest,
  ): Promise<void> {
    withdrawal.status = WithdrawalStatus.TRANSFERRED;
    withdrawal.transferCompletedAt = new Date();
    await this.withdrawalRepository.save(withdrawal);

    // Log: Transfer Success
    await this.auditLogService.logAction(AuditAction.TRANSFER_SUCCESS, {
      withdrawalId: withdrawal.id,
      agentId: withdrawal.agentId,
      amount: withdrawal.amount,
      paystackTransferCode: withdrawal.paystackTransferCode,
      paystackReference: withdrawal.paystackReference,
      description: `Transfer successful: ₦${withdrawal.amount} transferred to vendor account`,
    });

    // Notify agent
    if (withdrawal.agent?.user) {
      await this.notificationService.createNotification(
        withdrawal.agent.user.id,
        NotificationType.WITHDRAWAL,
        'Withdrawal Successful',
        `Your withdrawal of ₦${withdrawal.amount} has been successfully transferred to your account.`,
        { withdrawalId: withdrawal.id, amount: withdrawal.amount },
        'paymentSuccessful',
      );
    }

    this.logger.log(`Withdrawal ${withdrawal.id} completed successfully`);
  }

  /**
   * Handle failed transfer
   */
  private async handleTransferFailed(
    withdrawal: WithdrawalRequest,
    reason?: string,
  ): Promise<void> {
    withdrawal.status = WithdrawalStatus.FAILED;
    withdrawal.transferCompletedAt = new Date();
    withdrawal.lastErrorMessage = reason || 'Transfer failed';
    await this.withdrawalRepository.save(withdrawal);

    // Refund amount
    await this.refundWithdrawal(withdrawal);

    // Log: Transfer Failed
    await this.auditLogService.logAction(AuditAction.TRANSFER_FAILED, {
      withdrawalId: withdrawal.id,
      agentId: withdrawal.agentId,
      amount: withdrawal.amount,
      paystackTransferCode: withdrawal.paystackTransferCode,
      description: `Transfer failed via webhook: ${reason}. Funds refunded.`,
    });

    // Notify agent
    if (withdrawal.agent?.user) {
      await this.notificationService.createNotification(
        withdrawal.agent.user.id,
        NotificationType.WITHDRAWAL,
        'Withdrawal Failed',
        `Your withdrawal of ₦${withdrawal.amount} failed. Funds have been refunded. Reason: ${reason}`,
        { withdrawalId: withdrawal.id, amount: withdrawal.amount },
        'paymentFailed',
      );
    }

    this.logger.warn(`Withdrawal ${withdrawal.id} failed: ${reason}`);
  }

  /**
   * Handle reversed transfer
   */
  private async handleTransferReversed(
    withdrawal: WithdrawalRequest,
  ): Promise<void> {
    withdrawal.status = WithdrawalStatus.REVERSED;
    withdrawal.transferCompletedAt = new Date();
    await this.withdrawalRepository.save(withdrawal);

    // Refund amount
    await this.refundWithdrawal(withdrawal);

    // Log: Transfer Reversed
    await this.auditLogService.logAction(AuditAction.TRANSFER_REVERSED, {
      withdrawalId: withdrawal.id,
      agentId: withdrawal.agentId,
      amount: withdrawal.amount,
      paystackTransferCode: withdrawal.paystackTransferCode,
      description: `Transfer reversed. Funds refunded to wallet.`,
    });

    // Notify agent
    if (withdrawal.agent?.user) {
      await this.notificationService.createNotification(
        withdrawal.agent.user.id,
        NotificationType.WITHDRAWAL,
        'Withdrawal Reversed',
        `Your withdrawal of ₦${withdrawal.amount} was reversed by the bank. Funds have been refunded to your wallet.`,
        { withdrawalId: withdrawal.id, amount: withdrawal.amount },
        'paymentReversed',
      );
    }

    this.logger.log(`Withdrawal ${withdrawal.id} reversed`);
  }

  /**
   * Retry failed withdrawals
   * Called periodically to attempt retries
   */
  async retryFailedWithdrawals(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const failedWithdrawals = await this.withdrawalRepository.find({
      where: { status: WithdrawalStatus.APPROVED, autoProcess: true },
      relations: ['agent'],
    });

    let successful = 0;
    let failed = 0;

    for (const withdrawal of failedWithdrawals) {
      try {
        const result = await this.processWithdrawal({
          withdrawalId: withdrawal.id,
          agentId: withdrawal.agentId,
          amount: Number(withdrawal.amount),
        });

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error: any) {
        this.logger.error(
          `Failed to retry withdrawal ${withdrawal.id}:`,
          error.message,
        );
        failed++;
      }
    }

    this.logger.log(
      `Retry job completed: ${successful} successful, ${failed} failed out of ${failedWithdrawals.length}`,
    );

    return {
      processed: failedWithdrawals.length,
      successful,
      failed,
    };
  }
}
