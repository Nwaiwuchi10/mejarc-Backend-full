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
import { Agent } from '../agent/entities/agent.entity';
import { CustomDesign } from '../customdesign/entities/customdesign.entity';
import { CustomDesignModule } from '../customdesign/customdesign.module';
import { Admin } from 'src/admin/entities/admin.entity';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, ConversationMember, User, Admin, Agent, CustomDesign]),
    NotificationModule,
    forwardRef(() => CustomDesignModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule { }
