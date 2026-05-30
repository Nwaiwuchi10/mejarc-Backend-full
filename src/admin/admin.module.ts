import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { User } from '../user/entities/user.entity';
import { Agent } from '../agent/entities/agent.entity';
import { Order } from '../order/entities/order.entity';
import { MarketProduct } from '../marketproduct/entities/marketproduct.entity';
import { Conversation } from '../chat/entities/conversation.entity';
import { Message } from '../chat/entities/message.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AgentModule } from '../agent/agent.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User, Agent, Order, MarketProduct, Conversation, Message]),
    AgentModule,
    UserModule,
  ],
  providers: [AdminService, AdminAuthGuard],
  controllers: [AdminController],
  exports: [AdminService, AdminAuthGuard],
})
export class AdminModule { }
