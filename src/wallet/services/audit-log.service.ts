import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WithdrawalAuditLog,
  AuditAction,
} from '../entities/withdrawal-audit-log.entity';

/**
 * Comprehensive audit logging service for withdrawal operations
 * Maintains complete transaction trail for regulatory compliance
 */
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(WithdrawalAuditLog)
    private readonly auditLogRepository: Repository<WithdrawalAuditLog>,
  ) {}

  /**
   * Log a withdrawal action
   */
  async logAction(
    action: AuditAction,
    data: {
      agentId?: string;
      withdrawalId?: string;
      adminId?: string;
      amount?: number;
      description: string;
      paystackReference?: string;
      paystackTransferCode?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<WithdrawalAuditLog> {
    const auditLog = this.auditLogRepository.create({
      action,
      agentId: data.agentId,
      withdrawalId: data.withdrawalId,
      adminId: data.adminId,
      amount: data.amount,
      description: data.description,
      paystackReference: data.paystackReference,
      paystackTransferCode: data.paystackTransferCode,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Get audit logs for a withdrawal
   */
  async getWithdrawalAuditLogs(
    withdrawalId: string,
  ): Promise<WithdrawalAuditLog[]> {
    return this.auditLogRepository.find({
      where: { withdrawalId },
      order: { createdAt: 'ASC' },
      relations: ['agent', 'admin'],
    });
  }

  /**
   * Get audit logs for an agent
   */
  async getAgentAuditLogs(
    agentId: string,
    limit: number = 100,
  ): Promise<WithdrawalAuditLog[]> {
    return this.auditLogRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['withdrawal'],
    });
  }

  /**
   * Get all audit logs (admin only)
   */
  async getAllAuditLogs(
    skip: number = 0,
    take: number = 100,
  ): Promise<{ data: WithdrawalAuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take,
      relations: ['agent', 'admin', 'withdrawal'],
    });

    return { data, total };
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(
    action: AuditAction,
    skip: number = 0,
    take: number = 100,
  ): Promise<WithdrawalAuditLog[]> {
    return this.auditLogRepository.find({
      where: { action },
      order: { createdAt: 'DESC' },
      skip,
      take,
      relations: ['agent', 'admin'],
    });
  }

  /**
   * Get logs for a date range (useful for reports)
   */
  async getLogsByDateRange(
    startDate: Date,
    endDate: Date,
    skip: number = 0,
    take: number = 100,
  ): Promise<{ data: WithdrawalAuditLog[]; total: number }> {
    const [data, total] = await this.auditLogRepository.findAndCount({
      where: {
        createdAt: {
          raw: `BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`,
        } as any,
      },
      order: { createdAt: 'DESC' },
      skip,
      take,
      relations: ['agent', 'admin'],
    });

    return { data, total };
  }
}
