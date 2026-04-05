import { Controller, Get, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { PaginationDto } from '../utils/pagination.dto';

@UseGuards(UserAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get()
  getUserNotifications(@Req() req: any, @Query() query: PaginationDto) {
    return this.notificationService.getUserNotifications(req.userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationService.getUnreadCount(req.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.userId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, req.userId);
  }
}
