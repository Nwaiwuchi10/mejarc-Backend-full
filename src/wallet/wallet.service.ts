import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction, TransactionType } from './entities/wallet-transaction.entity';
import { Agent } from '../agent/entities/agent.entity';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) { }

  async getOverview(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: ['wallet', 'wallet.transactions'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (!agent.wallet) {
      // Return empty state if wallet not implicitly created yet
      return {
        balance: 0,
        pendingClearance: 0,
        lifetimeEarnings: 0,
        transactions: [],
      };
    }

    // Sort transactions by date descending
    const sortedTransactions = agent.wallet.transactions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return {
      balance: agent.wallet.balance,
      pendingClearance: agent.wallet.pendingClearance,
      lifetimeEarnings: agent.wallet.lifetimeEarnings,
      transactions: sortedTransactions,
    };
  }

  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: ['wallet'],
    });

    if (!agent || !agent.wallet) {
      throw new NotFoundException('Agent or wallet not found');
    }

    const { amount } = withdrawDto;

    // Convert strings to number if necessary (decimal columns return as strings in pg/mysql often)
    const currentBalance = Number(agent.wallet.balance);
    const withdrawalAmount = Number(amount);

    if (currentBalance < withdrawalAmount) {
      throw new BadRequestException('Insufficient cleared funds for withdrawal.');
    }

    // Create a transaction record within a DB transaction to ensure integrity
    const queryRunner = this.walletRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduct balance
      agent.wallet.balance = currentBalance - withdrawalAmount;
      await queryRunner.manager.save(agent.wallet);

      // Create ledger entry
      const transaction = this.transactionRepository.create({
        type: TransactionType.DEBIT,
        amount: withdrawalAmount,
        balanceAfter: agent.wallet.balance,
        description: 'Withdrawal to Bank',
        wallet: agent.wallet,
      });

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return {
        message: 'Withdrawal successful',
        balance: agent.wallet.balance,
        transaction,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Withdrawal failed: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }
}
