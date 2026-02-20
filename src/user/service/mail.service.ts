import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { User } from '../entities/user.entity';

dotenv.config();

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

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

  // === ONBOARDING MAIL ===
  async staffOnboardingMail(user: User) {
    const mailOptions = {
      from: `"HR Department" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: `🎉 Welcome to Our Company, ${user.firstName}!`,
      html: this.buildTemplate({
        title: `Welcome to the Mejarch Company, ${user.firstName} ${user.lastName} 🎉`,
        subtitle: `We’re thrilled to have you onboard!`,
        user,
        footerNote: 'We look forward to your impact and growth 🚀',
      }),
    };

    await this.transporter.sendMail(mailOptions);
  }

  // === LOGIN MAIL ===
  async staffLoginMail(user: User) {
    const mailOptions = {
      from: `"Security Team" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: `🔑 Login Alert for ${user.firstName}`,
      html: this.buildTemplate({
        title: `Login Successful ✅`,
        subtitle: `Hello ${user.firstName}, you logged into your account just now.`,
        user,
        footerNote:
          'If this wasn’t you, please reset your password immediately.',
      }),
    };

    await this.transporter.sendMail(mailOptions);
  }

  // === LOGIN VERIFICATION EMAIL ===
  async sendLoginVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string,
  ) {
    const verificationLink = `${process.env.Frontend_Domain_Url}/login/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"Security Team" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '🔐 Login Verification Code',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 25px; background-color: #f9fafb; border-radius: 12px;">
        
        <div style="text-align: center; margin-bottom: 25px;">
          <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" 
              alt="Company Logo" style="max-width: 120px; margin-bottom: 15px;" />
          <h1 style="color: #111827; font-size: 22px; margin: 0;">Verify Your Login</h1>
          <p style="color: #6b7280; font-size: 15px;">
            Hi ${firstName}, please verify your identity to complete the login process.
          </p>
        </div>

        <div style="background: #ffffff; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
            Your verification code is:
          </p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #111827; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 0;">
              ${verificationToken}
            </p>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin: 10px 0;">
            This code will expire in <b>15 minutes</b>
          </p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${verificationLink}"
            style="background-color: #407BFF; padding: 12px 30px; 
              color: white; text-decoration: none; border-radius: 8px; 
              font-size: 16px; font-weight: bold; display: inline-block;">
            Verify Login
          </a>
        </div>

        <p style="color: #374151; font-size: 14px; text-align: center; margin-top: 20px;">
          Or copy and paste the link below into your browser:
        </p>

        <p style="text-align: center; word-break: break-all; font-size: 12px; color: #1d4ed8; margin: 10px 0;">
          ${verificationLink}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />

        <p style="color: #6b7280; font-size: 13px; text-align: center;">
          ⚠️ <b>Security Notice:</b> If you did not initiate this login, please change your password immediately.
        </p>

        <p style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Our Company. All rights reserved.
        </p>
      </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${process.env.Frontend_Domain_Url}/login/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Support Team" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Request',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 25px; background-color: #f9fafb; border-radius: 12px;">
        
        <div style="text-align: center; margin-bottom: 25px;">
          <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" 
              alt="Company Logo" style="max-width: 120px; margin-bottom: 15px;" />
          <h1 style="color: #111827; font-size: 22px; margin: 0;">Password Reset Request</h1>
          <p style="color: #6b7280; font-size: 15px;">
            You requested a password reset. Click the button below to continue.
          </p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}"
            style="background-color: #407BFF; padding: 12px 25px; 
              color:white; text-decoration:none; border-radius:8px; 
              font-size:16px; font-weight:bold;">
            Reset Password
          </a>
        </div>

        <p style="color: #374151; font-size: 14px; text-align: center;">
          Or copy and paste the link below into your browser:
        </p>

        <p style="text-align:center; word-break:break-all; font-size:14px; color:#1d4ed8;">
          ${resetLink}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />

        <p style="color: #6b7280; font-size: 14px; text-align:center;">
          This link will expire in <b>10 minutes</b>.  
          If you did not request this, you can safely ignore this email.
        </p>

        <p style="text-align:center; margin-top:20px; color:#6b7280;">
          &copy; ${new Date().getFullYear()} Our Company. All rights reserved.
        </p>
      </div>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  // === TEMPLATE BUILDER ===
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

      <!-- Header -->
      <div style="text-align: center; margin-bottom: 25px;">
        <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" 
             alt="Company Logo" style="max-width: 120px; margin-bottom: 15px;" />
        <h1 style="color: #111827; font-size: 22px; margin: 0;">${title}</h1>
        <p style="color: #6b7280; font-size: 15px;">${subtitle}</p>
      </div>

      <!-- Staff Photo -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${user?.profilePics || 'https://ui-avatars.com/api/?name=' + user.firstName + '+' + user.lastName}" 
             alt="Profile Photo"
             style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #10b981;" />
      </div>

      <!-- Personal Info -->
      <div style="background: #ffffff; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
        <h2 style="color: #111827; font-size: 18px; margin-bottom: 12px;">👤 Personal Details</h2>
        <p style="margin: 6px 0;"><b>Full Name:</b> ${user.firstName} ${user.lastName}</p>
        <p style="margin: 6px 0;"><b>Email:</b> ${user.email}</p>
       
        <p style="margin: 6px 0;"><b>Phone:</b> ${user.phoneNumber}</p>
      </div>

      
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 25px; color: #6b7280; font-size: 14px;">
        <p>${footerNote}</p>
        <p>Best regards,<br><b>HR Department</b></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p>&copy; ${new Date().getFullYear()} Our Company. All rights reserved.</p>
      </div>
    </div>
    `;
  }
}
