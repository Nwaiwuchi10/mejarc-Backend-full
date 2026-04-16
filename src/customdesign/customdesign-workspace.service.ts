import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomDesign } from './entities/customdesign.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectActivity } from './entities/project-activity.entity';
import { ProjectFile } from './entities/project-file.entity';
import { Agent } from '../agent/entities/agent.entity';
import { Admin } from '../admin/entities/admin.entity';
import { CustomDesignStatus, MilestoneStatus, ActivityType } from './customdesign.types';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

@Injectable()
export class CustomDesignWorkspaceService {
  constructor(
    @InjectRepository(CustomDesign)
    private readonly designRepo: Repository<CustomDesign>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectActivity)
    private readonly activityRepo: Repository<ProjectActivity>,
    @InjectRepository(ProjectFile)
    private readonly fileRepo: Repository<ProjectFile>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Fetches all workspace data for a project.
   */
  async getWorkspace(userId: string, designId: string) {
    const design = await this.validateAccessAndGetDesign(userId, designId);

    const [milestones, files, activities] = await Promise.all([
      this.milestoneRepo.find({ where: { customDesignId: designId }, order: { dueDate: 'ASC' } }),
      this.fileRepo.find({ where: { customDesignId: designId }, order: { createdAt: 'DESC' } }),
      this.activityRepo.find({ where: { customDesignId: designId }, order: { createdAt: 'DESC' } }),
    ]);

    return {
      projectBrief: design,
      milestones,
      filesDeliverables: files,
      activityLog: activities,
    };
  }

  /**
   * Adds a new milestone to the project.
   */
  async addMilestone(userId: string, designId: string, data: any) {
    const design = await this.validateAccessAndGetDesign(userId, designId, true);

    const milestone = this.milestoneRepo.create({
      customDesignId: designId,
      title: data.title,
      description: data.description,
      duration: data.duration,
      dueDate: data.dueDate,
      status: data.status || MilestoneStatus.PENDING,
    });

    const saved = await this.milestoneRepo.save(milestone);

    await this.logActivity(
      designId,
      userId,
      ActivityType.MILESTONE,
      `New milestone created: ${saved.title}`,
      saved.description,
    );

    return saved;
  }

  /**
   * Updates an existing milestone status.
   */
  async updateMilestone(userId: string, milestoneId: string, data: any) {
    const milestone = await this.milestoneRepo.findOne({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const design = await this.validateAccessAndGetDesign(userId, milestone.customDesignId, true);

    Object.assign(milestone, data);
    const saved = await this.milestoneRepo.save(milestone);

    if (data.status) {
      await this.logActivity(
        design.id,
        userId,
        data.status === MilestoneStatus.COMPLETED ? ActivityType.COMPLETED : ActivityType.MILESTONE,
        `Milestone "${saved.title}" updated to ${saved.status}`,
      );
    }

    return saved;
  }

  /**
   * Logs a project file (deliverable).
   */
  async uploadFile(userId: string, designId: string, fileData: { fileName: string; fileUrl: string; fileType?: string; isDeliverable?: boolean }) {
    const design = await this.validateAccessAndGetDesign(userId, designId);

    const file = this.fileRepo.create({
      customDesignId: designId,
      uploadedById: userId,
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      fileType: fileData.fileType,
      isDeliverable: fileData.isDeliverable ?? false,
    });

    const saved = await this.fileRepo.save(file);

    await this.logActivity(
      designId,
      userId,
      ActivityType.UPLOAD,
      `File uploaded: ${saved.fileName}`,
      saved.fileUrl,
      { fileId: saved.id },
    );

    return saved;
  }

  /**
   * Internal helper to record activities.
   */
  async logActivity(designId: string, userId: string, type: ActivityType, title: string, description?: string, metadata?: any) {
    const activity = this.activityRepo.create({
      customDesignId: designId,
      userId,
      type,
      title,
      description,
      metadata,
    });
    return this.activityRepo.save(activity);
  }

  /**
   * Validates if a user has access to the project workspace.
   * Access rules:
   * 1. Project Owner (Client) - Always has access once submitted.
   * 2. Assigned Agent - Has access IF the project is APPROVED/ACCEPTED by them.
   * 3. Admin - Always has access to oversee.
   */
  async validateAccessAndGetDesign(userId: string, designId: string, requiresWrite: boolean = false): Promise<CustomDesign> {
    const design = await this.designRepo.findOne({
      where: { id: designId },
      relations: ['user', 'agent', 'agent.user'],
    });

    if (!design) throw new NotFoundException('Project not found');

    // 1. Admin Access
    const admin = await this.adminRepo.findOne({ where: { userId } });
    if (admin) return design;

    // 2. Client Access
    if (design.userId === userId) {
      if (requiresWrite) throw new ForbiddenException('Only agents or admins can modify project progress');
      return design;
    }

    // 3. Agent Access
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (agent && design.agentId === agent.id) {
      // Check if project is in a state that allows agent access
      const allowedStatuses = [
        CustomDesignStatus.APPROVED,
        CustomDesignStatus.COMPLETED,
        CustomDesignStatus.REVISION,
      ];
      if (!allowedStatuses.includes(design.status)) {
        throw new ForbiddenException('Access denied. You must accept the project first.');
      }
      return design;
    }

    throw new ForbiddenException('You do not have permission to access this workspace');
  }
}
