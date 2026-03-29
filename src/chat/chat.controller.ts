import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { PaginationDto } from '../utils/pagination.dto';

@Controller('chat')
@UseGuards(UserAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('inbox')
  async getInbox(@Request() req) {
    return this.chatService.getInbox(req.userId);
  }

  @Post('start-dm/:recipientId')
  async startDM(@Request() req, @Param('recipientId') recipientId: string) {
    return this.chatService.startDM(req.userId, recipientId);
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getMessages(conversationId, req.userId, pagination);
  }

  @Post('read/:conversationId')
  async markAsRead(@Request() req, @Param('conversationId') conversationId: string) {
    return this.chatService.markAsRead(conversationId, req.userId);
  }
}
