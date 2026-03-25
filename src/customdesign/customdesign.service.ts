/**
 * Custom Design Service
 * Business logic for custom design submissions — aligned with the 6-step
 * frontend wizard and the flat state shape:
 *   { serviceContext, projectType, scopeDeliverables[], sizeComplexity,
 *     style, budget, timeline, attachedFiles[] }
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
  InitializeCustomDesignDto,
  SaveStepDto,
  SubmitCustomDesignDto,
  UpdateCustomDesignDto,
  ListCustomDesignsQueryDto,
  CustomDesignResponseDto,
} from './dto/customdesign.dto';
import { ServiceType, CustomDesignStatus, SelectionMethod } from './customdesign.types';
import { getServiceConfig } from './config/services.config';

@Injectable()
export class CustomDesignService {
  constructor(
    @InjectRepository(CustomDesign)
    private readonly repo: Repository<CustomDesign>,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE — Wizard: Step 1 only (initialize a draft)
  // ---------------------------------------------------------------------------

  async initialize(
    userId: string,
    dto: InitializeCustomDesignDto,
    agentId?: string,
  ): Promise<CustomDesignResponseDto> {
    const draft = this.repo.create({
      userId,
      agentId,
      serviceType: dto.serviceType,
      serviceContext: dto.serviceContext,
      selectionMethod: dto.selectionMethod ?? SelectionMethod.MANUAL,
      currentStep: 1,
      status: CustomDesignStatus.IN_PROGRESS,
      isSubmitted: false,
      scopeDeliverables: [],
      attachedFiles: [],
    });

    const saved = await this.repo.save(draft);
    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // CREATE — One-shot: all 6 steps at once and submit immediately
  // ---------------------------------------------------------------------------

  async createAndSubmit(
    userId: string,
    dto: SubmitCustomDesignDto,
    agentId?: string,
  ): Promise<CustomDesignResponseDto> {
    this.validateSubmissionFields(dto);

    const design = this.repo.create({
      userId,
      agentId,
      serviceType: dto.serviceType,
      serviceContext: dto.serviceContext,
      projectType: dto.projectType,
      scopeDeliverables: dto.scopeDeliverables ?? [],
      sizeComplexity: dto.sizeComplexity,
      style: dto.style,
      budget: dto.budget,
      timeline: dto.timeline,
      additionalInformation: dto.additionalInformation,
      attachedFiles: dto.attachedFiles ?? [],
      selectionMethod: dto.selectionMethod ?? SelectionMethod.MANUAL,
      currentStep: 6,
      status: CustomDesignStatus.SUBMITTED,
      isSubmitted: true,
      submittedAt: new Date(),
    });

    // Attach computed estimate
    const estimate = this.computeEstimate(design);
    design.estimateCost = estimate.estimateCost;
    design.estimateTimeline = estimate.estimateTimeline;

    const saved = await this.repo.save(design);
    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // UPDATE — Save a single step mid-wizard
  // ---------------------------------------------------------------------------

  async saveStep(
    id: string,
    userId: string,
    dto: SaveStepDto,
  ): Promise<CustomDesignResponseDto> {
    const design = await this.getOwnedDesign(id, userId);
    this.assertEditable(design);

    const { step, data } = dto;

    switch (step) {
      case 1:
        if (data.serviceType) design.serviceType = data.serviceType;
        if (data.serviceContext) design.serviceContext = data.serviceContext;
        break;
      case 2:
        if (data.projectType !== undefined) design.projectType = data.projectType;
        design.currentStep = Math.max(design.currentStep, 2);
        break;
      case 3:
        if (data.scopeDeliverables !== undefined)
          design.scopeDeliverables = data.scopeDeliverables;
        design.currentStep = Math.max(design.currentStep, 3);
        break;
      case 4:
        if (data.sizeComplexity !== undefined) design.sizeComplexity = data.sizeComplexity;
        design.currentStep = Math.max(design.currentStep, 4);
        break;
      case 5:
        if (data.style !== undefined) design.style = data.style;
        design.currentStep = Math.max(design.currentStep, 5);
        break;
      case 6:
        if (data.budget !== undefined) design.budget = Number(data.budget);
        if (data.timeline !== undefined) design.timeline = data.timeline;
        if (data.additionalInformation !== undefined)
          design.additionalInformation = data.additionalInformation;
        if (data.attachedFiles !== undefined) design.attachedFiles = data.attachedFiles;
        design.currentStep = 6;
        break;
      default:
        throw new BadRequestException(`Invalid step: ${step}. Must be 1–6.`);
    }

    const saved = await this.repo.save(design);
    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // UPDATE — General partial update (any fields, pre-submission)
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    userId: string,
    dto: UpdateCustomDesignDto,
  ): Promise<CustomDesignResponseDto> {
    const design = await this.getOwnedDesign(id, userId);
    this.assertEditable(design);

    Object.assign(design, dto);

    const saved = await this.repo.save(design);
    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // SUBMIT — Finalize an in-progress draft
  // ---------------------------------------------------------------------------

  async submit(
    id: string,
    userId: string,
    dto?: Partial<SubmitCustomDesignDto>,
  ): Promise<CustomDesignResponseDto> {
    const design = await this.getOwnedDesign(id, userId);

    if (design.status === CustomDesignStatus.SUBMITTED) {
      throw new BadRequestException('Custom design has already been submitted.');
    }
    if (design.status === CustomDesignStatus.COMPLETED) {
      throw new BadRequestException('Cannot re-submit a completed custom design.');
    }

    // Allow final-step data to be sent alongside the submit call
    if (dto) {
      if (dto.budget !== undefined) design.budget = Number(dto.budget);
      if (dto.timeline !== undefined) design.timeline = dto.timeline;
      if (dto.additionalInformation !== undefined)
        design.additionalInformation = dto.additionalInformation;
      if (dto.attachedFiles !== undefined) design.attachedFiles = dto.attachedFiles;
    }

    // Validate all required fields are present
    this.validateSubmissionFields(design);

    // Compute and attach estimate
    const estimate = this.computeEstimate(design);
    design.estimateCost = estimate.estimateCost;
    design.estimateTimeline = estimate.estimateTimeline;

    design.status = CustomDesignStatus.SUBMITTED;
    design.isSubmitted = true;
    design.submittedAt = new Date();
    design.currentStep = 6;

    const saved = await this.repo.save(design);
    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<CustomDesignResponseDto> {
    const design = await this.repo.findOne({ where: { id }, relations: ['user', 'agent'] });
    if (!design) throw new NotFoundException('Custom design not found');
    return this.toResponse(design);
  }

  async findMyDesigns(
    userId: string,
    query: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number; page: number; limit: number }> {
    return this.paginatedQuery({ userId }, query);
  }

  async findByAgent(
    agentId: string,
    query: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number; page: number; limit: number }> {
    return this.paginatedQuery({ agentId }, query);
  }

  async findByUser(
    userId: string,
    query: ListCustomDesignsQueryDto,
  ): Promise<{ data: CustomDesignResponseDto[]; total: number; page: number; limit: number }> {
    return this.paginatedQuery({ userId }, query);
  }

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  async delete(id: string, userId: string): Promise<void> {
    const design = await this.getOwnedDesign(id, userId);
    if (design.isSubmitted) {
      throw new BadRequestException('Cannot delete a submitted custom design.');
    }
    await this.repo.remove(design);
  }

  // ---------------------------------------------------------------------------
  // SERVICE CONFIG
  // ---------------------------------------------------------------------------

  getServiceConfig(serviceType: ServiceType) {
    return getServiceConfig(serviceType);
  }

  // ---------------------------------------------------------------------------
  // VALIDATION (server-side option validation against service config)
  // ---------------------------------------------------------------------------

  async validateStepData(
    serviceType: ServiceType,
    step: number,
    data: Record<string, any>,
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const config = getServiceConfig(serviceType);
    const errors: string[] = [];

    switch (step) {
      case 1: {
        const valid = config.contexts.find((c) => c.title === data.serviceContext);
        if (!valid) errors.push('Invalid service context selection');
        break;
      }
      case 2: {
        const valid = config.projectTypes.find((p) => p.title === data.projectType);
        if (!valid) errors.push('Invalid project type selection');
        break;
      }
      case 3: {
        const deliverables: string[] = data.scopeDeliverables ?? [];
        if (deliverables.length === 0) {
          errors.push('At least one scope deliverable must be selected');
          break;
        }
        // First element should be a base package
        const baseValid = config.scopes.find((s) => s.title === deliverables[0]);
        if (!baseValid) errors.push(`Invalid scope package: "${deliverables[0]}"`);
        // Remaining elements should be valid addons
        for (const addon of deliverables.slice(1)) {
          const addonValid = config.addons.find((a) => a.title === addon);
          if (!addonValid) errors.push(`Invalid addon: "${addon}"`);
        }
        break;
      }
      case 4: {
        const valid = config.sizes.find((s) => s.title === data.sizeComplexity);
        if (!valid) errors.push('Invalid size/complexity selection');
        break;
      }
      case 5: {
        const valid = config.styles.find((s) => s.title === data.style);
        if (!valid) errors.push('Invalid style selection');
        break;
      }
      case 6: {
        const budget = Number(data.budget);
        if (!budget || budget < config.minimumBudget) {
          errors.push(
            `Minimum budget is ${config.currency}${config.minimumBudget.toLocaleString()}`,
          );
        }
        if (!data.timeline || String(data.timeline).trim() === '') {
          errors.push('Timeline is required');
        }
        break;
      }
      default:
        errors.push('Invalid step number');
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  // ---------------------------------------------------------------------------
  // ADMIN: Approve / Reject
  // ---------------------------------------------------------------------------

  async approve(id: string, notes?: string): Promise<CustomDesignResponseDto> {
    const design = await this.repo.findOne({ where: { id } });
    if (!design) throw new NotFoundException('Custom design not found');

    if (design.status !== CustomDesignStatus.SUBMITTED && design.status !== CustomDesignStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted or under-review designs can be approved');
    }

    design.status = CustomDesignStatus.APPROVED;
    design.reviewNotes = notes;
    design.reviewedAt = new Date();

    const saved = await this.repo.save(design);
    return this.toResponse(saved);
  }

  async reject(id: string, reason?: string): Promise<CustomDesignResponseDto> {
    const design = await this.repo.findOne({ where: { id } });
    if (!design) throw new NotFoundException('Custom design not found');

    if (design.status !== CustomDesignStatus.SUBMITTED && design.status !== CustomDesignStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted or under-review designs can be rejected');
    }

    design.status = CustomDesignStatus.REJECTED;
    design.reviewNotes = reason;
    design.reviewedAt = new Date();

    const saved = await this.repo.save(design);
    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async getOwnedDesign(id: string, userId: string): Promise<CustomDesign> {
    const design = await this.repo.findOne({ where: { id } });
    if (!design) throw new NotFoundException('Custom design not found');
    if (design.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this custom design');
    }
    return design;
  }

  private assertEditable(design: CustomDesign): void {
    if (
      design.status === CustomDesignStatus.SUBMITTED ||
      design.status === CustomDesignStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot modify a submitted or completed custom design',
      );
    }
  }

  private validateSubmissionFields(
    design: Partial<CustomDesign> | Partial<SubmitCustomDesignDto>,
  ): void {
    const required: string[] = [
      'serviceType',
      'serviceContext',
      'projectType',
      'sizeComplexity',
      'style',
      'budget',
      'timeline',
    ];

    const missing = required.filter((f) => !design[f]);

    // Also verify at least one scope deliverable selected
    const deliverables = (design as any).scopeDeliverables;
    if (!deliverables || deliverables.length === 0) {
      missing.push('scopeDeliverables');
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot submit incomplete custom design. Missing fields: ${missing.join(', ')}`,
      );
    }
  }

  /** Estimate cost based on service config minimumBudget × scope × size multipliers */
  computeEstimate(design: Partial<CustomDesign>): {
    estimateCost: number;
    estimateTimeline: string;
  } {
    if (!design.serviceType) {
      return { estimateCost: 0, estimateTimeline: design.timeline ?? 'TBD' };
    }
    let config: ReturnType<typeof getServiceConfig>;
    try {
      config = getServiceConfig(design.serviceType);
    } catch {
      return { estimateCost: 0, estimateTimeline: design.timeline ?? 'TBD' };
    }

    let cost = config.minimumBudget;

    // Scope multipliers — keyed by exact scope package titles across all services
    const scopeMultipliers: Record<string, number> = {
      // Common (Landscape, Interior, MEP, Structural)
      'Basic Package': 1.0,
      'Intermediate Package': 1.5,
      'Advanced Package': 2.0,
      // 2D Architectural
      'Standard Package': 1.4,
      'Complete Package': 2.0,
      // 3D Rendering
      'Standard Rendering': 1.0,
      'Multi-Perspective Package': 1.6,
      'Full Experience Package': 2.4,
      // BIM (LOD-based)
      'Basic Package – LOD 200': 1.0,
      'Intermediate Package – LOD 300': 1.6,
      'Advanced Package – LOD 400/500': 2.5,
    };

    const deliverables = design.scopeDeliverables ?? [];
    const basePackage = deliverables[0] ?? '';
    const scopeMult = scopeMultipliers[basePackage] ?? 1.0;
    cost = Math.ceil(cost * scopeMult);

    // Addon premium: +12% each
    const addons = deliverables.slice(1);
    if (addons.length > 0) {
      cost = Math.ceil(cost * (1 + addons.length * 0.12));
    }

    // Size multipliers
    const sizeMultipliers: Record<string, number> = {
      // Landscape
      'Small (under 200 sqm)': 0.8,
      'Medium (200-1000 sqm)': 1.0,
      'Large (1000 sqm and above)': 1.5,
      // Interior
      'Single Room': 0.7,
      'Full Apartment': 1.0,
      'Multi-Floor or Complex Space': 1.5,
      // 3D Rendering
      'Single Image': 0.7,
      '3-5 Images': 1.0,
      '6+ Images / Animation': 1.6,
      // 2D Architectural
      'Small (1-2 floors)': 0.8,
      'Medium (3-5 floors)': 1.0,
      'Large (6+ floors or complex)': 1.5,
      // BIM
      'Single Dwelling': 0.8,
      'Multi-Unit Building': 1.2,
      'High-Rise / Complex Facility': 1.8,
      // Structural
      'Small': 0.8,
      'Medium': 1.0,
      'Large': 1.5,
    };

    const sizeMult = sizeMultipliers[design.sizeComplexity ?? ''] ?? 1.0;
    cost = Math.ceil(cost * sizeMult);

    return {
      estimateCost: cost,
      estimateTimeline: design.timeline ?? 'Based on selection',
    };
  }

  private async paginatedQuery(
    where: Record<string, any>,
    query: ListCustomDesignsQueryDto,
  ) {
    const { page = 1, limit = 10, serviceType, status } = query;

    const qb = this.repo.createQueryBuilder('cd');
    Object.entries(where).forEach(([key, val]) => {
      if (val !== undefined) qb.andWhere(`cd.${key} = :${key}`, { [key]: val });
    });

    if (serviceType) qb.andWhere('cd.serviceType = :serviceType', { serviceType });
    if (status) qb.andWhere('cd.status = :status', { status });

    const total = await qb.getCount();
    const data = await qb
      .orderBy('cd.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data: data.map((d) => this.toResponse(d)), total, page, limit };
  }

  /** Map entity → response DTO */
  private toResponse(design: CustomDesign): CustomDesignResponseDto {
    return {
      id: design.id,
      userId: design.userId,
      agentId: design.agentId,
      serviceType: design.serviceType,
      selectionMethod: design.selectionMethod ?? SelectionMethod.MANUAL,
      serviceContext: design.serviceContext,
      projectType: design.projectType,
      scopeDeliverables: design.scopeDeliverables ?? [],
      sizeComplexity: design.sizeComplexity,
      style: design.style,
      budget: design.budget ? Number(design.budget) : undefined,
      timeline: design.timeline,
      additionalInformation: design.additionalInformation,
      attachedFiles: design.attachedFiles ?? [],
      currentStep: design.currentStep,
      status: design.status,
      isSubmitted: design.isSubmitted,
      submittedAt: design.submittedAt,
      estimateCost: design.estimateCost ? Number(design.estimateCost) : undefined,
      estimateTimeline: design.estimateTimeline,
      estimateNotes: design.estimateNotes,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
    };
  }
}
