import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
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
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from '../utils/aws-s3.config';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a contact / support inquiry',
    description: 'Submit contact message with optional file/image attachments',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        phone: { type: 'string', example: '+2348012345678' },
        subject: { type: 'string', example: 'General Inquiry' },
        message: {
          type: 'string',
          example: 'Hello, I have a question about your architectural plans.',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Optional image attachments (max 10, up to 10MB each)',
        },
      },
      required: ['name', 'email', 'phone', 'message'],
    },
  })
  @ApiResponse({ status: 201, description: 'Inquiry submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / validation error' })
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: createS3Storage('contact-inquiries'),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  create(
    @Body() createContactDto: CreateContactDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const images = files?.map((f: any) => f.location) || [];
    return this.contactService.create({ ...createContactDto, images });
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all contact inquiries',
    description: 'Retrieve all submitted contact inquiries (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of inquiries retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.contactService.findAll();
  }
}
