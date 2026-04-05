import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Agent } from './entities/agent.entity';
import { AgentProfile } from './entities/agent-profile.entity';
import { CustomDesign } from '../customdesign/entities/customdesign.entity';
import { CustomDesignStatus } from '../customdesign/customdesign.types';
import { Wallet } from '../wallet/entities/wallet.entity';
import { WalletTransaction, TransactionType, TransactionCategory } from '../wallet/entities/wallet-transaction.entity';
import { WithdrawalRequest, WithdrawalStatus } from '../wallet/entities/withdrawal-request.entity';
import { Notification } from '../notification/entities/notification.entity';

@Injectable()
export class AgentAnalyticsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(CustomDesign)
    private readonly customDesignRepository: Repository<CustomDesign>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) { }

  async getDashboardAnalytics(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
      relations: ['profile', 'wallet'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const agentId = agent.id;

    // 1. Active Projects & Pending Tasks
    const allProjects = await this.customDesignRepository.find({
      where: { agentId },
    });

    const activeProjects = allProjects.filter(p => 
      [CustomDesignStatus.UNDER_REVIEW, CustomDesignStatus.APPROVED].includes(p.status)
    ).length;

    const pendingTasks = allProjects.filter(p => 
      p.status === CustomDesignStatus.SUBMITTED
    ).length;

    // 2. Project Status Distribution
    const projectStatusDistribution = {
      inProgress: allProjects.filter(p => p.status === CustomDesignStatus.APPROVED).length, // mapping 'approved' as in-progress for the UI
      revisionsNeeded: allProjects.filter(p => p.status === CustomDesignStatus.UNDER_REVIEW).length,
      completed: allProjects.filter(p => p.status === CustomDesignStatus.COMPLETED).length,
      cancelled: allProjects.filter(p => p.status === CustomDesignStatus.REJECTED).length,
    };

    // 3. Earnings & Payout
    const earnings = agent.wallet ? Number(agent.wallet.lifetimeEarnings) : 0;
    
    const approvedWithdrawals = await this.withdrawalRepository.find({
      where: { agentId, status: WithdrawalStatus.APPROVED },
    });
    const totalPayout = approvedWithdrawals.reduce((sum, req) => sum + Number(req.amount), 0);

    // 4. Portfolio Engagement
    const engagement = {
      views: agent.profile?.viewsCount || 0,
      saves: agent.profile?.savesCount || 0,
      inquiries: agent.profile?.inquiriesCount || 0,
      viewsPreviousWeek: Math.floor((agent.profile?.viewsCount || 0) * 0.8), // Mock comparison data
    };

    // 5. Revenue Chart (Last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const credits = await this.transactionRepository.find({
      where: {
        wallet: { agent: { id: agentId } },
        type: TransactionType.CREDIT,
        createdAt: Between(sixMonthsAgo, now),
      },
    });

    const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const total = credits
        .filter(c => c.createdAt.getMonth() === date.getMonth() && c.createdAt.getFullYear() === date.getFullYear())
        .reduce((sum, c) => sum + Number(c.amount), 0);
      return { month: monthName, revenue: total };
    }).reverse();

    // 6. Recent Notifications
    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      overview: {
        activeProjects,
        pendingTasks,
        totalEarnings: earnings,
        payoutStatus: totalPayout,
      },
      portfolioEngagement: engagement,
      revenueChart: monthlyRevenue,
      projectStatus: projectStatusDistribution,
      notifications,
      projectEngagement: {
        totalViews: engagement.views,
        totalSaves: engagement.saves,
        totalInquiries: engagement.inquiries,
      }
    };
  }

  async getProjectCounts(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const agentId = agent.id;

    const allProjects = await this.customDesignRepository.find({
      where: { agentId },
    });

    return {
      totalNewProjects: allProjects.filter(p => p.status === CustomDesignStatus.SUBMITTED).length,
      totalInProgressProjects: allProjects.filter(p => p.status === CustomDesignStatus.APPROVED).length,
      totalRevisionProjects: allProjects.filter(p => p.status === CustomDesignStatus.REVISION).length,
      totalCompletedProjects: allProjects.filter(p => p.status === CustomDesignStatus.COMPLETED).length,
    };
  }

  async getProjectsByCategory(userId: string) {
    const agent = await this.agentRepository.findOne({
      where: { userId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const agentId = agent.id;

    const allProjects = await this.customDesignRepository.find({
      where: { agentId },
      relations: ['user', 'agent', 'agent.user', 'payment'],
      order: { createdAt: 'DESC' },
    });

    return {
      newProjects: allProjects.filter(p => p.status === CustomDesignStatus.SUBMITTED),
      inProgressProjects: allProjects.filter(p => p.status === CustomDesignStatus.APPROVED),
      revisionProjects: allProjects.filter(p => p.status === CustomDesignStatus.REVISION),
      completedProjects: allProjects.filter(p => p.status === CustomDesignStatus.COMPLETED),
    };
  }
}
