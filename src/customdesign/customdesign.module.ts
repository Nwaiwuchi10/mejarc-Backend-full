/**
 * Custom Design Module
 * NestJS module for custom design resource
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomDesign } from './entities/customdesign.entity';
import { CustomDesignService } from './customdesign.service';
import { CustomDesignController } from './customdesign.controller';
import { UserModule } from '../user/user.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomDesign]), UserModule, AgentModule],
  controllers: [CustomDesignController],
  providers: [CustomDesignService],
  exports: [CustomDesignService],
})
export class CustomDesignModule {}
