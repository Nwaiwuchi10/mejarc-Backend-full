import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './dto/withdraw.dto';
import { UserAuthGuard } from '../user/guard/user.guard';

@Controller('wallet')
@UseGuards(UserAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('overview')
  getOverview(@Req() req) {
    const userId = req.userId;
    return this.walletService.getOverview(userId);
  }

  @Post('withdraw')
  withdraw(@Req() req, @Body() withdrawDto: WithdrawDto) {
    const userId = req.userId;
    return this.walletService.withdraw(userId, withdrawDto);
  }
}
