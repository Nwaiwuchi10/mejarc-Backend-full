import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { AgentService } from '../agent/agent.service';
import { AgentMailService } from 'src/agent/service/mail.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    private readonly agentService: AgentService,
    private readonly mailService: AgentMailService,
  ) {}

  async findAll() {
    return this.adminRepo.find();
  }

  async findOne(id: string) {
    return this.adminRepo.findOne({ where: { id } });
  }

  async create(admin: Partial<Admin>) {
    const ent = this.adminRepo.create(admin);
    return this.adminRepo.save(ent);
  }

  async approveAgent(agentId: string) {
    const agent = await this.agentService.findOne(agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    await this.agentService.update(agentId, {
      isApprovedByAdmin: true,
      kycStatus: 'VERIFIED',
    } as any);

    try {
      if (agent.user)
        await this.mailService.sendAgentApprovalNotification(
          agent.user as any,
          agent as any,
          true,
        );
    } catch (e) {}

    return { success: true };
  }

  async rejectAgent(agentId: string, reason?: string) {
    const agent = await this.agentService.findOne(agentId);
    if (!agent) throw new NotFoundException('Agent not found');
    await this.agentService.update(agentId, {
      isApprovedByAdmin: false,
      kycStatus: 'REJECTED',
    } as any);

    try {
      if (agent.user)
        await this.mailService.sendAgentApprovalNotification(
          agent.user as any,
          agent as any,
          false,
        );
    } catch (e) {}

    return { success: true };
  }
}
