import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  HttpException,
  HttpStatus,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AgentService } from './agent.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateAgentProfileDto } from './dto/create-agent-profile.dto';
import { CreateAgentBioDto } from './dto/create-agent-bio.dto';
import { CreateAgentKycDto } from './dto/create-agent-kyc.dto';

import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { AWS_S3_BUCKET_NAME, s3Client } from 'src/utils/aws-s3.config';
import multerS3 from 'multer-s3';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * POST /agent/initialize/:userId
   * Initialize agent registration after user signup
   */
  @Post('initialize/:userId')
  async initializeAgent(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.agentService.initializeAgent(userId);
  }

  /**
   * POST /agent/:userId/profile
   * Step 1: Submit Profile Information with optional profile picture upload
   */
  @Post(':userId/profile')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      storage: multerS3({
        s3: s3Client as any,
        bucket: AWS_S3_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const sanitized = file.originalname
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '');
          cb(null, `agent-profile-pics/${Date.now()}-${sanitized}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for profile pics
    }),
  )
  async submitProfile(
    @Param('userId') userId: string,
    @Body('dto') dto: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    const parsedDto = dto ? JSON.parse(dto) : {};
    return this.agentService.submitProfile(userId, parsedDto, file);
  }

  /**
   * PATCH /agent/:agentId/bio
   * Step 2: Submit Bio
   */
  @Patch(':agentId/bio')
  async submitBio(
    @Param('agentId') agentId: string,
    @Body() bioDto: CreateAgentBioDto,
  ) {
    if (!agentId) {
      throw new BadRequestException('agentId is required');
    }
    return this.agentService.submitBio(agentId, bioDto);
  }

  /**
   * POST /agent/:agentId/kyc
   * Step 3: Submit KYC Information with file uploads
   */
  @Post(':agentId/kyc')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idDocument', maxCount: 1 },
        { name: 'architectCert', maxCount: 1 },
      ],
      {
        storage: multerS3({
          s3: s3Client as any,
          bucket: AWS_S3_BUCKET_NAME,
          acl: 'public-read',
          contentType: multerS3.AUTO_CONTENT_TYPE,
          key: (req, file, cb) => {
            const sanitized = file.originalname
              .replace(/\s+/g, '')
              .replace(/[^a-zA-Z0-9.-]/g, '');
            cb(null, `agent-kyc-documents/${Date.now()}-${sanitized}`);
          },
        }),
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for documents
      },
    ),
  )
  async submitKyc(
    @Param('agentId') agentId: string,
    @Body('dto') dto: string,
    @UploadedFiles()
    files?: {
      idDocument?: Express.Multer.File[];
      architectCert?: Express.Multer.File[];
    },
  ) {
    if (!agentId) {
      throw new BadRequestException('agentId is required');
    }
    const parsedDto = dto ? JSON.parse(dto) : {};
    return this.agentService.submitKyc(agentId, parsedDto, files);
  }

  /**
   * GET /agent/user/:userId
   * Get agent profile by userId
   */
  @Get('user/:userId')
  async getAgentByUserId(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.agentService.getAgentByUserId(userId);
  }

  /**
   * GET /agent/status/:agentId
   * Get agent registration status
   */
  @Get('status/:agentId')
  async getAgentStatus(@Param('agentId') agentId: string) {
    if (!agentId) {
      throw new BadRequestException('agentId is required');
    }
    return this.agentService.getAgentStatus(agentId);
  }

  /**
   * POST /agent/:agentId/approve
   * Admin: Approve agent registration
   */
  @Post(':agentId/approve')
  async approveAgent(
    @Param('agentId') agentId: string,
    @Body('adminId') adminId: string,
  ) {
    if (!agentId || !adminId) {
      throw new BadRequestException('agentId and adminId are required');
    }
    return this.agentService.approveAgent(agentId, adminId);
  }

  /**
   * POST /agent/:agentId/reject
   * Admin: Reject agent registration
   */
  @Post(':agentId/reject')
  async rejectAgent(
    @Param('agentId') agentId: string,
    @Body('adminId') adminId: string,
    @Body('reason') reason: string,
  ) {
    if (!agentId || !adminId || !reason) {
      throw new BadRequestException(
        'agentId, adminId, and reason are required',
      );
    }
    return this.agentService.rejectAgent(agentId, adminId, reason);
  }

  /**
   * GET /agent
   * Get all agents
   */
  @Get()
  findAll() {
    return this.agentService.findAll();
  }

  /**
   * GET /agent/:id
   * Get agent by ID
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  /**
   * PATCH /agent/:id
   * Update agent details
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentService.update(id, updateAgentDto);
  }

  /**
   * DELETE /agent/:id
   * Delete agent (soft delete)
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }

  // ===== LEGACY ENDPOINT =====

  /**
   * POST /agent (legacy)
   * Create agent - for backward compatibility
   */
  @Post()
  async create(@Body() createAgentDto: CreateAgentDto) {
    const userId = (createAgentDto as any).userId as string;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.agentService.create(userId, createAgentDto);
  }
}
