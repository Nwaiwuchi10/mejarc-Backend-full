import { Controller, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('approve-agent')
  async approveAgent(@Body() body: { agentId: string }) {
    return this.adminService.approveAgent(body.agentId);
  }

  @Post('reject-agent')
  async rejectAgent(@Body() body: { agentId: string; reason?: string }) {
    return this.adminService.rejectAgent(body.agentId, body.reason);
  }
}
