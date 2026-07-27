import { Controller, Get, Post, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from '../utils/aws-s3.config';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
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

  @UseGuards(AdminAuthGuard)
  @Get()
  findAll() {
    return this.contactService.findAll();
  }
}
