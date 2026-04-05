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
import { AgentRegistrationStatus } from '../agent/entities/agent.entity';
import { getServiceConfig } from './config/services.config';
import { CustomDesignPayment, CustomDesignPaymentStatus } from './entities/custom-design-payment.entity';
import { SetAgreedPriceDto } from './dto/set-agreed-price.dto';
import { WalletService } from '../wallet/wallet.service';
import { TransactionCategory } from '../wallet/entities/wallet-transaction.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';
import { Admin } from '../admin/entities/admin.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CustomDesignService {
  private readonly PAYSTACK_INIT_URL = 'https://api.paystack.co/transaction/initialize';
  private readonly PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify';

  constructor(
    @InjectRepository(CustomDesign)
    private readonly repo: Repository<CustomDesign>,
    @InjectRepository(CustomDesignPayment)
    private readonly paymentRepo: Repository<CustomDesignPayment>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) { }

  // ---------------------------------------------------------------------------
  // CREATE — Wizard: Step 1 only (initialize a draft)
  // ---------------------------------------------------------------------------

  async initialize(
    userId: string,
    dto: InitializeCustomDesignDto,
    agentId?: string,
  ): Promise<CustomDesignResponseDto> {
    if (agentId) {
      const agent = (await this.repo.manager.findOne('Agent', { where: { id: agentId } })) as any;
      if (agent && agent.registrationStatus !== AgentRegistrationStatus.APPROVED) {
        throw new BadRequestException('The selected agent is not currently approved to accept new projects.');
      }
    }

    dto.serviceType = this.mapCategoryToServiceType(dto.serviceType as any);

    const draft = this.repo.create({
      userId,
      agentId,
      serviceType: dto.serviceType,
      serviceContext: dto.serviceContext,
      selectionMethod: this.mapMethodToSelectionMethod(dto.selectionMethod as any),
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
    contextAgentId?: string,
    files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    // Map serviceType if it's coming as a string title from frontend
    dto.serviceType = this.mapCategoryToServiceType(dto.serviceType as any);

    this.validateSubmissionFields(dto);

    // Prioritize agentId from DTO (the selected pro) over req.agentId (the user's own agent profile)
    const agentId = dto.agentId || contextAgentId;

    // Extract S3 URLs from uploaded files
    const uploadedUrls = this.extractS3Urls(files);
    const combinedFiles = [...(dto.attachedFiles ?? []), ...uploadedUrls];

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
      attachedFiles: combinedFiles,
      selectionMethod: this.mapMethodToSelectionMethod(dto.selectionMethod as any),
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
    files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    const design = await this.getOwnedDesign(id, userId);
    this.assertEditable(design);

    const { step, data } = dto;
    const uploadedUrls = this.extractS3Urls(files);

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
        
        // Merge uploaded files with any provided URLs in data
        const attachedFromData = data.attachedFiles ?? [];
        design.attachedFiles = [...(design.attachedFiles ?? []), ...attachedFromData, ...uploadedUrls];
        
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
    files?: Express.Multer.File[],
  ): Promise<CustomDesignResponseDto> {
    const design = await this.getOwnedDesign(id, userId);
    this.assertEditable(design);

    Object.assign(design, dto);

    if (files && files.length > 0) {
      const uploadedUrls = this.extractS3Urls(files);
      design.attachedFiles = [...(design.attachedFiles ?? []), ...uploadedUrls];
    }

    const saved = await this.repo.save(design);

    if (files && files.length > 0 && design.agentId) {
      const agent = (await this.repo.manager.findOne('Agent', {
        where: { id: design.agentId },
        relations: ['user'],
      })) as any;
      if (agent?.user) {
        await this.notificationService.createNotification(
          agent.user.id,
          NotificationType.CUSTOMDESIGN,
          'New File Uploaded',
          `A new file was uploaded for project "${design.serviceContext}".`,
          { customDesignId: id },
          'projectFileUploaded',
        );
      }
    }

    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // SUBMIT — Finalize an in-progress draft
  // ---------------------------------------------------------------------------

  async submit(
    id: string,
    userId: string,
    dto?: Partial<SubmitCustomDesignDto>,
    files?: Express.Multer.File[],
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
      if (dto.attachedFiles !== undefined) {
        design.attachedFiles = [...(design.attachedFiles ?? []), ...dto.attachedFiles];
      }
    }

    if (files && files.length > 0) {
      const uploadedUrls = this.extractS3Urls(files);
      design.attachedFiles = [...(design.attachedFiles ?? []), ...uploadedUrls];
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

    // Notify Admin
    try {
      const admins = await this.adminRepo.find({ relations: ['user'] });
      for (const admin of admins) {
        if (admin.user) {
          await this.notificationService.createNotification(
            admin.user.id,
            NotificationType.ADMIN,
            'New Custom Design Submission',
            `A new custom design project "${design.serviceContext}" has been submitted.`,
            { customDesignId: id },
            'messagesAdmin',
          );
        }
      }
    } catch (err) {
      console.error('Failed to notify admins of submission:', err);
    }

    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<CustomDesignResponseDto> {
    const design = await this.repo.findOne({
      where: { id },
      relations: ['user', 'agent', 'agent.user', 'payment'],
    });
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

  /**
   * Maps frontend category strings (e.g., "Landscape", "Interior Design")
   * to the backend ServiceType enum.
   */
  mapCategoryToServiceType(category: string): ServiceType {
    const normalized = category?.toLowerCase().replace(/\s/g, '');

    // Check if it's already a valid enum value
    if (Object.values(ServiceType).includes(category as ServiceType)) {
      return category as ServiceType;
    }

    const mapping: Record<string, ServiceType> = {
      landscape: ServiceType.LANDSCAPE_DESIGN,
      landscapedesign: ServiceType.LANDSCAPE_DESIGN,
      interiordesign: ServiceType.INTERIOR_DESIGN,
      interiordesign2: ServiceType.INTERIOR_DESIGN,
      productdesign: ServiceType.PRODUCT_DESIGN,
      '3drendering': ServiceType.RENDERING_3D,
      '3drendering&visualization': ServiceType.RENDERING_3D,
      '2darchitectural': ServiceType.ARCHITECTURAL_2D,
      '2darchitecturaldrawings': ServiceType.ARCHITECTURAL_2D,
      bim: ServiceType.BIM,
      buildinginformationmodeling: ServiceType.BIM,
      'mechanical-electrical': ServiceType.MEP_DRAWINGS,
      mechanicalelectricaldrawings: ServiceType.MEP_DRAWINGS,
      structural: ServiceType.STRUCTURAL_ENGINEERING,
      structuralengineeringdrawings: ServiceType.STRUCTURAL_ENGINEERING,
    };

    const mapped = mapping[normalized];
    if (!mapped) {
      // If no mapping found, return as is (enum validation will catch it if invalid)
      return category as ServiceType;
    }
    return mapped;
  }

  /**
   * Maps frontend method strings (e.g., "ai", "manual")
   * to the backend SelectionMethod enum.
   */
  mapMethodToSelectionMethod(method: string): SelectionMethod {
    if (!method) return SelectionMethod.MANUAL;

    const normalized = method.toLowerCase().replace(/\s/g, '');
    if (normalized === 'ai') return SelectionMethod.AI_ADVICE;
    if (normalized === 'manual' || normalized === 'hireapro') return SelectionMethod.HIRE_PRO;
    if (normalized === 'contest') return SelectionMethod.CONTEST;
    if (normalized === 'fixedquote') return SelectionMethod.FIXED_QUOTE;
    if (normalized === 'template') return SelectionMethod.TEMPLATE;

    // Check if it's already a valid enum value
    if (Object.values(SelectionMethod).includes(method as SelectionMethod)) {
      return method as SelectionMethod;
    }

    return SelectionMethod.MANUAL;
  }

  /**
   * Helper to extract S3 URLs from multer-s3 uploaded files.
   */
  private extractS3Urls(files?: Express.Multer.File[]): string[] {
    if (!files || !Array.isArray(files)) return [];
    return files.map((f: any) => f.location).filter((url) => !!url);
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

    // Notify User
    await this.notificationService.createNotification(
      design.userId,
      NotificationType.CUSTOMDESIGN,
      'Project Approved',
      `Your custom design project "${design.serviceContext}" has been approved.`,
      { customDesignId: id, status: design.status },
      'projectStatusChanged',
    );

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

    // Notify User
    await this.notificationService.createNotification(
      design.userId,
      NotificationType.CUSTOMDESIGN,
      'Project Rejected',
      `Your custom design project "${design.serviceContext}" has been rejected. Reason: ${reason || 'N/A'}`,
      { customDesignId: id, status: design.status },
      'projectStatusChanged',
    );

    return this.toResponse(saved);
  }

  // ---------------------------------------------------------------------------
  // AGENT: Approve / Reject (Assigned Project)
  // ---------------------------------------------------------------------------

  async agentApprove(id: string, userId: string, notes?: string): Promise<CustomDesignResponseDto> {
    const design = await this.repo.findOne({ where: { id } });
    if (!design) throw new NotFoundException('Custom design not found');

    const agent = await this.repo.manager.findOne('Agent', { where: { userId } }) as any;
    if (!agent) throw new ForbiddenException('Only registered agents can perform this action');
    if (design.agentId !== agent.id) throw new ForbiddenException('You are not assigned to this project');

    if (design.status !== CustomDesignStatus.SUBMITTED && design.status !== CustomDesignStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted or under-review designs can be approved');
    }

    design.status = CustomDesignStatus.APPROVED;
    design.reviewNotes = notes;
    design.reviewedAt = new Date();

    const saved = await this.repo.save(design);

    // Notify User
    await this.notificationService.createNotification(
      design.userId,
      NotificationType.CUSTOMDESIGN,
      'Project Accepted by Agent',
      `Your custom design project "${design.serviceContext}" has been accepted by the assigned agent.`,
      { customDesignId: id, status: design.status },
      'projectStatusChanged',
    );

    return this.toResponse(saved);
  }

  async agentReject(id: string, userId: string, reason?: string): Promise<CustomDesignResponseDto> {
    const design = await this.repo.findOne({ where: { id } });
    if (!design) throw new NotFoundException('Custom design not found');

    const agent = await this.repo.manager.findOne('Agent', { where: { userId } }) as any;
    if (!agent) throw new ForbiddenException('Only registered agents can perform this action');
    if (design.agentId !== agent.id) throw new ForbiddenException('You are not assigned to this project');

    if (design.status !== CustomDesignStatus.SUBMITTED && design.status !== CustomDesignStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only submitted or under-review designs can be rejected');
    }

    design.status = CustomDesignStatus.REJECTED;
    design.reviewNotes = reason;
    design.reviewedAt = new Date();

    const saved = await this.repo.save(design);

    // Notify User
    await this.notificationService.createNotification(
      design.userId,
      NotificationType.CUSTOMDESIGN,
      'Project Declined by Agent',
      `Your custom design project "${design.serviceContext}" has been declined by the assigned agent. Reason: ${reason || 'N/A'}`,
      { customDesignId: id, status: design.status },
      'projectStatusChanged',
    );

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
      .leftJoinAndSelect('cd.user', 'user')
      .leftJoinAndSelect('cd.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .leftJoinAndSelect('cd.payment', 'payment')
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
      user: design.user,
      agentId: design.agentId,
      agent: design.agent,
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
      payment: design.payment,
      createdAt: design.createdAt,
      updatedAt: design.updatedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // PAYMENT FLOW
  // ---------------------------------------------------------------------------

  async setAgreedPrice(id: string, userId: string, dto: SetAgreedPriceDto) {
    const design = await this.getOwnedDesign(id, userId);

    if (design.status !== CustomDesignStatus.APPROVED) {
      throw new BadRequestException('Can only set agreed price for approved designs');
    }

    if (!design.agentId) {
      throw new BadRequestException('No agent assigned to this custom design');
    }

    let payment = await this.paymentRepo.findOne({ where: { customDesignId: id } });
    if (payment && payment.status === CustomDesignPaymentStatus.PAID) {
      throw new BadRequestException('This design has already been paid for');
    }

    if (!payment) {
      payment = this.paymentRepo.create({
        customDesignId: id,
        userId,
        agreedPrice: dto.price,
        status: CustomDesignPaymentStatus.PENDING_AGREEMENT,
      });
    } else {
      payment.agreedPrice = dto.price;
      payment.status = CustomDesignPaymentStatus.PENDING_AGREEMENT;
      payment.isConfirmedByAgent = false;
    }

    await this.paymentRepo.save(payment);

    // Notify Agent
    const agent = await this.repo.manager.findOne('Agent', {
      where: { id: design.agentId },
      relations: ['user']
    }) as any;

    if (agent?.user) {
      await this.notificationService.createNotification(
        agent.user.id,
        NotificationType.AGENT_MESSAGE,
        'Price Agreement Requested',
        `User has set an agreed price of ₦${dto.price} for a custom design project. Please confirm.`,
        { customDesignId: id, price: dto.price },
        'messagesAgent',
      );
    }

    // Notify Admin
    const admins = await this.adminRepo.find({ relations: ['user'] });
    for (const admin of admins) {
      if (admin.user) {
        await this.notificationService.createNotification(
          admin.user.id,
          NotificationType.WALLET,
          'Price Agreement Update',
          `An agreed price of ₦${dto.price} has been set for a custom design project.`,
          { customDesignId: id, price: dto.price }
        );
      }
    }

    return { message: 'Agreed price set. Waiting for agent confirmation.', payment };
  }

  async confirmAgreedPrice(id: string, agentUserId: string) {
    const design = await this.repo.findOne({ where: { id }, relations: ['agent', 'agent.user'] });
    if (!design) throw new NotFoundException('Custom design not found');

    if (design.agent?.userId !== agentUserId) {
      throw new ForbiddenException('Only the assigned agent can confirm the price');
    }

    if (design.agent?.registrationStatus !== AgentRegistrationStatus.APPROVED) {
      throw new ForbiddenException('Your agent account is not currently approved to perform this action.');
    }

    const payment = await this.paymentRepo.findOne({ where: { customDesignId: id } });
    if (!payment) throw new NotFoundException('Price hasn\'t been set by the user yet');

    payment.isConfirmedByAgent = true;
    payment.status = CustomDesignPaymentStatus.AWAITING_PAYMENT;
    await this.paymentRepo.save(payment);

    // Notify User
    await this.notificationService.createNotification(
      design.userId,
      NotificationType.CUSTOMDESIGNPAYMENT,
      'Price Agreement Confirmed',
      `The agent has confirmed the agreed price of ₦${payment.agreedPrice}. You can now proceed to payment.`,
      { customDesignId: id, price: payment.agreedPrice },
      'paymentOrderConfirmation',
    );

    return { message: 'Price confirmed. User can now pay.', payment };
  }

  async initializePayment(id: string, userId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { customDesignId: id, userId },
      relations: ['user']
    });

    if (!payment) throw new NotFoundException('Payment record not found');
    if (!payment.isConfirmedByAgent) {
      throw new BadRequestException('Agent has not confirmed the agreed price yet');
    }
    if (payment.status === CustomDesignPaymentStatus.PAID) {
      throw new BadRequestException('This design is already paid');
    }

    const amountInKobo = Math.round(Number(payment.agreedPrice) * 100);
    const callbackUrl = this.configService.get<string>('PAYSTACK_CALLBACK_URL') || 'http://localhost:3000/custom-design/verify-payment';

    try {
      const response = await axios.post(
        this.PAYSTACK_INIT_URL,
        {
          email: payment.user.email,
          amount: amountInKobo,
          callback_url: callbackUrl,
          metadata: {
            customDesignId: id,
            paymentId: payment.id,
            type: 'custom_design_payment'
          }
        },
        {
          headers: { Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}` }
        }
      );

      payment.paystackData = response.data.data;
      await this.paymentRepo.save(payment);

      return response.data.data;
    } catch (error) {
      throw new BadRequestException('Failed to initialize Paystack payment: ' + (error.response?.data?.message || error.message));
    }
  }

  async verifyPayment(reference: string) {
    try {
      const response = await axios.get(`${this.PAYSTACK_VERIFY_URL}/${reference}`, {
        headers: { Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}` },
      });

      const data = response.data.data;
      if (data.status !== 'success') throw new BadRequestException('Payment verification failed.');

      const paymentRecord = await this.paymentRepo.createQueryBuilder('p')
        .leftJoinAndSelect('p.customDesign', 'cd')
        .leftJoinAndSelect('cd.agent', 'agent')
        .leftJoinAndSelect('agent.user', 'user')
        .where(`p.paystackData->>'reference' = :reference`, { reference })
        .getOne();

      if (!paymentRecord) throw new BadRequestException(`Payment with reference ${reference} not found.`);
      if (paymentRecord.status === CustomDesignPaymentStatus.PAID) return { message: 'Already verified', payment: paymentRecord };

      const amountPaid = data.amount / 100;
      paymentRecord.status = CustomDesignPaymentStatus.PAID;
      paymentRecord.amountPaid = amountPaid;
      paymentRecord.paidAt = new Date();
      await this.paymentRepo.save(paymentRecord);

      // 10% commission logic
      if (paymentRecord.customDesign?.agentId) {
        const agentShare = amountPaid * 0.90;
        const description = `Custom Design Completion: ${paymentRecord.customDesign.serviceContext}`;

        await this.walletService.creditWallet(
          paymentRecord.customDesign.agentId,
          agentShare,
          description,
          TransactionCategory.CUSTOM_DESIGN
        );
      }

      paymentRecord.customDesign.status = CustomDesignStatus.COMPLETED;
      await this.repo.save(paymentRecord.customDesign);

      // Notify User
      await this.notificationService.createNotification(
        paymentRecord.userId,
        NotificationType.CUSTOMDESIGNPAYMENT,
        'Payment Successful',
        `Your payment of ₦${amountPaid} for custom design "${paymentRecord.customDesign.serviceContext}" was successful.`,
        { customDesignId: paymentRecord.customDesignId },
        'paymentSuccessful',
      );

      // Notify Agent
      if (paymentRecord.customDesign.agentId && paymentRecord.customDesign.agent?.user) {
        await this.notificationService.createNotification(
          paymentRecord.customDesign.agent.user.id,
          NotificationType.AGENT_MESSAGE,
          'New Payment Received',
          `You have received a payment for project "${paymentRecord.customDesign.serviceContext}".`,
          { customDesignId: paymentRecord.customDesignId },
          'messagesAgent',
        );
      }

      return {
        message: 'Payment verified and agent credited',
        payment: paymentRecord
      };
    } catch (error) {
      throw new BadRequestException('Verification failed: ' + error.message);
    }
  }
}
