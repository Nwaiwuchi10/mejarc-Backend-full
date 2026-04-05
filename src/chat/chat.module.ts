import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { ChatService } from './chat.service';
import { User } from '../user/entities/user.entity';

import { ChatController } from './chat.controller';
import { ChatGateway } from './gateway/chat.gateway';
import { NotificationModule } from '../notification/notification.module';
import { Admin } from '../admin/entities/admin.entity';
import { Agent } from '../agent/entities/agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, ConversationMember, User, Admin, Agent]),
    NotificationModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
