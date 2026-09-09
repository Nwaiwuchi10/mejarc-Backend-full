import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Query,
  UseGuards,
  Req,
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
import { AgentService } from './agent.service';
import { AgentAnalyticsService } from './agent-analytics.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateAgentBioDto } from './dto/create-agent-bio.dto';
import { PaginationDto } from '../utils/pagination.dto';
import { UserAuthGuard } from '../user/guard/user.guard';

import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { AWS_S3_BUCKET_NAME, s3Client } from 'src/utils/aws-s3.config';
import * as multerS3 from 'multer-s3';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly analyticsService: AgentAnalyticsService,
  ) { }

  @Get('analytics')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get agent dashboard analytics metrics' })
  @ApiResponse({ status: 200, description: 'Analytics statistics' })
  getAnalytics(@Req() req) {
    const userId = req.userId;
    return this.analyticsService.getDashboardAnalytics(userId);
  }

  @Get('project-counts')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get agent active and total project counts' })
  @ApiResponse({ status: 200, description: 'Project counts' })
  getProjectCounts(@Req() req) {
    const userId = req.userId;
    return this.analyticsService.getProjectCounts(userId);
  }

  @Get('projects')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get agent projects grouped by category' })
  @ApiResponse({ status: 200, description: 'Projects by category' })
  getProjects(@Req() req) {
    const userId = req.userId;
    return this.analyticsService.getProjectsByCategory(userId);
  }

  /**
   * POST /agent/initialize/:userId
   * Initialize agent registration after user signup
   */
  @Post('initialize/:userId')
  @ApiOperation({
    summary: 'Initialize agent registration',
    description: 'Creates initial agent record for a user after signing up',
  })
  @ApiParam({ name: 'userId', description: 'User ID UUID' })
  @ApiResponse({ status: 201, description: 'Agent initialized' })
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
  @ApiOperation({
    summary: 'Agent onboarding Step 1: Submit Profile',
    description:
      'Submits agent personal/professional details with optional profile photo',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (max 100MB)',
        },
        dto: {
          type: 'string',
          description: 'JSON string of CreateAgentProfileDto',
          example:
            '{"profession":"Architect","experience":5,"companyName":"Design Studio","address":{"street":"123 Main St","city":"Lagos","state":"Lagos","country":"Nigeria"}}',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile submitted successfully' })
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      storage: multerS3({
        s3: s3Client as any,
        bucket: AWS_S3_BUCKET_NAME,
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
  @ApiOperation({
    summary: 'Agent onboarding Step 2: Submit Bio & Specialization',
    description: 'Submits agent bio, headline, and specialization tags',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Bio updated' })
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
  @ApiOperation({
    summary: 'Agent onboarding Step 3: Submit KYC Documents',
    description:
      'Uploads government ID and professional certificates for KYC verification',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        idDocument: {
          type: 'string',
          format: 'binary',
          description: 'Government ID document file',
        },
        architectCert: {
          type: 'string',
          format: 'binary',
          description: 'Professional certificate document file',
        },
        dto: {
          type: 'string',
          description: 'JSON string of CreateAgentKycDto',
          example:
            '{"idType":"NIN","idNumber":"12345678901","certNumber":"ARCH-9921"}',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'KYC documents submitted' })
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
  @ApiOperation({ summary: 'Get agent profile by User ID' })
  @ApiParam({ name: 'userId', description: 'User ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent profile details' })
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
  @ApiOperation({ summary: 'Get agent verification / registration status' })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Current agent status' })
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
  @ApiOperation({ summary: 'Approve agent verification (Admin)' })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { adminId: { type: 'string', example: 'admin-uuid' } },
      required: ['adminId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Agent approved' })
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
  @ApiOperation({ summary: 'Reject agent verification (Admin)' })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        adminId: { type: 'string', example: 'admin-uuid' },
        reason: { type: 'string', example: 'Document unreadable' },
      },
      required: ['adminId', 'reason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Agent rejected' })
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

  @Get('pros')
  @ApiOperation({ summary: 'Find all verified professionals / agents' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of verified agents',
  })
  findAllPros(@Query() paginationDto: PaginationDto) {
    return this.agentService.findAllPros(paginationDto);
  }

  /**
   * GET /agent/pros/:id
   * Fetch a single agent formatted for the "Agent Details" UI
   */
  @Get('pros/:id')
  @ApiOperation({
    summary: 'Get single professional agent details for public profile',
  })
  @ApiParam({ name: 'id', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Professional profile details' })
  async getProById(@Param('id') id: string) {
    return this.agentService.findProById(id);
  }

  /**
   * GET /agent
   * Get all agents
   */
  @Get()
  @ApiOperation({ summary: 'Get all agents (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of agents' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.agentService.findAll(paginationDto);
  }

  /**
   * GET /agent/:id
   * Get agent by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiParam({ name: 'id', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  /**
   * PATCH /agent/:id
   * Update agent details
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update agent details' })
  @ApiParam({ name: 'id', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent updated' })
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentService.update(id, updateAgentDto);
  }

  /**
   * DELETE /agent/:id
   * Delete agent (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent (soft delete)' })
  @ApiParam({ name: 'id', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent removed' })
  remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }

  // ===== LEGACY ENDPOINT =====

  /**
   * POST /agent (legacy)
   * Create agent - for backward compatibility
   */
  @Post()
  @ApiOperation({ summary: 'Create agent (legacy endpoint)' })
  @ApiResponse({ status: 201, description: 'Agent created' })
  async create(@Body() createAgentDto: CreateAgentDto) {
    const userId = (createAgentDto as any).userId as string;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.agentService.create(userId, createAgentDto);
  }
}
