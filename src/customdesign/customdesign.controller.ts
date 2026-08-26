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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('Custom Design')
@Controller('custom-design')
export class CustomDesignController {
  constructor(private readonly service: CustomDesignService) {}

  // ---------------------------------------------------------------------------
  // POST /custom-design/initialize
  // Start a new wizard session (Step 1: service type + context)
  // ---------------------------------------------------------------------------
  @Post('initialize')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Step 1: Initialize a new custom design wizard session',
  })
  @ApiResponse({
    status: 201,
    description: 'Custom design session initialized',
  })
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
  // ---------------------------------------------------------------------------
  @Post()
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'One-shot submission: Complete wizard and submit custom design project',
    description:
      'Uploads all wizard steps and optional reference files at once',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Custom design project submitted' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user custom design projects' })
  @ApiResponse({ status: 200, description: 'List of user custom designs' })
  async getMyDesigns(
    @Request() req,
    @Query() query: ListCustomDesignsQueryDto,
  ) {
    const userId: string = req.userId;
    return this.service.findMyDesigns(userId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/config/:serviceType
  // ---------------------------------------------------------------------------
  @Get('config/:serviceType')
  @ApiOperation({
    summary: 'Get dynamic wizard configuration for a service type (Public)',
    description:
      'Returns available options, building contexts, scopes, and validation rules for the given service type',
  })
  @ApiParam({
    name: 'serviceType',
    description:
      'Service type enum e.g. Architectural, Structural, MEP, Interior',
  })
  @ApiResponse({ status: 200, description: 'Service configuration returned' })
  getServiceConfig(@Param('serviceType') serviceType: string) {
    const valid = Object.values(ServiceType).includes(
      serviceType as ServiceType,
    );
    if (!valid)
      throw new BadRequestException(`Invalid service type: "${serviceType}"`);
    return this.service.getServiceConfig(serviceType as ServiceType);
  }

  // ---------------------------------------------------------------------------
  // GET /custom-design/user/:userId    (Admin)
  // ---------------------------------------------------------------------------
  @Get('user/:userId')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get custom designs by user ID (Admin/Staff)' })
  @ApiParam({ name: 'userId', description: 'User ID UUID' })
  @ApiResponse({ status: 200, description: 'Custom design list' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get custom designs assigned to an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Custom design list' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get custom design project details by ID' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Custom design project details' })
  async getById(@Param('id') id: string): Promise<CustomDesignResponseDto> {
    return this.service.findById(id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /custom-design/:id/step
  // Save a single step mid-wizard
  // ---------------------------------------------------------------------------
  @Patch(':id/step')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Save progress for a specific wizard step' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Step data saved' })
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
  // ---------------------------------------------------------------------------
  @Post(':id/submit')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Finalize and submit a saved draft project' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Draft submitted successfully' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate single step payload against service rules',
  })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Step validation status' })
  async validateStep(
    @Param('id') id: string,
    @Body() body: { step: number; data: Record<string, any> },
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const design = await this.service.findById(id);
    return this.service.validateStepData(
      design.serviceType,
      body.step,
      body.data,
    );
  }

  // ---------------------------------------------------------------------------
  // PATCH /custom-design/:id
  // Partial update of a draft (general)
  // ---------------------------------------------------------------------------
  @Patch(':id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update custom design draft' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Custom design updated' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete custom design project' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 204, description: 'Custom design deleted' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin approve custom design proposal' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Approved' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin reject custom design proposal' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Rejected' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Agent accept assigned custom design project' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent accepted' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Agent decline assigned custom design project' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent declined' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set agreed price for custom design' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Agreed price proposed' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Customer confirms the agreed price' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Agreed price confirmed' })
  async confirmAgreedPrice(@Request() req, @Param('id') id: string) {
    const userId = req.userId;
    return this.service.confirmAgreedPrice(id, userId);
  }

  @Post(':id/initialize-payment')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initialize Paystack payment for custom design agreed price',
  })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment initialized with reference',
  })
  async initializePayment(@Request() req, @Param('id') id: string) {
    const userId = req.userId;
    return this.service.initializePayment(id, userId);
  }

  @Get('verify-payment')
  @ApiOperation({ summary: 'Verify custom design payment reference' })
  @ApiQuery({ name: 'reference', description: 'Paystack payment reference' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPayment(@Query('reference') reference: string) {
    return this.service.verifyPayment(reference);
  }
}
