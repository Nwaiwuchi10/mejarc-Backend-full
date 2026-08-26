import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Patch,
  Delete,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './dto/withdraw.dto';
import { UserAuthGuard } from '../user/guard/user.guard';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { BankAccountService } from './services/bank-account.service';
import { PaystackService } from './services/paystack.service';
import { WithdrawalQueueService } from './services/withdrawal-queue.service';
import { AuditLogService } from './services/audit-log.service';
import {
  RegisterBankAccountDto,
  VerifyBankAccountDto,
} from './dto/bank-account.dto';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly bankAccountService: BankAccountService,
    private readonly paystackService: PaystackService,
    private readonly withdrawalQueueService: WithdrawalQueueService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ========================================
  // BANK ACCOUNT ENDPOINTS
  // ========================================

  @UseGuards(UserAuthGuard)
  @Post('bank-account/register')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Register a new bank account for vendor / agent' })
  @ApiResponse({ status: 201, description: 'Bank account registered' })
  async registerBankAccount(
    @Req() req,
    @Body() registerDto: RegisterBankAccountDto,
  ) {
    const userId = req.userId;
    return this.bankAccountService.registerBankAccountByUserId(
      userId,
      registerDto,
    );
  }

  @UseGuards(UserAuthGuard)
  @Post('bank-account/verify/:bankAccountId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify bank account details via Paystack' })
  @ApiParam({ name: 'bankAccountId', description: 'Bank Account ID UUID' })
  @ApiResponse({ status: 200, description: 'Bank account verified' })
  async verifyBankAccount(
    @Req() req,
    @Param('bankAccountId') bankAccountId: string,
    @Body() verifyDto: VerifyBankAccountDto,
  ) {
    const userId = req.userId;
    return this.bankAccountService.verifyBankAccountByUserId(
      userId,
      bankAccountId,
      verifyDto,
    );
  }

  @UseGuards(UserAuthGuard)
  @Get('bank-account')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all saved bank accounts for the user' })
  @ApiResponse({ status: 200, description: 'List of bank accounts' })
  async getBankAccounts(@Req() req) {
    const userId = req.userId;
    return this.bankAccountService.getBankAccountsByUserId(userId);
  }

  @UseGuards(UserAuthGuard)
  @Patch('bank-account/default/:bankAccountId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set default bank account for payouts' })
  @ApiParam({ name: 'bankAccountId', description: 'Bank Account ID UUID' })
  @ApiResponse({ status: 200, description: 'Default bank account updated' })
  async setDefaultBankAccount(
    @Req() req,
    @Param('bankAccountId') bankAccountId: string,
  ) {
    const userId = req.userId;
    return this.bankAccountService.setDefaultBankAccountByUserId(
      userId,
      bankAccountId,
    );
  }

  @UseGuards(UserAuthGuard)
  @Delete('bank-account/:bankAccountId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a registered bank account' })
  @ApiParam({ name: 'bankAccountId', description: 'Bank Account ID UUID' })
  @ApiResponse({ status: 200, description: 'Bank account deleted' })
  async deleteBankAccount(
    @Req() req,
    @Param('bankAccountId') bankAccountId: string,
  ) {
    const userId = req.userId;
    await this.bankAccountService.deleteBankAccountByUserId(
      userId,
      bankAccountId,
    );
    return { message: 'Bank account deleted successfully' };
  }

  @Get('banks')
  @ApiOperation({
    summary: 'Get list of supported banks from Paystack (Public)',
  })
  @ApiResponse({ status: 200, description: 'Bank list' })
  async getBanks() {
    return this.paystackService.getBankList();
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get public withdrawal limits and rules' })
  @ApiResponse({ status: 200, description: 'Withdrawal rules' })
  async getWithdrawalRules() {
    return this.walletService.getWithdrawalSettings();
  }

  // ========================================
  // AGENT WALLET ENDPOINTS
  // ========================================

  @UseGuards(UserAuthGuard)
  @Get('overview/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get wallet balances, escrow balance, and pending payouts',
  })
  @ApiParam({ name: 'userId', description: 'User ID UUID' })
  @ApiResponse({ status: 200, description: 'Wallet overview' })
  getOverview(@Param('userId') userId: string) {
    return this.walletService.getOverview(userId);
  }

  @UseGuards(UserAuthGuard)
  @Post('withdraw')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request a funds withdrawal from wallet' })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated' })
  withdraw(@Req() req, @Body() withdrawDto: WithdrawDto) {
    const userId = req.userId;
    return this.walletService.withdraw(userId, withdrawDto);
  }

  @UseGuards(UserAuthGuard)
  @Get('transactions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get transaction history of user' })
  @ApiResponse({ status: 200, description: 'Transaction history' })
  getTransactions(@Req() req) {
    const userId = req.userId;
    return this.walletService.getTransactions(userId);
  }

  @UseGuards(UserAuthGuard)
  @Get('withdrawals')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get withdrawal history of user' })
  @ApiResponse({ status: 200, description: 'Withdrawal history' })
  getMyWithdrawals(@Req() req) {
    const userId = req.userId;
    return this.walletService.getMyWithdrawals(userId);
  }

  @UseGuards(UserAuthGuard)
  @Get('withdrawals/:withdrawalId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get specific withdrawal details' })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID UUID' })
  @ApiResponse({ status: 200, description: 'Withdrawal details' })
  async getWithdrawalDetails(
    @Req() req,
    @Param('withdrawalId') withdrawalId: string,
  ) {
    return this.walletService.getWithdrawalDetails(withdrawalId, req.userId);
  }

  // ========================================
  // ADMIN ENDPOINTS
  // ========================================

  @UseGuards(AdminAuthGuard)
  @Get('admin/withdrawal-settings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get admin withdrawal settings' })
  @ApiResponse({ status: 200, description: 'Settings' })
  getWithdrawalSettings() {
    return this.walletService.getWithdrawalSettings();
  }

  @UseGuards(AdminAuthGuard)
  @Patch('admin/withdrawal-settings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update admin withdrawal settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  updateWithdrawalSettings(
    @Body()
    dto: {
      mode?: 'AUTO' | 'MANUAL';
      autoApproveThreshold?: number;
      minWithdrawalAmount?: number;
    },
  ) {
    return this.walletService.updateWithdrawalSettings(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/withdrawals')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all withdrawals for admin review' })
  @ApiResponse({ status: 200, description: 'All withdrawals' })
  getAllWithdrawals() {
    return this.walletService.getAllWithdrawals();
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/:id/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin approve withdrawal' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID UUID' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved' })
  approveWithdrawal(
    @Req() req,
    @Param('id') id: string,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.walletService.approveWithdrawal(id, adminNotes, req.adminId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/:id/reject')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin reject withdrawal' })
  @ApiParam({ name: 'id', description: 'Withdrawal ID UUID' })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected' })
  rejectWithdrawal(
    @Req() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.walletService.rejectWithdrawal(id, reason, req.adminId);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/withdrawals/:withdrawalId/audit-logs')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get audit logs for a specific withdrawal' })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID UUID' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async getWithdrawalAuditLogs(@Param('withdrawalId') withdrawalId: string) {
    return this.auditLogService.getWithdrawalAuditLogs(withdrawalId);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/audit-logs')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get paginated audit logs for financial reporting' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async getAllAuditLogs(@Req() req) {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 50;
    return this.auditLogService.getAllAuditLogs(skip, take);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/audit-logs/action/:action')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get audit logs filtered by action' })
  @ApiParam({ name: 'action', description: 'Action type' })
  @ApiResponse({ status: 200, description: 'Action audit logs' })
  async getAuditLogsByAction(@Req() req, @Param('action') action: string) {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 50;
    return this.auditLogService.getLogsByAction(action as any, skip, take);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/financials/withdrawal-summary')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get financial withdrawal summary' })
  @ApiResponse({ status: 200, description: 'Withdrawal summary' })
  async getFinancialSummary() {
    return this.walletService.getFinancialSummary();
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/financials/reports')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get financial reports by date range' })
  @ApiQuery({ name: 'startDate', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Financial report' })
  async getFinancialReports(@Req() req) {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required query parameters',
      );
    }
    return this.walletService.getFinancialReports(
      new Date(startDate as string),
      new Date(endDate as string),
    );
  }

  // ========================================
  // PAYSTACK WEBHOOK ENDPOINT
  // ========================================

  @Post('webhook/paystack')
  @HttpCode(200)
  @ApiOperation({ summary: 'Paystack transfer webhook callback' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack HMAC signature',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePaystackWebhook(
    @Req() req,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = JSON.stringify(req.body);

    if (!signature) {
      throw new BadRequestException('Missing Paystack signature');
    }

    const isValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid Paystack signature');
    }

    await this.withdrawalQueueService.handlePaystackWebhookCallback(req.body);

    return { status: 'ok' };
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/retry')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manual retry for all failed withdrawals' })
  @ApiResponse({ status: 200, description: 'Retried failed withdrawals' })
  async retryFailedWithdrawals() {
    return this.withdrawalQueueService.retryFailedWithdrawals();
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/retry/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Retry a specific failed withdrawal' })
  @ApiParam({ name: 'id', description: 'Withdrawal UUID' })
  @ApiResponse({ status: 200, description: 'Withdrawal retry initiated' })
  async retrySingleWithdrawal(@Param('id') id: string) {
    return this.withdrawalQueueService.processWithdrawal({
      withdrawalId: id,
      retry: true,
    } as any);
  }
}
