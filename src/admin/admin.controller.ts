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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { PaginationDto } from '../utils/pagination.dto';
import {
  AdminLoginDto,
  VerifyAdminLoginDto,
  MakeAdminDto,
} from './dto/admin-login.dto';
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

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // ══════════════════════════════════════════
  // MAKE USER AN ADMIN
  // POST /admin/make-admin
  // ══════════════════════════════════════════
  @Post('make-admin')
  @ApiOperation({ summary: 'Promote a user to admin role' })
  @ApiResponse({ status: 200, description: 'User promoted to admin' })
  async makeAdmin(@Body() body: MakeAdminDto) {
    return this.adminService.makeAdmin(body.userId, body.role);
  }

  // ══════════════════════════════════════════
  // BOOTSTRAP FIRST ADMIN (ONE-TIME GET)
  // GET /admin/bootstrap-first-admin-secure-endpoint/:email
  // ══════════════════════════════════════════
  @Get('believe/:email')
  @ApiOperation({
    summary: 'One-time endpoint to bootstrap the first superadmin by email (disables permanently after run)',
  })
  @ApiResponse({ status: 200, description: 'First admin successfully promoted' })
  @ApiResponse({ status: 403, description: 'Forbidden if an admin already exists' })
  async bootstrapFirstAdmin(@Param('email') email: string) {
    return this.adminService.bootstrapFirstAdmin(email);
  }

  // ══════════════════════════════════════════
  // ADMIN LOGIN — Step 1
  // POST /admin/login
  // ══════════════════════════════════════════
  @Post('login')
  @ApiOperation({
    summary: 'Admin login step 1: Validate email/password and dispatch OTP',
  })
  @ApiResponse({ status: 200, description: 'OTP sent to admin email' })
  @ApiResponse({ status: 401, description: 'Invalid admin credentials' })
  async adminLogin(@Body() body: AdminLoginDto) {
    if (!body || !body.email || !body.password) {
      throw new BadRequestException(
        'Request body must contain email and password',
      );
    }
    return this.adminService.adminLogin(body.email, body.password);
  }

  // ══════════════════════════════════════════
  // ADMIN LOGIN — Step 2: Verify OTP
  // POST /admin/verify-login
  // ══════════════════════════════════════════
  @Post('verify-login')
  @ApiOperation({ summary: 'Admin login step 2: Verify OTP and receive JWT' })
  @ApiResponse({
    status: 200,
    description: 'Admin authenticated with JWT token',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP token' })
  async verifyAdminLogin(@Body() body: VerifyAdminLoginDto) {
    return this.adminService.verifyAdminLogin(body.email, body.token);
  }

  // ══════════════════════════════════════════
  // VIEW ALL AGENT REGISTRATIONS
  // GET /admin/agents
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all agents with pagination' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  async getAllAgents(@Query() paginationDto: PaginationDto) {
    return this.adminService.getAllAgents(paginationDto);
  }

  // ══════════════════════════════════════════
  // VIEW ALL AGENT APPLICATIONS FOR KYC REVIEW
  // GET /admin/agents/applications
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents/applications')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get pending agent applications for KYC review' })
  @ApiResponse({ status: 200, description: 'List of agent applications' })
  async getAgentApplications(@Query() query: any) {
    return this.adminService.getAgentApplications(query);
  }

  // ══════════════════════════════════════════
  // VIEW SINGLE AGENT FULL DETAIL
  // GET /admin/agents/:agentId
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get('agents/:agentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get full details of a specific agent' })
  @ApiParam({ name: 'agentId', description: 'Agent UUID' })
  @ApiResponse({ status: 200, description: 'Agent full details' })
  async getAgentDetail(@Param('agentId', new ParseUUIDPipe()) agentId: string) {
    return this.adminService.getAgentDetail(agentId);
  }

  // ══════════════════════════════════════════
  // APPROVE / REJECT AGENT
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Post('approve-agent')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve agent verification' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { agentId: { type: 'string', example: 'uuid' } },
      required: ['agentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Agent approved' })
  async approveAgent(@Body() body: { agentId: string }) {
    return this.adminService.approveAgent(body.agentId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('reject-agent')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject agent verification' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', example: 'uuid' },
        reason: { type: 'string', example: 'Document unreadable' },
      },
      required: ['agentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Agent rejected' })
  async rejectAgent(@Body() body: { agentId: string; reason?: string }) {
    return this.adminService.rejectAgent(body.agentId, body.reason);
  }

  // ══════════════════════════════════════════
  // VIEW ALL ADMINS
  // GET /admin
  // ══════════════════════════════════════════
  @UseGuards(AdminAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all admin users' })
  @ApiResponse({ status: 200, description: 'List of admins' })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.adminService.findAll(paginationDto);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── USERS ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/users  — list all users (Customers, Agents, Staff tabs)
  @UseGuards(AdminAuthGuard)
  @Get('users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all users with filtering by role and status' })
  @ApiResponse({ status: 200, description: 'Filtered user list' })
  async getUsers(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAdminUsers(query);
  }

  // GET /admin/users/:userId  — single user detail
  @UseGuards(AdminAuthGuard)
  @Get('users/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get single user detail' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User detail' })
  async getUserDetail(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.adminService.getAdminUserDetail(userId);
  }

  // PATCH /admin/users/:userId/suspend
  @UseGuards(AdminAuthGuard)
  @Patch('users/:userId/suspend')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User suspended' })
  async suspendUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.adminService.suspendUser(userId);
  }

  // PATCH /admin/users/:userId/activate
  @UseGuards(AdminAuthGuard)
  @Patch('users/:userId/activate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User activated' })
  async activateUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.adminService.activateUser(userId);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── COMMUNICATION ──────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/communication/stats
  @UseGuards(AdminAuthGuard)
  @Get('communication/stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get communication dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Communication stats' })
  async getCommunicationStats() {
    return this.adminService.getCommunicationStats();
  }

  // GET /admin/communication/conversations
  @UseGuards(AdminAuthGuard)
  @Get('communication/conversations')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all conversations for moderation' })
  @ApiResponse({ status: 200, description: 'Conversation list' })
  async getConversations(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getConversations(query);
  }

  // GET /admin/communication/conversations/:conversationId
  @UseGuards(AdminAuthGuard)
  @Get('communication/conversations/:conversationId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversationDetail(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.adminService.getConversationDetail(conversationId);
  }

  // POST /admin/communication/conversations/:conversationId/escalate
  @UseGuards(AdminAuthGuard)
  @Post('communication/conversations/:conversationId/escalate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Escalate a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation escalated' })
  async escalateConversation(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List messages across conversations' })
  @ApiResponse({ status: 200, description: 'Messages list' })
  async getMessages(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAdminMessages(query);
  }

  // GET /admin/messages/:conversationId  — get messages in conversation
  @UseGuards(AdminAuthGuard)
  @Get('messages/:conversationId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all messages inside a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Messages in conversation' })
  async getConversationMessages(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
  ) {
    return this.adminService.getConversationMessages(conversationId);
  }

  // POST /admin/messages/:conversationId/reply  — admin sends message
  @UseGuards(AdminAuthGuard)
  @Post('messages/:conversationId/reply')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin replies to a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, description: 'Reply sent' })
  async sendMessage(
    @Param('conversationId', new ParseUUIDPipe()) conversationId: string,
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get financial summary and stats' })
  @ApiResponse({ status: 200, description: 'Financial stats' })
  async getFinancialStats() {
    return this.adminService.getFinancialStats();
  }

  // GET /admin/financials/transactions
  @UseGuards(AdminAuthGuard)
  @Get('financials/transactions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all customer transactions' })
  @ApiResponse({ status: 200, description: 'Transactions list' })
  async getTransactions(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getCustomerTransactions(query);
  }

  // GET /admin/financials/payouts
  @UseGuards(AdminAuthGuard)
  @Get('financials/payouts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all agent payouts' })
  @ApiResponse({ status: 200, description: 'Payouts list' })
  async getPayouts(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAgentPayouts(query);
  }

  // GET /admin/financials/disputes
  @UseGuards(AdminAuthGuard)
  @Get('financials/disputes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all financial disputes' })
  @ApiResponse({ status: 200, description: 'Disputes list' })
  async getDisputes(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getDisputes(query);
  }

  // GET /admin/financials/refunds
  @UseGuards(AdminAuthGuard)
  @Get('financials/refunds')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all refund requests' })
  @ApiResponse({ status: 200, description: 'Refunds list' })
  async getRefunds(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getRefunds(query);
  }

  // PATCH /admin/financials/payouts/:payoutId/release
  @UseGuards(AdminAuthGuard)
  @Patch('financials/payouts/:payoutId/release')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Release payout to agent' })
  @ApiParam({ name: 'payoutId', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Payout released' })
  async releasePayout(
    @Param('payoutId', new ParseUUIDPipe()) payoutId: string,
    @Body() body: any,
  ) {
    return this.adminService.releasePayout(payoutId, body?.notes);
  }

  // PATCH /admin/financials/disputes/:disputeId/resolve
  @UseGuards(AdminAuthGuard)
  @Patch('financials/disputes/:disputeId/resolve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resolve dispute' })
  @ApiParam({ name: 'disputeId', description: 'Dispute UUID' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolveDispute(
    @Param('disputeId', new ParseUUIDPipe()) disputeId: string,
    @Body() body: ResolveDisputeDto,
  ) {
    return this.adminService.resolveDispute(
      disputeId,
      body.resolution,
      body.refundTo,
    );
  }

  // PATCH /admin/financials/refunds/:refundId/approve
  @UseGuards(AdminAuthGuard)
  @Patch('financials/refunds/:refundId/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve refund' })
  @ApiParam({ name: 'refundId', description: 'Refund UUID' })
  @ApiResponse({ status: 200, description: 'Refund approved' })
  async approveRefund(
    @Param('refundId', new ParseUUIDPipe()) refundId: string,
    @Body() body: any,
  ) {
    return this.adminService.approveRefund(refundId, body?.notes);
  }

  // ════════════════════════════════════════════════════════════════
  // ─── MARKETPLACE ─────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/marketplace/stats
  @UseGuards(AdminAuthGuard)
  @Get('marketplace/stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get marketplace stats' })
  @ApiResponse({ status: 200, description: 'Marketplace stats' })
  async getMarketplaceStats() {
    return this.adminService.getMarketplaceStats();
  }

  // GET /admin/marketplace/listings
  @UseGuards(AdminAuthGuard)
  @Get('marketplace/listings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all marketplace listings for review' })
  @ApiResponse({ status: 200, description: 'Marketplace listings' })
  async getMarketplaceListings(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getMarketplaceListings(query);
  }

  // GET /admin/marketplace/listings/:listingId
  @UseGuards(AdminAuthGuard)
  @Get('marketplace/listings/:listingId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get marketplace listing detail' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  @ApiResponse({ status: 200, description: 'Listing details' })
  async getMarketplaceListing(
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
  ) {
    return this.adminService.getMarketplaceListing(listingId);
  }

  // PATCH /admin/marketplace/listings/:listingId/approve
  @UseGuards(AdminAuthGuard)
  @Patch('marketplace/listings/:listingId/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve marketplace product listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  @ApiResponse({ status: 200, description: 'Listing approved' })
  async approveMarketplaceListing(
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
  ) {
    return this.adminService.approveMarketplaceListing(listingId);
  }

  // PATCH /admin/marketplace/listings/:listingId/reject
  @UseGuards(AdminAuthGuard)
  @Patch('marketplace/listings/:listingId/reject')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject marketplace product listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  @ApiResponse({ status: 200, description: 'Listing rejected' })
  async rejectMarketplaceListing(
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
    @Body() body: AdminMarketActionDto,
  ) {
    return this.adminService.rejectMarketplaceListing(listingId, body?.reason);
  }

  // PATCH /admin/marketplace/listings/:listingId/request-change
  @UseGuards(AdminAuthGuard)
  @Patch('marketplace/listings/:listingId/request-change')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request changes on marketplace product listing' })
  @ApiParam({ name: 'listingId', description: 'Listing UUID' })
  @ApiResponse({ status: 200, description: 'Change request sent' })
  async requestMarketplaceChange(
    @Param('listingId', new ParseUUIDPipe()) listingId: string,
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get project oversight statistics' })
  @ApiResponse({ status: 200, description: 'Project stats' })
  async getProjectStats() {
    return this.adminService.getProjectStats();
  }

  // GET /admin/projects/customers
  @UseGuards(AdminAuthGuard)
  @Get('projects/customers')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get customer projects' })
  @ApiResponse({ status: 200, description: 'Customer projects' })
  async getCustomerProjects(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getCustomerProjects(query);
  }

  // GET /admin/projects/agents
  @UseGuards(AdminAuthGuard)
  @Get('projects/agents')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get agent performance across projects' })
  @ApiResponse({ status: 200, description: 'Agent project performance' })
  async getAgentPerformance(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getAgentPerformance(query);
  }

  // GET /admin/projects/custom
  @UseGuards(AdminAuthGuard)
  @Get('projects/custom')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get custom design project submissions' })
  @ApiResponse({ status: 200, description: 'Custom projects list' })
  async getCustomProjects(@Query() query: AdminPaginatedQueryDto) {
    return this.adminService.getCustomProjectSubmissions(query);
  }

  // GET /admin/projects/customers/:projectId
  @UseGuards(AdminAuthGuard)
  @Get('projects/customers/:projectId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get customer project detail' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  async getProjectDetail(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
  ) {
    return this.adminService.getProjectDetail(projectId);
  }

  // PATCH /admin/projects/customers/:projectId/assign-agent
  @UseGuards(AdminAuthGuard)
  @Patch('projects/customers/:projectId/assign-agent')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign agent to project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Agent assigned' })
  async assignAgent(
    @Param('projectId', new ParseUUIDPipe()) projectId: string,
    @Body() body: AssignAgentDto,
  ) {
    return this.adminService.assignAgentToProject(projectId, body.agentId);
  }

  // PATCH /admin/projects/custom/:submissionId/approve
  @UseGuards(AdminAuthGuard)
  @Patch('projects/custom/:submissionId/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve custom design project submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Custom project approved' })
  async approveCustomProject(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
  ) {
    return this.adminService.approveCustomProject(submissionId);
  }

  // PATCH /admin/projects/custom/:submissionId/reject
  @UseGuards(AdminAuthGuard)
  @Patch('projects/custom/:submissionId/reject')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject custom design project submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Custom project rejected' })
  async rejectCustomProject(
    @Param('submissionId', new ParseUUIDPipe()) submissionId: string,
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get executive dashboard report summary' })
  @ApiResponse({ status: 200, description: 'Report summary' })
  async getReportsSummary() {
    return this.adminService.getReportsSummary();
  }

  // GET /admin/system-health
  @UseGuards(AdminAuthGuard)
  @Get('system-health')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get backend system health and metrics' })
  @ApiResponse({ status: 200, description: 'System health metrics' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // GET /admin/reports/performance
  @UseGuards(AdminAuthGuard)
  @Get('reports/performance')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get project performance metrics report' })
  @ApiResponse({ status: 200, description: 'Performance report' })
  async getProjectPerformance() {
    return this.adminService.getProjectPerformance();
  }

  // GET /admin/reports/revenue-chart
  @UseGuards(AdminAuthGuard)
  @Get('reports/revenue-chart')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get monthly / historical revenue chart data' })
  @ApiResponse({ status: 200, description: 'Revenue chart data' })
  async getRevenueChart() {
    return this.adminService.getRevenueChart();
  }

  // GET /admin/reports/top-agents
  @UseGuards(AdminAuthGuard)
  @Get('reports/top-agents')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get top performing agents ranking' })
  @ApiResponse({ status: 200, description: 'Top agents list' })
  async getTopAgents() {
    return this.adminService.getTopAgents();
  }

  // GET /admin/reports/customer-activity
  @UseGuards(AdminAuthGuard)
  @Get('reports/customer-activity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get customer platform activity report' })
  @ApiResponse({ status: 200, description: 'Customer activity data' })
  async getCustomerActivity() {
    return this.adminService.getCustomerActivity();
  }

  // ════════════════════════════════════════════════════════════════
  // ─── ROLES ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/roles/stats
  @UseGuards(AdminAuthGuard)
  @Get('roles/stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get roles and permissions statistics' })
  @ApiResponse({ status: 200, description: 'Roles stats' })
  async getRolesStats() {
    return this.adminService.getRolesStats();
  }

  // GET /admin/roles
  @UseGuards(AdminAuthGuard)
  @Get('roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all admin roles' })
  @ApiResponse({ status: 200, description: 'Roles list' })
  async getAllRoles() {
    return this.adminService.getAllRoles();
  }

  // POST /admin/roles
  @UseGuards(AdminAuthGuard)
  @Post('roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new admin role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(@Body() body: CreateRoleDto) {
    return this.adminService.createRole(body);
  }

  // PATCH /admin/roles/:roleId
  @UseGuards(AdminAuthGuard)
  @Patch('roles/:roleId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an admin role' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @Body() body: UpdateRoleDto,
  ) {
    return this.adminService.updateRole(roleId, body);
  }

  // DELETE /admin/roles/:roleId
  @UseGuards(AdminAuthGuard)
  @Delete('roles/:roleId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an admin role' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@Param('roleId', new ParseUUIDPipe()) roleId: string) {
    return this.adminService.deleteRole(roleId);
  }

  // GET /admin/roles/staff
  @UseGuards(AdminAuthGuard)
  @Get('roles/staff')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get staff members and their assigned roles' })
  @ApiResponse({ status: 200, description: 'Staff list' })
  async getStaffList() {
    return this.adminService.getStaffList();
  }

  // PATCH /admin/roles/staff/:userId/assign
  @UseGuards(AdminAuthGuard)
  @Patch('roles/staff/:userId/assign')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign a role to staff user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  async assignRoleToStaff(
    @Param('userId') userId: string,
    @Body() body: AssignRoleDto,
  ) {
    return this.adminService.assignRoleToStaff(userId, body.roleId);
  }

  // GET /admin/roles/permissions
  @UseGuards(AdminAuthGuard)
  @Get('roles/permissions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get RBAC permissions matrix' })
  @ApiResponse({ status: 200, description: 'Permissions matrix' })
  async getPermissionMatrix() {
    return this.adminService.getPermissionMatrix();
  }

  // ════════════════════════════════════════════════════════════════
  // ─── SETTINGS ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════

  // GET /admin/settings/profile
  @UseGuards(AdminAuthGuard)
  @Get('settings/profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({ status: 200, description: 'Admin profile' })
  async getAdminProfile(@Request() req: any) {
    return this.adminService.getAdminProfile(req.adminId);
  }

  // PATCH /admin/settings/profile
  @UseGuards(AdminAuthGuard)
  @Patch('settings/profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current admin profile' })
  @ApiResponse({ status: 200, description: 'Admin profile updated' })
  async updateAdminProfile(
    @Request() req: any,
    @Body() body: UpdateAdminProfileDto,
  ) {
    return this.adminService.updateAdminProfile(req.adminId, body);
  }

  // PATCH /admin/settings/security/change-password
  @UseGuards(AdminAuthGuard)
  @Patch('settings/security/change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change admin password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Request() req: any,
    @Body() body: ChangeAdminPasswordDto,
  ) {
    return this.adminService.changeAdminPassword(
      req.adminId,
      body.currentPassword,
      body.newPassword,
    );
  }
}
