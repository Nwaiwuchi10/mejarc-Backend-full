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
import { CustomDesignWorkspaceService } from './customdesign-workspace.service';
import { UserAuthGuard } from '../user/guard/user.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from 'src/utils/aws-s3.config';

@ApiTags('Custom Design Workspace')
@Controller('custom-design')
@UseGuards(UserAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CustomDesignWorkspaceController {
  constructor(
    private readonly workspaceService: CustomDesignWorkspaceService,
  ) {}

  @Get(':id/workspace')
  @ApiOperation({
    summary: 'Get workspace overview, milestones, files, and activity logs',
  })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiResponse({ status: 200, description: 'Workspace data' })
  async getWorkspace(@Request() req, @Param('id') id: string) {
    return this.workspaceService.getWorkspace(req.userId, id);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: 'Create a milestone for the custom design project' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Schematic Design & Floor Plans' },
        description: {
          type: 'string',
          example: 'Initial architectural drawings and layouts',
        },
        dueDate: { type: 'string', format: 'date-time' },
        amount: { type: 'number', example: 50000 },
      },
      required: ['title'],
    },
  })
  @ApiResponse({ status: 201, description: 'Milestone created' })
  async addMilestone(
    @Request() req,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.workspaceService.addMilestone(req.userId, id, data);
  }

  @Patch('milestones/:mId')
  @ApiOperation({ summary: 'Update milestone status / progress' })
  @ApiParam({ name: 'mId', description: 'Milestone UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        status: { type: 'string', example: 'COMPLETED' },
        progress: { type: 'number', example: 100 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Milestone updated' })
  async updateMilestone(
    @Request() req,
    @Param('mId') mId: string,
    @Body() data: any,
  ) {
    return this.workspaceService.updateMilestone(req.userId, mId, data);
  }

  @Post(':id/files')
  @ApiOperation({
    summary: 'Upload a deliverable or project attachment to workspace',
  })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Project deliverable or CAD/PDF file',
        },
        isDeliverable: {
          type: 'string',
          example: 'true',
          description:
            'Boolean flag string indicating if file is a final deliverable',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
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
  @ApiOperation({ summary: 'Get activity logs for the project workspace' })
  @ApiParam({ name: 'id', description: 'Custom Design ID UUID' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter activity type (or "all")',
  })
  @ApiResponse({ status: 200, description: 'Workspace activity logs' })
  async getActivities(
    @Request() req,
    @Param('id') id: string,
    @Query('type') type?: string,
  ) {
    await this.workspaceService.validateAccessAndGetDesign(req.userId, id);
    return this.workspaceService.getWorkspace(req.userId, id).then((w) => {
      if (!type || type === 'all') return w.activityLog;
      return w.activityLog.filter((a) => a.type === type);
    });
  }
}
