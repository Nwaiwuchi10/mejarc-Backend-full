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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { PaginationDto } from '../utils/pagination.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from 'src/utils/aws-s3.config';
import { ConversationType } from './entities/conversation.entity';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(UserAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Get current user chat inbox conversations' })
  @ApiResponse({ status: 200, description: 'User conversations list' })
  async getInbox(@Request() req) {
    return this.chatService.getInbox(req.userId);
  }

  @Get('dm-inbox')
  @ApiOperation({ summary: 'Get direct messages inbox' })
  @ApiResponse({ status: 200, description: 'DM conversations list' })
  async getDMInbox(@Request() req) {
    return this.chatService.getInbox(req.userId, ConversationType.DM);
  }

  @Post('start-dm/:recipientId')
  @ApiOperation({
    summary:
      'Start or retrieve a direct 1-on-1 chat conversation with another user',
  })
  @ApiParam({ name: 'recipientId', description: 'Recipient user ID UUID' })
  @ApiResponse({
    status: 201,
    description: 'Conversation started or retrieved',
  })
  async startDM(@Request() req, @Param('recipientId') recipientId: string) {
    return this.chatService.startDM(req.userId, recipientId);
  }

  @Post('start-custom-design/:customdesignId')
  @ApiOperation({
    summary: 'Start or retrieve a custom design project conversation',
  })
  @ApiParam({ name: 'customdesignId', description: 'Custom Design ID UUID' })
  @ApiResponse({
    status: 201,
    description: 'Project chat started or retrieved',
  })
  async startCustomDesignChat(
    @Request() req,
    @Param('customdesignId') customdesignId: string,
  ) {
    return this.chatService.startCustomDesignChat(req.userId, customdesignId);
  }

  @Get('custom-design/:customdesignId')
  @ApiOperation({
    summary: 'Get conversation linked to a custom design project',
  })
  @ApiParam({ name: 'customdesignId', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getByCustomDesignId(@Param('customdesignId') customdesignId: string) {
    return this.chatService.getConversationByCustomDesignId(customdesignId);
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'Get paginated messages inside a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID UUID' })
  @ApiResponse({ status: 200, description: 'Messages list' })
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getMessages(conversationId, req.userId, pagination);
  }

  @Post('read/:conversationId')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID UUID' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  async markAsRead(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.markAsRead(conversationId, req.userId);
  }

  @Post('send/:conversationId')
  @ApiOperation({ summary: 'Send a message with optional file attachments' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          example: 'Hello, here is the updated floor plan.',
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'Optional file attachments (images, documents, max 10 files)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
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
