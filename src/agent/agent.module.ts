import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { AgentProfile } from './entities/agent-profile.entity';
import { AgentBio } from './entities/agent-bio.entity';
import { AgentKyc } from './entities/agent-kyc.entity';
import { User } from '../user/entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { AgentKycController } from './controller/kyc.controller';
import { MulterModule } from '@nestjs/platform-express';
import { UverifyKycProvider } from './provider/uverify.provider';
import { AgentMailService } from './service/mail.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MulterModule.register(),
    TypeOrmModule.forFeature([
      Agent,
      AgentProfile,
      AgentBio,
      AgentKyc,
      User,
      Admin,
    ]),
    UserModule,
  ],
  controllers: [AgentController, AgentKycController],
  providers: [AgentService, UverifyKycProvider, AgentMailService],
  exports: [AgentService, AgentMailService],
})
export class AgentModule {}
