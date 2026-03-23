/**
 * Custom Design Controller
 * API endpoints for custom design submissions
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CustomDesignService } from './customdesign.service';
import {
  CreateCustomDesignDto,
  UpdateCustomDesignDto,
  UpdateCustomDesignStepDto,
  CustomDesignResponseDto,
  ListCustomDesignsQueryDto,
  ValidateCustomDesignStepDto,
  ServiceContextStepDto,
} from './dto/customdesign.dto';

import { ServiceType } from './customdesign.types';
import { UserAuthGuard } from 'src/user/guard/user.guard';

@Controller('custom-design')
export class CustomDesignController {
  constructor(private readonly customDesignService: CustomDesignService) {}

  /**
   * POST /custom-design/initialize
   * Initialize a new custom design submission (Step 1)
   */
  @Post('initialize')
  @UseGuards(UserAuthGuard)
  async initializeCustomDesign(
    @Request() req,
    @Body() serviceContextDto: ServiceContextStepDto,
  ): Promise<CustomDesignResponseDto> {
    const userId = req.user.id;
    const agentId = req.user.agentId || null;

    return this.customDesignService.initializeCustomDesign(
      userId,
      serviceContextDto,
      agentId,
    );
  }

  /**
   * POST /custom-design
   * Create a complete custom design submission
   */
  @Post()
  @UseGuards(UserAuthGuard)
  async createCustomDesign(
    @Request() req,
    @Body() createCustomDesignDto: CreateCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const userId = req.user.id;
    const agentId = req.user.agentId || null;

    return this.customDesignService.create(
      userId,
      createCustomDesignDto,
      agentId,
    );
  }

  /**
   * PUT /custom-design/:id/step
   * Update a specific step in the custom design
   */
  @Put(':id/step')
  @UseGuards(UserAuthGuard)
  async updateStep(
    @Request() req,
    @Param('id') customDesignId: string,
    @Body() updateStepDto: UpdateCustomDesignStepDto,
  ): Promise<CustomDesignResponseDto> {
    const userId = req.user.id;

    return this.customDesignService.updateStep(
      customDesignId,
      userId,
      updateStepDto,
    );
  }

  /**
   * POST /custom-design/:id/validate-step
   * Validate step data before saving
   */
  @Post(':id/validate-step')
  @UseGuards(UserAuthGuard)
  async validateStep(
    @Param('id') customDesignId: string,
    @Body() validateStepDto: ValidateCustomDesignStepDto,
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const customDesign =
      await this.customDesignService.findById(customDesignId);

    return this.customDesignService.validateStepData(
      customDesign.serviceType,
      validateStepDto.step,
      validateStepDto.data,
    );
  }

  /**
   * PUT /custom-design/:id
   * Update the entire custom design
   */
  @Put(':id')
  @UseGuards(UserAuthGuard)
  async updateCustomDesign(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const userId = req.user.id;

    return this.customDesignService.update(id, userId, updateDto);
  }

  /**
   * POST /custom-design/:id/submit
   * Submit a completed custom design
   */
  @Post(':id/submit')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitCustomDesign(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CustomDesignResponseDto> {
    const userId = req.user.id;

    return this.customDesignService.submitCustomDesign(id, userId);
  }

  /**
   * GET /custom-design/:id
   * Get a specific custom design by ID
   */
  @Get(':id')
  @UseGuards(UserAuthGuard)
  async getCustomDesignById(
    @Param('id') id: string,
  ): Promise<CustomDesignResponseDto> {
    return this.customDesignService.findById(id);
  }

  /**
   * GET /custom-design/user/:userId
   * Get all custom designs for a specific user
   */
  @Get('user/:userId')
  @UseGuards(UserAuthGuard)
  async getCustomDesignsByUserId(
    @Param('userId') userId: string,
    @Query() queryDto: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number }> {
    return this.customDesignService.findByUserId(userId, queryDto);
  }

  /**
   * GET /custom-design/agent/:agentId
   * Get all custom designs created by an agent
   */
  @Get('agent/:agentId')
  @UseGuards(UserAuthGuard)
  async getCustomDesignsByAgentId(
    @Param('agentId') agentId: string,
    @Query() queryDto: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number }> {
    return this.customDesignService.findByAgentId(agentId, queryDto);
  }

  /**
   * DELETE /custom-design/:id
   * Delete a custom design
   */
  @Delete(':id')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomDesign(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = req.user.id;

    return this.customDesignService.delete(id, userId);
  }

  /**
   * GET /custom-design/config/:serviceType
   * Get service configuration
   */
  @Get('config/:serviceType')
  getServiceConfig(@Param('serviceType') serviceType: string) {
    const serviceTypeEnum = Object.values(ServiceType).includes(
      serviceType as ServiceType,
    )
      ? (serviceType as ServiceType)
      : null;

    if (!serviceTypeEnum) {
      throw new BadRequestException('Invalid service type');
    }

    return this.customDesignService.getServiceConfig(serviceTypeEnum);
  }

  /**
   * POST /custom-design/:id/approve
   * Approve a custom design (Admin only)
   */
  @Post(':id/approve')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async approveCustomDesign(
    @Param('id') id: string,
    @Body() body?: { notes?: string },
  ): Promise<CustomDesignResponseDto> {
    return this.customDesignService.approveCustomDesign(id, body?.notes);
  }

  /**
   * POST /custom-design/:id/reject
   * Reject a custom design (Admin only)
   */
  @Post(':id/reject')
  @UseGuards(UserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async rejectCustomDesign(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ): Promise<CustomDesignResponseDto> {
    return this.customDesignService.rejectCustomDesign(id, body?.reason);
  }

  /**
   * GET /custom-design/my/designs
   * Get current user's custom designs
   */
  @Get('my/designs')
  @UseGuards(UserAuthGuard)
  async getMyCustomDesigns(
    @Request() req,
    @Query() queryDto: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number }> {
    const userId = req.user.id;

    return this.customDesignService.findByUserId(userId, queryDto);
  }
}
