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
  SetDefaultBankAccountDto,
} from './dto/bank-account.dto';

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

  /**
   * Register a new bank account
   * POST /wallet/bank-account/register
   */
  @UseGuards(UserAuthGuard)
  @Post('bank-account/register')
  async registerBankAccount(
    @Req() req,
    @Body() registerDto: RegisterBankAccountDto,
  ) {
    const userId = req.userId;
    return this.bankAccountService.registerBankAccountByUserId(userId, registerDto);
  }

  /**
   * Verify bank account with Paystack
   * POST /wallet/bank-account/verify/:bankAccountId
   */
  @UseGuards(UserAuthGuard)
  @Post('bank-account/verify/:bankAccountId')
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

  /**
   * Get all bank accounts for the vendor
   * GET /wallet/bank-account
   */
  @UseGuards(UserAuthGuard)
  @Get('bank-account')
  async getBankAccounts(@Req() req) {
    const userId = req.userId;
    return this.bankAccountService.getBankAccountsByUserId(userId);
  }

  /**
   * Set default bank account for withdrawals
   * PATCH /wallet/bank-account/default/:bankAccountId
   */
  @UseGuards(UserAuthGuard)
  @Patch('bank-account/default/:bankAccountId')
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

  /**
   * Delete bank account
   * DELETE /wallet/bank-account/:bankAccountId
   */
  @UseGuards(UserAuthGuard)
  @Delete('bank-account/:bankAccountId')
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

  /**
   * Get available banks for dropdown
   * GET /wallet/banks
   */
  @Get('banks')
  async getBanks() {
    return this.paystackService.getBankList();
  }

  // ========================================
  // AGENT WALLET ENDPOINTS
  // ========================================

  @UseGuards(UserAuthGuard)
  @Get('overview/:userId')
  getOverview(@Param('userId') userId: string) {
    return this.walletService.getOverview(userId);
  }

  /**
   * Enhanced withdrawal endpoint with Paystack integration
   * POST /wallet/withdraw
   */
  @UseGuards(UserAuthGuard)
  @Post('withdraw')
  withdraw(@Req() req, @Body() withdrawDto: WithdrawDto) {
    const userId = req.userId;
    return this.walletService.withdraw(userId, withdrawDto);
  }

  @UseGuards(UserAuthGuard)
  @Get('transactions')
  getTransactions(@Req() req) {
    const userId = req.userId;
    return this.walletService.getTransactions(userId);
  }

  @UseGuards(UserAuthGuard)
  @Get('withdrawals')
  getMyWithdrawals(@Req() req) {
    const userId = req.userId;
    return this.walletService.getMyWithdrawals(userId);
  }

  /**
   * Get withdrawal details
   * GET /wallet/withdrawals/:withdrawalId
   */
  @UseGuards(UserAuthGuard)
  @Get('withdrawals/:withdrawalId')
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
  @Get('admin/withdrawals')
  getAllWithdrawals() {
    return this.walletService.getAllWithdrawals();
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/:id/approve')
  approveWithdrawal(
    @Req() req,
    @Param('id') id: string,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.walletService.approveWithdrawal(id, adminNotes, req.adminId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/:id/reject')
  rejectWithdrawal(
    @Req() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.walletService.rejectWithdrawal(id, reason, req.adminId);
  }

  /**
   * Get audit logs for a withdrawal
   * GET /admin/withdrawals/:withdrawalId/audit-logs
   */
  @UseGuards(AdminAuthGuard)
  @Get('admin/withdrawals/:withdrawalId/audit-logs')
  async getWithdrawalAuditLogs(@Param('withdrawalId') withdrawalId: string) {
    return this.auditLogService.getWithdrawalAuditLogs(withdrawalId);
  }

  /**
   * Get all audit logs (for financial reports)
   * GET /admin/audit-logs?skip=0&take=50
   */
  @UseGuards(AdminAuthGuard)
  @Get('admin/audit-logs')
  async getAllAuditLogs(@Req() req) {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 50;
    return this.auditLogService.getAllAuditLogs(skip, take);
  }

  /**
   * Get audit logs by action
   * GET /admin/audit-logs/action/:action?skip=0&take=50
   */
  @UseGuards(AdminAuthGuard)
  @Get('admin/audit-logs/action/:action')
  async getAuditLogsByAction(@Req() req, @Param('action') action: string) {
    const skip = parseInt(req.query.skip) || 0;
    const take = parseInt(req.query.take) || 50;
    return this.auditLogService.getLogsByAction(action as any, skip, take);
  }

  /**
   * Get withdrawal summary for financial reports
   * GET /admin/financials/withdrawal-summary
   */
  @UseGuards(AdminAuthGuard)
  @Get('admin/financials/withdrawal-summary')
  async getFinancialSummary() {
    return this.walletService.getFinancialSummary();
  }

  /**
   * Get financial reports by date range
   * GET /admin/financials/reports?startDate=2024-01-01&endDate=2024-12-31
   */
  @UseGuards(AdminAuthGuard)
  @Get('admin/financials/reports')
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

  /**
   * Handle Paystack webhook callbacks
   * POST /wallet/webhook/paystack
   *
   * Must verify signature using X-Paystack-Signature header
   */
  @Post('webhook/paystack')
  @HttpCode(200)
  async handlePaystackWebhook(
    @Req() req,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    if (!signature) {
      throw new BadRequestException('Missing Paystack signature');
    }

    // Verify webhook signature
    const isValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid Paystack signature');
    }

    // Process the webhook
    await this.withdrawalQueueService.handlePaystackWebhookCallback(req.body);

    return { status: 'ok' };
  }

  /**
   * Manual retry for failed withdrawals
   * POST /admin/withdrawals/retry
   */
  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/retry')
  async retryFailedWithdrawals() {
    return this.withdrawalQueueService.retryFailedWithdrawals();
  }

  /**
   * Retry a specific failed withdrawal
   * POST /admin/withdrawals/retry/:id
   */
  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/retry/:id')
  async retrySingleWithdrawal(@Param('id') id: string) {
    return this.withdrawalQueueService.processWithdrawal({
      withdrawalId: id,
      retry: true,
    } as any);
  }
}
