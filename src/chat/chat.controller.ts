import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { PaginationDto } from '../utils/pagination.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from 'src/utils/aws-s3.config';
import { ConversationType } from './entities/conversation.entity';

@Controller('chat')
@UseGuards(UserAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('inbox')
  async getInbox(@Request() req) {
    return this.chatService.getInbox(req.userId);
  }

  @Get('dm-inbox')
  async getDMInbox(@Request() req) {
    return this.chatService.getInbox(req.userId, ConversationType.DM);
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

  @Post('send/:conversationId')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: createS3Storage('chat-attachments'),
    }),
  )
  async sendMessage(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body('text') text: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const fileUrls = files
      ? files.map((file: any) => file.location).filter((url) => !!url)
      : [];

    if (!text && fileUrls.length === 0) {
      throw new BadRequestException('Message must have text or attachments');
    }

    return this.chatService.sendMessage(
      conversationId,
      req.userId,
      text,
      fileUrls,
    );
  }
}
