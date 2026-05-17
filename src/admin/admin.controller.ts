import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PaginationDto } from '../utils/pagination.dto';
import { AdminLoginDto, VerifyAdminLoginDto, MakeAdminDto } from './dto/admin-login.dto';
import {
  AdminPaginatedQueryDto,
  AdminSendMessageDto,
  AdminEscalateConversationDto,
  ResolveDisputeDto,
  AdminMarketActionDto,
  AdminRequestChangeDto,
  AssignAgentDto,
  AdminProjectActionDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  UpdateAdminProfileDto,
  ChangeAdminPasswordDto,
} from './dto/admin-extended.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ══════════════════════════════════════════
  // MAKE USER AN ADMIN
  // POST /admin/make-admin
  // ══════════════════════════════════════════
  @Post('make-admin')
  async makeAdmin(@Body() body: MakeAdminDto) {
    return this.adminService.makeAdmin(body.userId, body.role);
  }

  // ══════════════════════════════════════════
  // ADMIN LOGIN — Step 1
  // POST /admin/login
  // ══════════════════════════════════════════
  @Post('login')
  async adminLogin(@Body() body: any) {
    if (!body || !body.email || !body.password) {
      throw new BadRequestException('Request body must contain email and password');
    }
    return this.adminService.adminLogin(body.email, body.password);
  }

  // ══════════════════════════════════════════
  // ADMIN LOGIN — Step 2: Verify OTP
  // POST /admin/verify-login
  // ══════════════════════════════════════════
  @Post('verify-login')
  async verifyAdminLogin(@Body() body: VerifyAdminLoginDto) {
    return this.adminService.verifyAdminLogin(body.email, body.token);
  }

  // ══════════════════════════════════════════
  // VIEW ALL AGENT REGISTRATIONS
  // GET /admin/agents
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents')
  async getAllAgents(@Query() paginationDto: PaginationDto) {
    return this.adminService.getAllAgents(paginationDto);
  }

  // ══════════════════════════════════════════
  // VIEW SINGLE AGENT FULL DETAIL
  // GET /admin/agents/:agentId
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents/:agentId')
  async getAgentDetail(@Param('agentId') agentId: string) {
    return this.adminService.getAgentDetail(agentId);
  }

  // ══════════════════════════════════════════
  // APPROVE / REJECT AGENT
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
  // VIEW ALL ADMINS
  // GET /admin
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.adminService.findAll(paginationDto);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── USERS ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/users  — list all users (Customers, Agents, Staff tabs)
  @UseGuards(AdminAuthGuard)
  @Get('users')
  async getUsers(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAdminUsers(query);
  }

  // GET /admin/users/:userId  — single user detail
  @UseGuards(AdminAuthGuard)
  @Get('users/:userId')
  async getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getAdminUserDetail(userId);
  }

  // PATCH /admin/users/:userId/suspend
  @UseGuards(AdminAuthGuard)
  @Patch('users/:userId/suspend')
  async suspendUser(@Param('userId') userId: string) {
    return this.adminService.suspendUser(userId);
  }

  // PATCH /admin/users/:userId/activate
  @UseGuards(AdminAuthGuard)
  @Patch('users/:userId/activate')
  async activateUser(@Param('userId') userId: string) {
    return this.adminService.activateUser(userId);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── COMMUNICATION ──────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/communication/stats
  @UseGuards(AdminAuthGuard)
  @Get('communication/stats')
  async getCommunicationStats() {
    return this.adminService.getCommunicationStats();
  }

  // GET /admin/communication/conversations
  @UseGuards(AdminAuthGuard)
  @Get('communication/conversations')
  async getConversations(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getConversations(query);
  }

  // GET /admin/communication/conversations/:conversationId
  @UseGuards(AdminAuthGuard)
  @Get('communication/conversations/:conversationId')
  async getConversationDetail(@Param('conversationId') conversationId: string) {
    return this.adminService.getConversationDetail(conversationId);
  }

  // POST /admin/communication/conversations/:conversationId/escalate
  @UseGuards(AdminAuthGuard)
  @Post('communication/conversations/:conversationId/escalate')
  async escalateConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: AdminEscalateConversationDto,
  ) {
    return this.adminService.escalateConversation(conversationId, body.reason);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── MESSAGES ───────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/messages  — list all conversations
  @UseGuards(AdminAuthGuard)
  @Get('messages')
  async getMessages(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAdminMessages(query);
  }

  // GET /admin/messages/:conversationId  — get messages in conversation
  @UseGuards(AdminAuthGuard)
  @Get('messages/:conversationId')
  async getConversationMessages(@Param('conversationId') conversationId: string) {
    return this.adminService.getConversationMessages(conversationId);
  }

  // POST /admin/messages/:conversationId/reply  — admin sends message
  @UseGuards(AdminAuthGuard)
  @Post('messages/:conversationId/reply')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
    @Body() body: AdminSendMessageDto,
  ) {
    return this.adminService.adminSendMessage(
      conversationId,
      req.adminId,
      body.text,
      body.attachments,
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ─── FINANCIALS ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/financials/stats
  @UseGuards(AdminAuthGuard)
  @Get('financials/stats')
  async getFinancialStats() {
    return this.adminService.getFinancialStats();
  }

  // GET /admin/financials/transactions
  @UseGuards(AdminAuthGuard)
  @Get('financials/transactions')
  async getTransactions(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getCustomerTransactions(query);
  }

  // GET /admin/financials/payouts
  @UseGuards(AdminAuthGuard)
  @Get('financials/payouts')
  async getPayouts(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAgentPayouts(query);
  }

  // GET /admin/financials/disputes
  @UseGuards(AdminAuthGuard)
  @Get('financials/disputes')
  async getDisputes(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getDisputes(query);
  }

  // GET /admin/financials/refunds
  @UseGuards(AdminAuthGuard)
  @Get('financials/refunds')
  async getRefunds(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getRefunds(query);
  }

  // PATCH /admin/financials/payouts/:payoutId/release
  @UseGuards(AdminAuthGuard)
  @Patch('financials/payouts/:payoutId/release')
  async releasePayout(@Param('payoutId') payoutId: string, @Body() body: any) {
    return this.adminService.releasePayout(payoutId, body?.notes);
  }

  // PATCH /admin/financials/disputes/:disputeId/resolve
  @UseGuards(AdminAuthGuard)
  @Patch('financials/disputes/:disputeId/resolve')
  async resolveDispute(@Param('disputeId') disputeId: string, @Body() body: ResolveDisputeDto) {
    return this.adminService.resolveDispute(disputeId, body.resolution, body.refundTo);
  }

  // PATCH /admin/financials/refunds/:refundId/approve
  @UseGuards(AdminAuthGuard)
  @Patch('financials/refunds/:refundId/approve')
  async approveRefund(@Param('refundId') refundId: string, @Body() body: any) {
    return this.adminService.approveRefund(refundId, body?.notes);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── MARKETPLACE ─────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/marketplace/stats
  @UseGuards(AdminAuthGuard)
  @Get('marketplace/stats')
  async getMarketplaceStats() {
    return this.adminService.getMarketplaceStats();
  }

  // GET /admin/marketplace/listings
  @UseGuards(AdminAuthGuard)
  @Get('marketplace/listings')
  async getMarketplaceListings(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getMarketplaceListings(query);
  }

  // GET /admin/marketplace/listings/:listingId
  @UseGuards(AdminAuthGuard)
  @Get('marketplace/listings/:listingId')
  async getMarketplaceListing(@Param('listingId') listingId: string) {
    return this.adminService.getMarketplaceListing(listingId);
  }

  // PATCH /admin/marketplace/listings/:listingId/approve
  @UseGuards(AdminAuthGuard)
  @Patch('marketplace/listings/:listingId/approve')
  async approveMarketplaceListing(@Param('listingId') listingId: string) {
    return this.adminService.approveMarketplaceListing(listingId);
  }

  // PATCH /admin/marketplace/listings/:listingId/reject
  @UseGuards(AdminAuthGuard)
  @Patch('marketplace/listings/:listingId/reject')
  async rejectMarketplaceListing(
    @Param('listingId') listingId: string,
    @Body() body: AdminMarketActionDto,
  ) {
    return this.adminService.rejectMarketplaceListing(listingId, body?.reason);
  }

  // PATCH /admin/marketplace/listings/:listingId/request-change
  @UseGuards(AdminAuthGuard)
  @Patch('marketplace/listings/:listingId/request-change')
  async requestMarketplaceChange(
    @Param('listingId') listingId: string,
    @Body() body: AdminRequestChangeDto,
  ) {
    return this.adminService.requestMarketplaceChange(listingId, body.feedback);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── PROJECT OVERSIGHT ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/projects/stats
  @UseGuards(AdminAuthGuard)
  @Get('projects/stats')
  async getProjectStats() {
    return this.adminService.getProjectStats();
  }

  // GET /admin/projects/customers
  @UseGuards(AdminAuthGuard)
  @Get('projects/customers')
  async getCustomerProjects(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getCustomerProjects(query);
  }

  // GET /admin/projects/agents
  @UseGuards(AdminAuthGuard)
  @Get('projects/agents')
  async getAgentPerformance(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAgentPerformance(query);
  }

  // GET /admin/projects/custom
  @UseGuards(AdminAuthGuard)
  @Get('projects/custom')
  async getCustomProjects(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getCustomProjectSubmissions(query);
  }

  // GET /admin/projects/customers/:projectId
  @UseGuards(AdminAuthGuard)
  @Get('projects/customers/:projectId')
  async getProjectDetail(@Param('projectId') projectId: string) {
    return this.adminService.getProjectDetail(projectId);
  }

  // PATCH /admin/projects/customers/:projectId/assign-agent
  @UseGuards(AdminAuthGuard)
  @Patch('projects/customers/:projectId/assign-agent')
  async assignAgent(
    @Param('projectId') projectId: string,
    @Body() body: AssignAgentDto,
  ) {
    return this.adminService.assignAgentToProject(projectId, body.agentId);
  }

  // PATCH /admin/projects/custom/:submissionId/approve
  @UseGuards(AdminAuthGuard)
  @Patch('projects/custom/:submissionId/approve')
  async approveCustomProject(@Param('submissionId') submissionId: string) {
    return this.adminService.approveCustomProject(submissionId);
  }

  // PATCH /admin/projects/custom/:submissionId/reject
  @UseGuards(AdminAuthGuard)
  @Patch('projects/custom/:submissionId/reject')
  async rejectCustomProject(
    @Param('submissionId') submissionId: string,
    @Body() body: AdminProjectActionDto,
  ) {
    return this.adminService.rejectCustomProject(submissionId, body?.reason);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── REPORTS ─────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/reports/summary
  @UseGuards(AdminAuthGuard)
  @Get('reports/summary')
  async getReportsSummary() {
    return this.adminService.getReportsSummary();
  }

  // GET /admin/reports/performance
  @UseGuards(AdminAuthGuard)
  @Get('reports/performance')
  async getProjectPerformance() {
    return this.adminService.getProjectPerformance();
  }

  // GET /admin/reports/revenue-chart
  @UseGuards(AdminAuthGuard)
  @Get('reports/revenue-chart')
  async getRevenueChart() {
    return this.adminService.getRevenueChart();
  }

  // GET /admin/reports/top-agents
  @UseGuards(AdminAuthGuard)
  @Get('reports/top-agents')
  async getTopAgents() {
    return this.adminService.getTopAgents();
  }

  // GET /admin/reports/customer-activity
  @UseGuards(AdminAuthGuard)
  @Get('reports/customer-activity')
  async getCustomerActivity() {
    return this.adminService.getCustomerActivity();
  }

  // ════════════════════════════════════════════════════════════════
  // ─── ROLES ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/roles/stats
  @UseGuards(AdminAuthGuard)
  @Get('roles/stats')
  async getRolesStats() {
    return this.adminService.getRolesStats();
  }

  // GET /admin/roles
  @UseGuards(AdminAuthGuard)
  @Get('roles')
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }

  // POST /admin/roles
  @UseGuards(AdminAuthGuard)
  @Post('roles')
  async createRole(@Body() body: CreateRoleDto) {
    return this.adminService.createRole(body);
  }

  // PATCH /admin/roles/:roleId
  @UseGuards(AdminAuthGuard)
  @Patch('roles/:roleId')
  async updateRole(@Param('roleId') roleId: string, @Body() body: UpdateRoleDto) {
    return this.adminService.updateRole(roleId, body);
  }

  // DELETE /admin/roles/:roleId
  @UseGuards(AdminAuthGuard)
  @Delete('roles/:roleId')
  async deleteRole(@Param('roleId') roleId: string) {
    return this.adminService.deleteRole(roleId);
  }

  // GET /admin/roles/staff
  @UseGuards(AdminAuthGuard)
  @Get('roles/staff')
  async getStaffList() {
    return this.adminService.getStaffList();
  }

  // PATCH /admin/roles/staff/:userId/assign
  @UseGuards(AdminAuthGuard)
  @Patch('roles/staff/:userId/assign')
  async assignRoleToStaff(@Param('userId') userId: string, @Body() body: AssignRoleDto) {
    return this.adminService.assignRoleToStaff(userId, body.roleId);
  }

  // GET /admin/roles/permissions
  @UseGuards(AdminAuthGuard)
  @Get('roles/permissions')
  async getPermissionMatrix() {
    return this.adminService.getPermissionMatrix();
  }

  // ════════════════════════════════════════════════════════════════
  // ─── SETTINGS ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/settings/profile
  @UseGuards(AdminAuthGuard)
  @Get('settings/profile')
  async getAdminProfile(@Request() req: any) {
    return this.adminService.getAdminProfile(req.adminId);
  }

  // PATCH /admin/settings/profile
  @UseGuards(AdminAuthGuard)
  @Patch('settings/profile')
  async updateAdminProfile(@Request() req: any, @Body() body: UpdateAdminProfileDto) {
    return this.adminService.updateAdminProfile(req.adminId, body);
  }

  // PATCH /admin/settings/security/change-password
  @UseGuards(AdminAuthGuard)
  @Patch('settings/security/change-password')
  async changePassword(@Request() req: any, @Body() body: ChangeAdminPasswordDto) {
    return this.adminService.changeAdminPassword(req.adminId, body.currentPassword, body.newPassword);
  }
}
