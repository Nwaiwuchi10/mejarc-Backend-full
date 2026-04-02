import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './dto/withdraw.dto';
import { UserAuthGuard } from '../user/guard/user.guard';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  // ===== AGENT ENDPOINTS =====

  @UseGuards(UserAuthGuard)
  @Get('overview/:userId')
  getOverview(@Param('userId') userId: string) {
    return this.walletService.getOverview(userId);
  }

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

  // ===== ADMIN ENDPOINTS =====

  @UseGuards(AdminAuthGuard)
  @Get('admin/withdrawals')
  getAllWithdrawals() {
    return this.walletService.getAllWithdrawals();
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/:id/approve')
  approveWithdrawal(
    @Param('id') id: string,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.walletService.approveWithdrawal(id, adminNotes);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/withdrawals/:id/reject')
  rejectWithdrawal(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.walletService.rejectWithdrawal(id, reason);
  }
}
