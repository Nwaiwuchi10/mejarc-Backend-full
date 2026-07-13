import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  findAll() {
    return this.contactService.findAll();
  }
}
