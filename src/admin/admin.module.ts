import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { User } from '../user/entities/user.entity';
import { Agent } from '../agent/entities/agent.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AgentModule } from '../agent/agent.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, User, Agent]),
    AgentModule,
    UserModule,
  ],
  providers: [AdminService, AdminAuthGuard],
  controllers: [AdminController],
  exports: [AdminService, AdminAuthGuard],
})
export class AdminModule { }
