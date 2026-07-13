import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInquiry } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private brevoClient: SibApiV3Sdk.TransactionalEmailsApi;

  constructor(
    @InjectRepository(ContactInquiry)
    private readonly contactRepo: Repository<ContactInquiry>,
  ) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    this.brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async create(dto: CreateContactDto) {
    const inquiry = this.contactRepo.create(dto);
    const saved = await this.contactRepo.save(inquiry);

    // Send email to admin (mejehaarc@gmail.com)
    try {
      const mailOptions = {
        sender: {
          name: 'Mejarc Contact Form',
          email: process.env.MAIL_FROM || 'no-reply@mejarc.com',
        },
        to: [
          {
            email: 'mejehaarc@gmail.com',
            name: 'Mejarc Admin',
          },
        ],
        subject: `📩 New Contact Inquiry from ${saved.name}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #FFC700;">New Contact Inquiry Received</h2>
            <p><strong>Name:</strong> ${saved.name}</p>
            <p><strong>Email:</strong> ${saved.email}</p>
            <p><strong>Phone:</strong> ${saved.phone}</p>
            <p><strong>Subject:</strong> ${saved.subject || 'N/A'}</p>
            <hr style="border: 0; border-top: 1px border #ccc; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #FFC700;">${saved.message}</p>
          </div>
        `,
      };

      await this.brevoClient.sendTransacEmail(mailOptions);
    } catch (err) {
      this.logger.error('Failed to send contact email notification to admin', err);
    }

    return saved;
  }

  async findAll() {
    return this.contactRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
