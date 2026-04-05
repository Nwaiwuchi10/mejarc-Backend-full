/**
 * Custom Design Controller
 * REST API endpoints for the 6-step custom design wizard
 *
 * Auth: The UserAuthGuard sets request.userId (not request.user.id)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CustomDesignService } from './customdesign.service';
import {
  InitializeCustomDesignDto,
  SaveStepDto,
  SubmitCustomDesignDto,
  UpdateCustomDesignDto,
  ListCustomDesignsQueryDto,
  CustomDesignResponseDto,
  ReviewCustomDesignDto,
} from './dto/customdesign.dto';
import { ServiceType } from './customdesign.types';
import { UserAuthGuard } from 'src/user/guard/user.guard';
import { createS3Storage } from 'src/utils/aws-s3.config';
import { SetAgreedPriceDto } from './dto/set-agreed-price.dto';

@Controller('custom-design')
export class CustomDesignController {
  constructor(private readonly service: CustomDesignService) {}

  // ---------------------------------------------------------------------------
  // POST /custom-design/initialize
  // Start a new wizard session (Step 1: service type + context)
  // ---------------------------------------------------------------------------
  @Post('initialize')
  @UseGuards(UserAuthGuard)
  async initialize(
    @Request() req,
    @Body() dto: InitializeCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    const agentId: string | undefined = req.agentId ?? undefined;
    return this.service.initialize(userId, dto, agentId);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design
  // One-shot: complete all 6 steps at once and submit immediately
  // (Frontend completes wizard locally then POSTs everything together)
  // ---------------------------------------------------------------------------
  @Post()
  @UseGuards(UserAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: createS3Storage('custom-designs'),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async createAndSubmit(
    @Request() req,
    @Body() dto: SubmitCustomDesignDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    const agentId: string | undefined = req.agentId ?? undefined;
    return this.service.createAndSubmit(userId, dto, agentId, files);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/my
  // Current user's own designs (paginated)
  // ---------------------------------------------------------------------------
  @Get('my')
  @UseGuards(UserAuthGuard)
  async getMyDesigns(
    @Request() req,
    @Query() query: ListCustomDesignsQueryDto,
  ) {
    const userId: string = req.userId;
    return this.service.findMyDesigns(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/config/:serviceType
  // Return the service configuration (contexts, projectTypes, scopes, etc.)
  // Used by the frontend to populate wizard options.
  // No auth required — public config endpoint.
  // ---------------------------------------------------------------------------
  @Get('config/:serviceType')
  getServiceConfig(@Param('serviceType') serviceType: string) {
    const valid = Object.values(ServiceType).includes(serviceType as ServiceType);
    if (!valid) throw new BadRequestException(`Invalid service type: "${serviceType}"`);
    return this.service.getServiceConfig(serviceType as ServiceType);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/user/:userId    (Admin)
  // ---------------------------------------------------------------------------
  @Get('user/:userId')
  @UseGuards(UserAuthGuard)
  async getByUser(
    @Param('userId') userId: string,
    @Query() query: ListCustomDesignsQueryDto,
  ) {
    return this.service.findByUser(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/agent/:agentId  (Admin / Agent)
  // ---------------------------------------------------------------------------
  @Get('agent/:agentId')
  @UseGuards(UserAuthGuard)
  async getByAgent(
    @Param('agentId') agentId: string,
    @Query() query: ListCustomDesignsQueryDto,
  ) {
    return this.service.findByAgent(agentId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/:id
  // ---------------------------------------------------------------------------
  @Get(':id')
  @UseGuards(UserAuthGuard)
  async getById(@Param('id') id: string): Promise<CustomDesignResponseDto> {
    return this.service.findById(id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /custom-design/:id/step
  // Save a single step mid-wizard
  // ---------------------------------------------------------------------------
  @Patch(':id/step')
  @UseGuards(UserAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: createS3Storage('custom-designs'),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async saveStep(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SaveStepDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    return this.service.saveStep(id, userId, dto, files);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design/:id/submit
  // Finalize and submit an in-progress draft
  // Optionally accepts final step-6 data (budget, timeline, additionalInfo)
  // ---------------------------------------------------------------------------
  @Post(':id/submit')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: createS3Storage('custom-designs'),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async submit(
    @Request() req,
    @Param('id') id: string,
    @Body() dto?: Partial<SubmitCustomDesignDto>,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    return this.service.submit(id, userId, dto, files);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design/:id/validate-step
  // Validate step data against service config (server-side)
  // ---------------------------------------------------------------------------
  @Post(':id/validate-step')
  @UseGuards(UserAuthGuard)
  async validateStep(
    @Param('id') id: string,
    @Body() body: { step: number; data: Record<string, any> },
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const design = await this.service.findById(id);
    return this.service.validateStepData(design.serviceType, body.step, body.data);
  }

  // ---------------------------------------------------------------------------
  // PATCH /custom-design/:id
  // Partial update of a draft (general)
  // ---------------------------------------------------------------------------
  @Patch(':id')
  @UseGuards(UserAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: createS3Storage('custom-designs'),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateCustomDesignDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    return this.service.update(id, userId, dto, files);
  }

  // ---------------------------------------------------------------------------
  // DELETE /custom-design/:id
  // ---------------------------------------------------------------------------
  @Delete(':id')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    const userId: string = req.userId;
    return this.service.delete(id, userId);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design/:id/approve   (Admin)
  // ---------------------------------------------------------------------------
  @Post(':id/approve')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Body() dto?: ReviewCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    return this.service.approve(id, dto?.notes);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design/:id/reject    (Admin)
  // ---------------------------------------------------------------------------
  @Post(':id/reject')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @Body() dto?: ReviewCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    return this.service.reject(id, dto?.notes);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design/:id/agent-approve
  // ---------------------------------------------------------------------------
  @Post(':id/agent-approve')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async agentApprove(
    @Request() req,
    @Param('id') id: string,
    @Body() dto?: ReviewCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    return this.service.agentApprove(id, userId, dto?.notes);
  }

  // ---------------------------------------------------------------------------
  // POST /custom-design/:id/agent-reject
  // ---------------------------------------------------------------------------
  @Post(':id/agent-reject')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async agentReject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto?: ReviewCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const userId: string = req.userId;
    return this.service.agentReject(id, userId, dto?.notes);
  }

  // ---------------------------------------------------------------------------
  // PAYMENT FLOW ENDPOINTS
  // ---------------------------------------------------------------------------

  @Post(':id/agreed-price')
  @UseGuards(UserAuthGuard)
  async setAgreedPrice(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SetAgreedPriceDto,
  ) {
    const userId = req.userId;
    return this.service.setAgreedPrice(id, userId, dto);
  }

  @Post(':id/confirm-price')
  @UseGuards(UserAuthGuard)
  async confirmAgreedPrice(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.userId;
    return this.service.confirmAgreedPrice(id, userId);
  }

  @Post(':id/initialize-payment')
  @UseGuards(UserAuthGuard)
  async initializePayment(
    @Request() req,
    @Param('id') id: string,
  ) {
    const userId = req.userId;
    return this.service.initializePayment(id, userId);
  }

  @Get('verify-payment')
  async verifyPayment(@Query('reference') reference: string) {
    return this.service.verifyPayment(reference);
  }

  // ===== LEGACY ENDPOINT =====

  /**
   * POST /agent (legacy)
   * Create agent - for backward compatibility
   */
  @Post()
  async create(@Body() dto: any) {
    // This seems to be a placeholder or legacy
    return { message: 'Legacy endpoint' };
  }
}
