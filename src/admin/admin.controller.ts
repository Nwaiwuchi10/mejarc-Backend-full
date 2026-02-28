import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PaginationDto } from '../utils/pagination.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ══════════════════════════════════════════
  // MAKE USER AN ADMIN
  // POST /admin/make-admin
  // Body: { userId: string, role?: string }
  // ══════════════════════════════════════════
  @Post('make-admin')
  async makeAdmin(@Body() body: { userId: string; role?: string }) {
    return this.adminService.makeAdmin(body.userId, body.role);
  }

  // ══════════════════════════════════════════
  // ADMIN LOGIN — Step 1: Validate & send OTP
  // POST /admin/login
  // Body: { email: string, password: string }
  // ══════════════════════════════════════════
  @Post('login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    return this.adminService.adminLogin(body.email, body.password);
  }

  // ══════════════════════════════════════════
  // ADMIN LOGIN — Step 2: Verify OTP & return admin token
  // POST /admin/verify-login
  // Body: { email: string, token: string }
  // ══════════════════════════════════════════
  @Post('verify-login')
  async verifyAdminLogin(@Body() body: { email: string; token: string }) {
    return this.adminService.verifyAdminLogin(body.email, body.token);
  }

  // ══════════════════════════════════════════
  // VIEW ALL AGENT REGISTRATIONS (Admin only)
  // GET /admin/agents
  // Header: Authorization: Bearer <adminToken>
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents')
  async getAllAgents(@Query() paginationDto: PaginationDto) {
    return this.adminService.getAllAgents(paginationDto);
  }

  // ══════════════════════════════════════════
  // VIEW SINGLE AGENT FULL DETAIL (Admin only)
  // GET /admin/agents/:agentId
  // Header: Authorization: Bearer <adminToken>
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents/:agentId')
  async getAgentDetail(@Param('agentId') agentId: string) {
    return this.adminService.getAgentDetail(agentId);
  }

  // ══════════════════════════════════════════
  // APPROVE / REJECT AGENT (Admin only)
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Post('approve-agent')
  async approveAgent(@Body() body: { agentId: string }) {
    return this.adminService.approveAgent(body.agentId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('reject-agent')
  async rejectAgent(@Body() body: { agentId: string; reason?: string }) {
    return this.adminService.rejectAgent(body.agentId, body.reason);
  }

  // ══════════════════════════════════════════
  // VIEW ALL ADMINS (Admin only)
  // GET /admin
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.adminService.findAll(paginationDto);
  }
}
