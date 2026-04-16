/**
 * Custom Design Module
 * NestJS module for custom design resource
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomDesign } from './entities/customdesign.entity';
import { CustomDesignPayment } from './entities/custom-design-payment.entity';
import { CustomDesignService } from './customdesign.service';
import { CustomDesignController } from './customdesign.controller';
import { UserModule } from '../user/user.module';
import { AgentModule } from '../agent/agent.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { Admin } from '../admin/entities/admin.entity';
import { Agent } from '../agent/entities/agent.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectActivity } from './entities/project-activity.entity';
import { ProjectFile } from './entities/project-file.entity';
import { CustomDesignWorkspaceController } from './customdesign-workspace.controller';
import { CustomDesignWorkspaceService } from './customdesign-workspace.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomDesign,
      CustomDesignPayment,
      Admin,
      Agent,
      ProjectMilestone,
      ProjectActivity,
      ProjectFile,
    ]),
    UserModule,
    AgentModule,
    WalletModule,
    NotificationModule,
  ],
  controllers: [CustomDesignController, CustomDesignWorkspaceController],
  providers: [CustomDesignService, CustomDesignWorkspaceService],
  exports: [CustomDesignService, CustomDesignWorkspaceService],
})
export class CustomDesignModule { }
