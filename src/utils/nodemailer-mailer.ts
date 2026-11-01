import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  sender?: { name?: string; email?: string };
  to: Array<{ email: string; name?: string }> | string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  attachment?: Array<{ content?: string; name?: string; url?: string; path?: string }>;
  [key: string]: any;
}

export class NodemailerMailer {
  private static transporter: nodemailer.Transporter | null = null;

  public static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
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
    return this.transporter;
  }

  public static async sendTransacEmail(options: SendMailOptions): Promise<any> {
    const transporter = this.getTransporter();
    const defaultUser = process.env.GMAIL_USER || 'carneizltd@gmail.com';

    let recipients: string[] = [];
    if (typeof options.to === 'string') {
      recipients = [options.to];
    } else if (Array.isArray(options.to)) {
      recipients = options.to.map((t) => (typeof t === 'string' ? t : t.email));
    }

    const attachments = (options.attachment || []).map((att) => {
      if (att.content) {
        return {
          filename: att.name || 'attachment',
          content: Buffer.from(att.content, 'base64'),
        };
      }
      if (att.url) {
        return {
          filename: att.name || 'attachment',
          path: att.url,
        };
      }
      return att;
    });

    const mailOptions = {
      from: `"${options.sender?.name || 'Mejarc'}" <${options.sender?.email || defaultUser}>`,
      to: recipients.join(', '),
      subject: options.subject,
      html: options.htmlContent,
      text: options.textContent,
      attachments,
    };

    return transporter.sendMail(mailOptions);
  }
}

