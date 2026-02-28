import * as nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { User } from '../../user/entities/user.entity';

dotenv.config();

@Injectable()
export class MarketProductMailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MarketProductMailService.name);

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: process.env.MAIL_SERVICE,
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }

    async sendProductSubmittedNotification(agentUser: User, product: any) {
        try {
            const mailOptions = {
                from: `"Marketplace Team" <${process.env.MAIL_USER}>`,
                to: agentUser.email,
                subject: `📦 Product Listing Submitted: ${product.title}`,
                html: this.buildTemplate({
                    title: `Product Submitted for Review`,
                    subtitle: `Your product "${product.title}" has been successfully uploaded and is awaiting admin approval.`,
                    user: agentUser,
                    footerNote: 'We will notify you once your product is approved and live on the marketplace.',
                }),
            };

            await this.transporter.sendMail(mailOptions);
        } catch (err) {
            this.logger.warn(
                'Failed to send product submitted notification',
                err?.toString(),
            );
        }
    }

    private buildTemplate({
        title,
        subtitle,
        user,
        footerNote,
    }: {
        title: string;
        subtitle: string;
        user: User;
        footerNote: string;
    }) {
        return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 25px; background-color: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #111827; font-size: 22px; margin: 0;">${title}</h1>
        <p style="color: #6b7280; font-size: 15px;">${subtitle}</p>
      </div>
      <div style="background: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 12px;">👤 Personal Details</h2>
        <p style="margin: 6px 0;"><b>Full Name:</b> ${user.firstName} ${user.lastName}</p>
        <p style="margin: 6px 0;"><b>Email:</b> ${user.email}</p>
      </div>
      <div style="text-align: center; margin-top: 25px; color: #6b7280; font-size: 14px;">
        <p>${footerNote}</p>
        <p>Best regards,<br><b>Marketplace Team</b></p>
      </div>
    </div>
    `;
    }
}
