import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailService } from './service/mail.service';
import { UserAuthGuard } from './guard/user.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserAddress } from './entities/user-adress.entity';
import { Agent } from '../agent/entities/agent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAddress, Agent])],
  controllers: [UserController],
  providers: [UserService, MailService, UserAuthGuard],
  exports: [MailService, UserAuthGuard, UserService],
})
export class UserModule { }
