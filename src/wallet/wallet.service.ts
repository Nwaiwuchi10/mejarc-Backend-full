import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import {
  WalletTransaction,
  TransactionType,
  TransactionCategory,
} from './entities/wallet-transaction.entity';
import {
  WithdrawalRequest,
  WithdrawalStatus,
} from './entities/withdrawal-request.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { Agent } from '../agent/entities/agent.entity';
import { WithdrawDto } from './dto/withdraw.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { Admin } from '../admin/entities/admin.entity';
import { WithdrawalQueueService } from './services/withdrawal-queue.service';
import { BankAccountService } from './services/bank-account.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly notificationService: NotificationService,
    private readonly withdrawalQueueService: WithdrawalQueueService,
    private readonly bankAccountService: BankAccountService,
  ) {}

  async getOverview(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: ['wallet', 'wallet.transactions'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.wallet) {
      return {
        balance: 0,
        pendingClearance: 0,
        lifetimeEarnings: 0,
        transactions: [],
        earningsBreakdown: { customDesign: 0, productSales: 0 },
      };
    }

    const sortedTransactions = agent.wallet.transactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const earningsBreakdown = {
      customDesign: 0,
      productSales: 0,
    };

    agent.wallet.transactions.forEach((tx) => {
      if (tx.type === TransactionType.CREDIT) {
        if (tx.category === TransactionCategory.CUSTOM_DESIGN) {
          earningsBreakdown.customDesign += Number(tx.amount);
        } else if (tx.category === TransactionCategory.PRODUCT_SALE) {
          earningsBreakdown.productSales += Number(tx.amount);
        }
      }
    });

    return {
      balance: agent.wallet.balance,
      pendingClearance: agent.wallet.pendingClearance,
      lifetimeEarnings: agent.wallet.lifetimeEarnings,
      transactions: sortedTransactions,
      earningsBreakdown,
    };
  }

  async getTransactions(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: ['wallet', 'wallet.transactions'],
    });

    if (!agent || !agent.wallet) {
      throw new NotFoundException('Agent or wallet not found');
    }

    return agent.wallet.transactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getMyWithdrawals(userId: string) {
    const agent = await this.agentRepository.findOne({ where: { userId } });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.withdrawalRepository.find({
      where: { agentId: agent.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getWithdrawalSettings() {
    let setting = await this.settingRepository.findOne({
      where: { key: 'WITHDRAWAL_SETTINGS' },
    });

    if (!setting) {
      setting = this.settingRepository.create({
        key: 'WITHDRAWAL_SETTINGS',
        value: {
          mode: 'AUTO', // 'AUTO' | 'MANUAL'
          autoApproveThreshold: 100000,
          minWithdrawalAmount: 1000,
          maxWithdrawalAmount: 5000000,
        },
        description: 'Vendor payment and withdrawal mode configuration',
      });
      await this.settingRepository.save(setting);
    } else if (setting.value && setting.value.maxWithdrawalAmount === undefined) {
      setting.value.maxWithdrawalAmount = 5000000;
      await this.settingRepository.save(setting);
    }

    return setting.value;
  }

  async updateWithdrawalSettings(dto: {
    mode?: 'AUTO' | 'MANUAL';
    autoApproveThreshold?: number;
    minWithdrawalAmount?: number;
    maxWithdrawalAmount?: number;
  }) {
    let setting = await this.settingRepository.findOne({
      where: { key: 'WITHDRAWAL_SETTINGS' },
    });

    const current = setting?.value || {
      mode: 'AUTO',
      autoApproveThreshold: 100000,
      minWithdrawalAmount: 1000,
      maxWithdrawalAmount: 5000000,
    };

    if (dto.mode && !['AUTO', 'MANUAL'].includes(dto.mode.toUpperCase())) {
      throw new BadRequestException('Mode must be either AUTO or MANUAL');
    }

    const updatedValue = {
      mode: dto.mode ? dto.mode.toUpperCase() : current.mode,
      autoApproveThreshold:
        dto.autoApproveThreshold !== undefined
          ? Number(dto.autoApproveThreshold)
          : current.autoApproveThreshold,
      minWithdrawalAmount:
        dto.minWithdrawalAmount !== undefined
          ? Number(dto.minWithdrawalAmount)
          : current.minWithdrawalAmount,
      maxWithdrawalAmount:
        dto.maxWithdrawalAmount !== undefined
          ? Number(dto.maxWithdrawalAmount)
          : (current.maxWithdrawalAmount || 5000000),
      updatedAt: new Date().toISOString(),
    };

    if (!setting) {
      setting = this.settingRepository.create({
        key: 'WITHDRAWAL_SETTINGS',
        value: updatedValue,
        description: 'Vendor payment and withdrawal mode configuration',
      });
    } else {
      setting.value = updatedValue;
    }

    await this.settingRepository.save(setting);
    return setting.value;
  }

  async getAllWithdrawals() {
    return this.withdrawalRepository.find({
      relations: ['agent', 'agent.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: ['wallet', 'user'],
    });

    if (!agent || !agent.wallet) {
      throw new NotFoundException('Agent or wallet not found');
    }

    const { amount, description, accountDetails } = withdrawDto;
    const currentBalance = Number(agent.wallet.balance);
    const withdrawalAmount = Number(amount);

    if (currentBalance < withdrawalAmount) {
      throw new BadRequestException(
        'Insufficient cleared funds for withdrawal.',
      );
    }

    // 0. Check withdrawal eligibility (has verified bank account)
    const verifiedAccount =
      await this.bankAccountService.getDefaultBankAccount(agent.id);
    if (!verifiedAccount) {
      throw new BadRequestException(
        'You must have a verified bank account to request a withdrawal.',
      );
    }

    // Use details from verified account to ensure accuracy
    const actualAccountDetails = `${verifiedAccount.accountHolderName} - ${verifiedAccount.accountNumber} - ${verifiedAccount.bankName}`;

    // Get current withdrawal mode & settings
    const settings = await this.getWithdrawalSettings();
    const isAutoMode = settings.mode === 'AUTO';
    const minAmount = settings.minWithdrawalAmount || 1000;
    const maxAmount = settings.maxWithdrawalAmount || 5000000;

    if (withdrawalAmount < minAmount) {
      throw new BadRequestException(
        `Minimum withdrawal amount is ₦${minAmount.toLocaleString()}`,
      );
    }

    if (withdrawalAmount > maxAmount) {
      throw new BadRequestException(
        `Maximum withdrawal amount per transaction is ₦${maxAmount.toLocaleString()}`,
      );
    }

    // Auto-approve logic: approve immediately if in AUTO mode AND amount <= threshold
    const shouldAutoApprove =
      isAutoMode &&
      withdrawalAmount <= (settings.autoApproveThreshold || 100000);

    const queryRunner =
      this.walletRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Deduct balance immediately
      agent.wallet.balance = currentBalance - withdrawalAmount;
      await queryRunner.manager.save(agent.wallet);

      // 2. Create Withdrawal Request
      const status = shouldAutoApprove
        ? WithdrawalStatus.APPROVED
        : WithdrawalStatus.PENDING;

      const withdrawalRequest = this.withdrawalRepository.create({
        amount: withdrawalAmount,
        status: status,
        description:
          description ||
          (isAutoMode ? 'Auto-Payout Withdrawal' : 'Manual Vendor Withdrawal'),
        accountDetails: actualAccountDetails,
        agent,
        autoProcess: isAutoMode,
      });
      const savedRequest = await queryRunner.manager.save(withdrawalRequest);

      // 3. Create ledger entry
      const transaction = this.transactionRepository.create({
        type: TransactionType.DEBIT,
        category: TransactionCategory.WITHDRAWAL,
        amount: withdrawalAmount,
        balanceAfter: agent.wallet.balance,
        description: `Withdrawal Request [${settings.mode}] - ${description || 'No description'}`,
        wallet: agent.wallet,
      });

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      // 4. Notify Admin
      const admins = await this.adminRepository.find({ relations: ['user'] });
      for (const admin of admins) {
        if (admin.user) {
          await this.notificationService.createNotification(
            admin.user.id,
            NotificationType.WITHDRAWAL,
            isAutoMode
              ? 'New Auto Withdrawal Request'
              : 'New Manual Withdrawal Request for Review',
            `Agent ${agent.user?.firstName || 'Unknown'} requested ₦${withdrawalAmount.toLocaleString()}. Mode: ${settings.mode}. Account: ${actualAccountDetails}`,
            {
              withdrawalId: savedRequest.id,
              amount: withdrawalAmount,
              mode: settings.mode,
            },
            'messagesAdmin',
          );
        }
      }

      // 5. If auto-approved, trigger the queue worker
      if (shouldAutoApprove) {
        this.withdrawalQueueService
          .processWithdrawal({
            withdrawalId: savedRequest.id,
            agentId: agent.id,
            amount: withdrawalAmount,
          })
          .catch((err) => {
            console.error(
              `Error initiating auto-withdrawal ${savedRequest.id}:`,
              err,
            );
          });
      }

      return {
        message: shouldAutoApprove
          ? 'Withdrawal processed successfully via Auto-Payout'
          : isAutoMode
          ? 'Withdrawal request submitted successfully for approval'
          : 'Withdrawal request submitted for Admin review and manual processing',
        mode: settings.mode,
        balance: agent.wallet.balance,
        withdrawalRequest: savedRequest,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Withdrawal failed: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async approveWithdrawal(id: string, adminNotes?: string, adminId?: string) {
    const request = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['agent', 'agent.user'],
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    if (request.autoProcess) {
      // Auto Mode: Admin approved above-threshold request to trigger Paystack queue
      request.status = WithdrawalStatus.APPROVED;
      request.adminNotes = adminNotes || 'Approved by Admin for automated processing';
      await this.withdrawalRepository.save(request);

      this.withdrawalQueueService
        .processWithdrawal({
          withdrawalId: request.id,
          agentId: request.agentId,
          amount: Number(request.amount),
        })
        .catch((err) => {
          console.error(`Error initiating auto-withdrawal ${request.id}:`, err);
        });
    } else {
      // Manual Mode: Admin vetted and completed payment manually
      request.status = WithdrawalStatus.TRANSFERRED;
      request.adminNotes = adminNotes || 'Vetted and paid manually by Admin';
      request.transferCompletedAt = new Date();
      await this.withdrawalRepository.save(request);
    }

    // Notify agent
    if (request.agent?.user) {
      const msg = request.autoProcess
        ? `Your withdrawal of ₦${Number(request.amount).toLocaleString()} has been approved and is being processed via auto-payout.`
        : `Your withdrawal of ₦${Number(request.amount).toLocaleString()} has been approved and paid to your bank account.`;

      await this.notificationService.createNotification(
        request.agent.user.id,
        NotificationType.WITHDRAWAL,
        'Withdrawal Approved',
        msg,
        { withdrawalId: request.id, amount: request.amount },
        'paymentSuccessful',
      );
    }

    return {
      message: request.autoProcess
        ? 'Withdrawal approved for automated Paystack transfer'
        : 'Manual withdrawal approved and marked as paid',
      processing: request.autoProcess,
      request,
    };
  }

  async rejectWithdrawal(id: string, reason: string, adminId?: string) {
    const request = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['agent', 'agent.wallet', 'agent.user'],
    });

    if (!request) throw new NotFoundException('Withdrawal request not found');
    if (request.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    if (!request.agent.wallet) {
      throw new BadRequestException('Agent wallet not found');
    }

    const queryRunner =
      this.withdrawalRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Reverse balance
      const wallet = request.agent.wallet;
      wallet.balance = Number(wallet.balance) + Number(request.amount);
      await queryRunner.manager.save(wallet);

      // 2. Update request status
      request.status = WithdrawalStatus.REJECTED;
      request.adminNotes = reason;
      await queryRunner.manager.save(request);

      // 3. Create ledger entry for reversal
      const transaction = this.transactionRepository.create({
        type: TransactionType.CREDIT,
        category: TransactionCategory.OTHER,
        amount: request.amount,
        balanceAfter: wallet.balance,
        description: `Withdrawal Rejected - Reversal: ${reason}`,
        wallet: wallet,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // 4. Notify agent
      if (request.agent?.user) {
        await this.notificationService.createNotification(
          request.agent.user.id,
          NotificationType.WITHDRAWAL,
          'Withdrawal Rejected',
          `Your withdrawal of ₦${request.amount} was rejected. Reason: ${reason}. Funds have been reversed.`,
          { withdrawalId: request.id, amount: request.amount },
          'paymentSuccessful',
        );
      }

      return { message: 'Withdrawal rejected and funds reversed', request };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Rejection failed: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }

  async getWithdrawalDetails(withdrawalId: string, userId: string) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
      relations: ['agent', 'agent.user'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    // Verify ownership
    if (withdrawal.agent?.user?.id !== userId) {
      throw new BadRequestException('Unauthorized access to this withdrawal');
    }

    return withdrawal;
  }

  async getFinancialSummary() {
    const withdrawals = await this.withdrawalRepository.find({
      relations: ['agent'],
    });

    const summary = {
      totalWithdrawals: withdrawals.length,
      totalAmount: 0,
      byStatus: {
        pending: 0,
        approved: 0,
        processing: 0,
        transferred: 0,
        rejected: 0,
        failed: 0,
      },
      byStatusAmount: {
        pending: 0,
        approved: 0,
        processing: 0,
        transferred: 0,
        rejected: 0,
        failed: 0,
      },
    };

    withdrawals.forEach((w) => {
      const amount = Number(w.amount);
      summary.totalAmount += amount;

      const status = w.status.toLowerCase().replace(/\s+/g, '');
      if (status in summary.byStatus) {
        summary.byStatus[status as keyof typeof summary.byStatus]++;
        summary.byStatusAmount[status as keyof typeof summary.byStatusAmount] +=
          amount;
      }
    });

    return summary;
  }

  async getFinancialReports(startDate: Date, endDate: Date) {
    const withdrawals = await this.withdrawalRepository.find({
      relations: ['agent', 'agent.user'],
      where: {
        createdAt: {
          raw: `BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`,
        } as any,
      },
      order: { createdAt: 'DESC' },
    });

    const vendorSummary: Record<
      string,
      {
        vendorName: string;
        vendorId: string;
        totalRequested: number;
        totalApproved: number;
        totalTransferred: number;
        totalRejected: number;
        requestCount: number;
        withdrawals: any[];
      }
    > = {};

    withdrawals.forEach((w) => {
      const vendorId = w.agentId;
      const vendorName = w.agent?.user?.firstName || 'Unknown';
      const amount = Number(w.amount);

      if (!vendorSummary[vendorId]) {
        vendorSummary[vendorId] = {
          vendorName,
          vendorId,
          totalRequested: 0,
          totalApproved: 0,
          totalTransferred: 0,
          totalRejected: 0,
          requestCount: 0,
          withdrawals: [],
        };
      }

      vendorSummary[vendorId].totalRequested += amount;
      vendorSummary[vendorId].requestCount++;

      if (w.status === WithdrawalStatus.APPROVED) {
        vendorSummary[vendorId].totalApproved += amount;
      } else if (w.status === WithdrawalStatus.TRANSFERRED) {
        vendorSummary[vendorId].totalTransferred += amount;
      } else if (w.status === WithdrawalStatus.REJECTED) {
        vendorSummary[vendorId].totalRejected += amount;
      }

      vendorSummary[vendorId].withdrawals.push({
        id: w.id,
        amount: w.amount,
        status: w.status,
        createdAt: w.createdAt,
        paystackReference: w.paystackReference,
        paystackTransferCode: w.paystackTransferCode,
      });
    });

    return {
      dateRange: { startDate, endDate },
      totalVendors: Object.keys(vendorSummary).length,
      totalWithdrawals: withdrawals.length,
      totalAmount: withdrawals.reduce((sum, w) => sum + Number(w.amount), 0),
      vendorSummary: Object.values(vendorSummary),
    };
  }

  async creditWallet(
    agentId: string,
    amount: number,
    description: string,
    category: TransactionCategory = TransactionCategory.OTHER,
  ) {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
      relations: ['wallet', 'user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    let wallet = agent.wallet;
    if (!wallet) {
      wallet = this.walletRepository.create({
        agent,
        balance: 0,
        pendingClearance: 0,
        lifetimeEarnings: 0,
      });
      await this.walletRepository.save(wallet);
    }

    const creditAmount = Number(amount);
    wallet.balance = Number(wallet.balance) + creditAmount;
    wallet.lifetimeEarnings = Number(wallet.lifetimeEarnings) + creditAmount;

    await this.walletRepository.save(wallet);

    const transaction = this.transactionRepository.create({
      type: TransactionType.CREDIT,
      category,
      amount: creditAmount,
      balanceAfter: wallet.balance,
      description,
      wallet,
    });

    await this.transactionRepository.save(transaction);

    if (agent.user) {
      await this.notificationService.createNotification(
        agent.user.id,
        NotificationType.WALLET,
        'Wallet Credited',
        `₦${creditAmount} has been credited to your wallet for: ${description}`,
        { amount: creditAmount },
        'paymentSuccessful',
      );
    }

    return {
      message: 'Wallet credited successfully',
      balance: wallet.balance,
      transaction,
    };
  }
}
