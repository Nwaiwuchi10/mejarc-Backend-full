import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { CustomDesignWorkspaceService } from './customdesign-workspace.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from 'src/utils/aws-s3.config';

@Controller('custom-design')
@UseGuards(UserAuthGuard)
export class CustomDesignWorkspaceController {
  constructor(private readonly workspaceService: CustomDesignWorkspaceService) {}

  @Get(':id/workspace')
  async getWorkspace(@Request() req, @Param('id') id: string) {
    return this.workspaceService.getWorkspace(req.userId, id);
  }

  @Post(':id/milestones')
  async addMilestone(
    @Request() req,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.workspaceService.addMilestone(req.userId, id, data);
  }

  @Patch('milestones/:mId')
  async updateMilestone(
    @Request() req,
    @Param('mId') mId: string,
    @Body() data: any,
  ) {
    return this.workspaceService.updateMilestone(req.userId, mId, data);
  }

  @Post(':id/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createS3Storage('project-deliverables'),
    }),
  )
  async uploadFile(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('isDeliverable') isDeliverable: string,
  ) {
    const fileUrl = (file as any).location;
    return this.workspaceService.uploadFile(req.userId, id, {
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype.split('/')[1]?.toUpperCase(),
      isDeliverable: isDeliverable === 'true',
    });
  }

  @Get(':id/activities')
  async getActivities(
    @Request() req,
    @Param('id') id: string,
    @Query('type') type?: string,
  ) {
    // Ensure access first
    await this.workspaceService.validateAccessAndGetDesign(req.userId, id);
    
    // In a real app, you'd add filtering logic in the service, 
    // but for now we'll fetch all and the frontend can filter, 
    // or we can add a quick filter here.
    return this.workspaceService.getWorkspace(req.userId, id).then(w => {
        if (!type || type === 'all') return w.activityLog;
        return w.activityLog.filter(a => a.type === type);
    });
  }
}
