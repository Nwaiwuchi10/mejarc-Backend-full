/**
 * Custom Design Service
 * Business logic for custom design submissions
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomDesign } from './entities/customdesign.entity';
import {
  CreateCustomDesignDto,
  UpdateCustomDesignDto,
  UpdateCustomDesignStepDto,
  CustomDesignResponseDto,
  ListCustomDesignsQueryDto,
  ServiceContextStepDto,
  ProjectTypeStepDto,
  ScopeDeliverableStepDto,
  SizeComplexityStepDto,
  StyleStepDto,
  BudgetTimelineStepDto,
} from './dto/customdesign.dto';
import {
  ServiceType,
  CustomDesignStatus,
  SelectionMethod,
} from './customdesign.types';
import { getServiceConfig } from './config/services.config';

@Injectable()
export class CustomDesignService {
  constructor(
    @InjectRepository(CustomDesign)
    private readonly customDesignRepository: Repository<CustomDesign>,
  ) {}

  /**
   * Create a new custom design submission
   */
  async create(
    userId: string,
    createCustomDesignDto: CreateCustomDesignDto,
    agentId?: string,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = this.customDesignRepository.create({
      userId,
      agentId,
      serviceType: createCustomDesignDto.serviceType,
      selectionMethod: createCustomDesignDto.selectionMethod,
      serviceContext: createCustomDesignDto.serviceContext.serviceContext,
      projectType: createCustomDesignDto.projectType.projectType,
      scopeDeliverable: createCustomDesignDto.scopeDeliverable.scopeDeliverable,
      addons: createCustomDesignDto.scopeDeliverable.addons || [],
      sizeComplexity: createCustomDesignDto.sizeComplexity.sizeComplexity,
      style: createCustomDesignDto.style.style,
      budget: createCustomDesignDto.budgetTimeline.budget,
      timeline: createCustomDesignDto.budgetTimeline.timeline,
      additionalInformation:
        createCustomDesignDto.budgetTimeline.additionalInformation,
      attachedFileIds:
        createCustomDesignDto.budgetTimeline.attachedFileIds || [],
      currentStep: 6, // All steps completed
      status: CustomDesignStatus.SUBMITTED,
      isSubmitted: true,
      submittedAt: new Date(),
    });

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Start a new custom design (Step 1)
   */
  async initializeCustomDesign(
    userId: string,
    serviceContextDto: ServiceContextStepDto,
    agentId?: string,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = this.customDesignRepository.create({
      userId,
      agentId,
      serviceType: serviceContextDto.serviceType,
      serviceContext: serviceContextDto.serviceContext,
      currentStep: 1,
      status: CustomDesignStatus.IN_PROGRESS,
    });

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Update a specific step in the custom design
   */
  async updateStep(
    customDesignId: string,
    userId: string,
    updateStepDto: UpdateCustomDesignStepDto,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = await this.findByIdAndValidateOwnership(
      customDesignId,
      userId,
    );

    if (
      customDesign.status === CustomDesignStatus.SUBMITTED ||
      customDesign.status === CustomDesignStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot update a submitted or completed custom design',
      );
    }

    const { step, data } = updateStepDto;

    switch (step) {
      case 1:
        customDesign.serviceType = data.serviceType;
        customDesign.serviceContext = data.serviceContext;
        break;
      case 2:
        customDesign.projectType = data.projectType;
        customDesign.currentStep = Math.max(customDesign.currentStep, 2);
        break;
      case 3:
        customDesign.scopeDeliverable = data.scopeDeliverable;
        customDesign.addons = data.addons || [];
        customDesign.currentStep = Math.max(customDesign.currentStep, 3);
        break;
      case 4:
        customDesign.sizeComplexity = data.sizeComplexity;
        customDesign.currentStep = Math.max(customDesign.currentStep, 4);
        break;
      case 5:
        customDesign.style = data.style;
        customDesign.currentStep = Math.max(customDesign.currentStep, 5);
        break;
      case 6:
        customDesign.budget = data.budget;
        customDesign.timeline = data.timeline;
        customDesign.additionalInformation =
          data.additionalInformation || customDesign.additionalInformation;
        customDesign.currentStep = 6;
        break;
      default:
        throw new BadRequestException('Invalid step number');
    }

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Submit a custom design
   */
  async submitCustomDesign(
    customDesignId: string,
    userId: string,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = await this.findByIdAndValidateOwnership(
      customDesignId,
      userId,
    );

    // Validate all required fields are filled
    this.validateCustomDesignCompletion(customDesign);

    customDesign.status = CustomDesignStatus.SUBMITTED;
    customDesign.isSubmitted = true;
    customDesign.submittedAt = new Date();

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Get custom design by ID
   */
  async findById(id: string): Promise<CustomDesignResponseDto> {
    const customDesign = await this.customDesignRepository.findOne({
      where: { id },
      relations: ['user', 'agent'],
    });

    if (!customDesign) {
      throw new NotFoundException('Custom design not found');
    }

    return this.mapToResponseDto(customDesign);
  }

  /**
   * Get custom design by ID with ownership validation
   */
  private async findByIdAndValidateOwnership(
    id: string,
    userId: string,
  ): Promise<CustomDesign> {
    const customDesign = await this.customDesignRepository.findOne({
      where: { id },
    });

    if (!customDesign) {
      throw new NotFoundException('Custom design not found');
    }

    if (customDesign.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this custom design',
      );
    }

    return customDesign;
  }

  /**
   * Get all custom designs for a user
   */
  async findByUserId(
    userId: string,
    queryDto: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number }> {
    const { page = 1, limit = 10, serviceType, status } = queryDto;

    const query = this.customDesignRepository.createQueryBuilder('cd');
    query.where('cd.userId = :userId', { userId });

    if (serviceType) {
      query.andWhere('cd.serviceType = :serviceType', { serviceType });
    }

    if (status) {
      query.andWhere('cd.status = :status', { status });
    }

    const total = await query.getCount();
    const data = await query
      .orderBy('cd.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: data.map((cd) => this.mapToResponseDto(cd)),
      total,
    };
  }

  /**
   * Get all custom designs for an agent
   */
  async findByAgentId(
    agentId: string,
    queryDto: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number }> {
    const { page = 1, limit = 10, serviceType, status } = queryDto;

    const query = this.customDesignRepository.createQueryBuilder('cd');
    query.where('cd.agentId = :agentId', { agentId });

    if (serviceType) {
      query.andWhere('cd.serviceType = :serviceType', { serviceType });
    }

    if (status) {
      query.andWhere('cd.status = :status', { status });
    }

    const total = await query.getCount();
    const data = await query
      .orderBy('cd.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: data.map((cd) => this.mapToResponseDto(cd)),
      total,
    };
  }

  /**
   * Update custom design
   */
  async update(
    id: string,
    userId: string,
    updateDto: UpdateCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = await this.findByIdAndValidateOwnership(id, userId);

    if (
      customDesign.status === CustomDesignStatus.SUBMITTED ||
      customDesign.status === CustomDesignStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot update a submitted or completed custom design',
      );
    }

    Object.assign(customDesign, updateDto);

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Delete custom design
   */
  async delete(id: string, userId: string): Promise<void> {
    const customDesign = await this.findByIdAndValidateOwnership(id, userId);

    await this.customDesignRepository.remove(customDesign);
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceType: ServiceType) {
    return getServiceConfig(serviceType);
  }

  /**
   * Validate step data based on service type
   */
  async validateStepData(
    serviceType: ServiceType,
    step: number,
    data: Record<string, any>,
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const config = getServiceConfig(serviceType);
    const errors: string[] = [];

    switch (step) {
      case 1:
        // Validate service context
        const validContext = config.contexts.find(
          (c) => c.title === data.serviceContext,
        );
        if (!validContext) {
          errors.push('Invalid service context selection');
        }
        break;

      case 2:
        // Validate project type
        const validProjectType = config.projectTypes.find(
          (p) => p.title === data.projectType,
        );
        if (!validProjectType) {
          errors.push('Invalid project type selection');
        }
        break;

      case 3:
        // Validate scope deliverable
        const validScope = config.scopes.find(
          (s) => s.title === data.scopeDeliverable,
        );
        if (!validScope) {
          errors.push('Invalid scope deliverable selection');
        }
        // Validate addons
        if (data.addons) {
          data.addons.forEach((addon: string) => {
            const validAddon = config.addons.find((a) => a.title === addon);
            if (!validAddon) {
              errors.push(`Invalid addon: ${addon}`);
            }
          });
        }
        break;

      case 4:
        // Validate size complexity
        const validSize = config.sizes.find(
          (s) => s.title === data.sizeComplexity,
        );
        if (!validSize) {
          errors.push('Invalid size/complexity selection');
        }
        break;

      case 5:
        // Validate style
        const validStyle = config.styles.find((s) => s.title === data.style);
        if (!validStyle) {
          errors.push('Invalid style selection');
        }
        break;

      case 6:
        // Validate budget
        if (data.budget < config.minimumBudget) {
          errors.push(
            `Budget must be at least ${config.minimumBudget} (${config.currency})`,
          );
        }
        if (!data.timeline || data.timeline.trim() === '') {
          errors.push('Timeline is required');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Calculate estimate based on selections
   */
  calculateEstimate(customDesign: CustomDesign): {
    estimateCost: number;
    estimateTimeline: string;
  } {
    const config = getServiceConfig(customDesign.serviceType);
    let baseCost = config.minimumBudget;

    // Calculate based on scope
    const scopeMultipliers: Record<string, number> = {
      'Basic Package': 1,
      'Standard Package': 1.5,
      'Concept Package': 1.2,
      'Full Design Package': 1.8,
      'Implementation Package': 2.5,
      'Design Only': 1,
      'Design & Calculation': 1.3,
      'Full Documentation': 1.6,
      'Design Phase BIM': 1.5,
      'Construction BIM': 2,
      'As-Built BIM': 2.3,
    };

    const scopeMultiplier =
      scopeMultipliers[customDesign.scopeDeliverable] || 1;
    baseCost = Math.ceil(baseCost * scopeMultiplier);

    // Add addon costs (estimate 15% per addon)
    if (customDesign.addons && customDesign.addons.length > 0) {
      baseCost = Math.ceil(baseCost * (1 + customDesign.addons.length * 0.15));
    }

    // Size multiplier
    const sizeMultipliers: Record<string, number> = {
      'Small (under 200 sqm)': 0.8,
      'Small (up to 150 sqm)': 0.7,
      'Small (Single discipline)': 0.9,
      'Small Project (1-5 viewpoints)': 0.8,
      'Small (up to 500 sqm)': 0.85,
      'Small System (Single building)': 0.85,
      'Low-Rise (Up to 5 stories)': 0.9,
      'Medium (200-1000 sqm)': 1,
      'Medium (150-500 sqm)': 1,
      'Medium Project (6-15 viewpoints)': 1,
      'Medium (500-2000 sqm)': 1.1,
      'Medium System (Complex building)': 1.2,
      'Mid-Rise (6-15 stories)': 1.2,
      'Large (1000 sqm and above)': 1.5,
      'Large (500+ sqm)': 1.3,
      'Large Project (15+ viewpoints with animation)': 1.4,
      'Large (2000+ sqm)': 1.5,
      'Large System (Multiple buildings)': 1.5,
      'High-Rise (15+ stories)': 1.8,
    };

    const sizeMultiplier = sizeMultipliers[customDesign.sizeComplexity] || 1;
    baseCost = Math.ceil(baseCost * sizeMultiplier);

    // Timeline estimation
    let timelineText = 'Based on selection';
    if (customDesign.timeline) {
      timelineText = customDesign.timeline;
    }

    return {
      estimateCost: baseCost,
      estimateTimeline: timelineText,
    };
  }

  /**
   * Approve a custom design
   */
  async approveCustomDesign(
    id: string,
    approvalNotes?: string,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = await this.customDesignRepository.findOne({
      where: { id },
    });

    if (!customDesign) {
      throw new NotFoundException('Custom design not found');
    }

    customDesign.status = CustomDesignStatus.APPROVED;
    customDesign.isApproved = true;
    customDesign.approvedAt = new Date();
    if (approvalNotes) {
      customDesign.approvalNotes = approvalNotes;
    }

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Reject a custom design
   */
  async rejectCustomDesign(
    id: string,
    rejectionReason?: string,
  ): Promise<CustomDesignResponseDto> {
    const customDesign = await this.customDesignRepository.findOne({
      where: { id },
    });

    if (!customDesign) {
      throw new NotFoundException('Custom design not found');
    }

    customDesign.status = CustomDesignStatus.REJECTED;
    if (rejectionReason) {
      customDesign.approvalNotes = rejectionReason;
    }

    const saved = await this.customDesignRepository.save(customDesign);
    return this.mapToResponseDto(saved);
  }

  /**
   * Private helper: Validate custom design completion
   */
  private validateCustomDesignCompletion(customDesign: CustomDesign): void {
    const requiredFields = [
      'serviceType',
      'serviceContext',
      'projectType',
      'scopeDeliverable',
      'sizeComplexity',
      'style',
      'budget',
      'timeline',
    ];

    const missingFields = requiredFields.filter(
      (field) => !customDesign[field],
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Cannot submit incomplete custom design. Missing: ${missingFields.join(', ')}`,
      );
    }
  }

  /**
   * Private helper: Map entity to response DTO
   */
  private mapToResponseDto(
    customDesign: CustomDesign,
  ): CustomDesignResponseDto {
    const estimate = this.calculateEstimate(customDesign);

    return {
      id: customDesign.id,
      userId: customDesign.userId,
      agentId: customDesign.agentId,
      serviceType: customDesign.serviceType,
      selectionMethod: customDesign.selectionMethod,
      serviceContext: customDesign.serviceContext,
      projectType: customDesign.projectType,
      scopeDeliverable: customDesign.scopeDeliverable,
      addons: customDesign.addons || [],
      sizeComplexity: customDesign.sizeComplexity,
      style: customDesign.style,
      budget: customDesign.budget,
      timeline: customDesign.timeline,
      additionalInformation: customDesign.additionalInformation,
      attachedFiles: customDesign.attachedFileIds || [],
      currentStep: customDesign.currentStep,
      status: customDesign.status,
      createdAt: customDesign.createdAt,
      updatedAt: customDesign.updatedAt,
      estimateCost: estimate.estimateCost,
      estimateTimeline: estimate.estimateTimeline,
    };
  }
}
