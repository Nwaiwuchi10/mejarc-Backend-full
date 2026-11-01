import * as nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NodemailerTransportService {
  private readonly logger = new Logger(NodemailerTransportService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.GMAIL_USER || 'carneizltd@gmail.com';
    const pass = (process.env.GMAIL_PASS || 'ljdc ducb dwkq stdo').replace(/\s+/g, '');

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: any[];
  }) {
    const sender = process.env.GMAIL_USER || 'carneizltd@gmail.com';
    try {
      const info = await this.transporter.sendMail({
        from: `"Mejarc" <${sender}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return info;
    } catch (err: any) {
      this.logger.error(`Error sending email to ${options.to}: ${err.message || err}`);
      throw err;
    }
  }

  getTransporter(): nodemailer.Transporter {
    return this.transporter;
  }
}

// Global singleton instance for easy import across services
export const mailerService = new NodemailerTransportService();

