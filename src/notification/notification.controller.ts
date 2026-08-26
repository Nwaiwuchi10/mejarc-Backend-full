import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { PaginationDto } from '../utils/pagination.dto';

@ApiTags('Notification')
@UseGuards(UserAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  getUserNotifications(@Req() req: any, @Query() query: PaginationDto) {
    return this.notificationService.getUserNotifications(req.userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  getUnreadCount(@Req() req: any) {
    return this.notificationService.getUnreadCount(req.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, req.userId);
  }
}
