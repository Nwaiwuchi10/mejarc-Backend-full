// mail.service.ts
import * as dotenv from 'dotenv';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../user/entities/user.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

dotenv.config();

@Injectable()
export class MailService {
  private brevoClient: SibApiV3Sdk.TransactionalEmailsApi;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    this.brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
  }

  async ConfirmOrder(
    email: string,
    firstName: string,
    lastName: string,
    amount: number,
    reference: string,
  ) {
    const mailOptions = {
      sender: { name: 'Mejarc', email: process.env.MAIL_FROM },
      to: [{ email, name: firstName }],
      subject: 'Order Confirmation - Thank You for Your Purchase!',
      htmlContent: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; padding-bottom: 20px;">
                <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" alt="Mejarc Logo" style="width: 150px; margin-bottom: 20px;" />
                <h1 style="color: #333; font-size: 24px; margin-bottom: 5px;">Order Confirmed!</h1>
                <p style="font-size: 16px; color: #777;">Thank you for your purchase, ${firstName}!</p>
            </div>
  
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                <p style="font-size: 16px; color: #555;">
                    Dear <strong>${firstName} ${lastName}</strong>,
                </p>
                <p style="font-size: 16px; color: #555;">
                    We're happy to let you know that your order has been confirmed. Below are your order details:
                </p>
                <ul style="font-size: 16px; color: #555; padding-left: 20px;">
                 <li><strong>Payment Gateway: </strong> Paystack</li>
                 <li><strong>Order Reference Number:</strong> ${reference}</li>
                 <li><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</li>
                 <li><strong>Transaction Status:</strong> pending</li>
                </ul>
                <p style="font-size: 16px; color: #555;">
                    You can track your order with this reference number <strong> ${reference} </strong>
                </p>
                <p style="font-size: 16px; color: #555;">
                    You can access your dashboard for more details or to track your order.
                </p>
            </div>
  
            <hr style="border-top: 1px solid #eeeeee; margin: 30px 0;" />
  
            <div style="text-align: center; font-size: 14px; color: #999;">
                <p style="margin: 0 0 10px;">Thanks for choosing Mejarc!</p>
                <p>&copy; ${new Date().getFullYear()} Mejarc. All rights reserved.</p>
            </div>
        </div>
      `,
    };

    try {
      await this.brevoClient.sendTransacEmail(mailOptions);
    } catch (err) {
      console.error(`Failed to send order confirmation to ${email}`, err.message);
    }
  }

  async VerifyOrder(
    email: string,
    firstName: string,
    lastName: string,
    amount: number,
    referencePay: string,
    trans_status: string,
  ) {
    const mailOptions = {
      sender: { name: 'Mejarc', email: process.env.MAIL_FROM },
      to: [{ email, name: firstName }],
      subject: 'Payment Verified - Thank You for Your Payment!',
      htmlContent: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; padding-bottom: 20px;">
                <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" alt="Mejarc Logo" style="width: 150px; margin-bottom: 20px;" />
                <h1 style="color: #333; font-size: 24px; margin-bottom: 5px;">Payment Verified!</h1>
                <p style="font-size: 16px; color: #777;">Your transaction was successful.</p>
            </div>
  
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                <p style="font-size: 18px; color: #555;">Hello <strong>${firstName} ${lastName}</strong>,</p>
                <p style="font-size: 16px; color: #555;">
                    We’ve successfully received and verified your payment. Thank you for trusting Mejarc!
                </p>
                <ul style="font-size: 16px; color: #555; padding-left: 20px;">
                 <li><strong>Payment Gateway: </strong> Paystack</li>
                 <li><strong>Payment Reference:</strong> ${referencePay}</li>
                 <li><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</li>
                 <li><strong>Transaction Status:</strong> ${trans_status}</li>
                </ul>
            </div>
  
            <hr style="border-top: 1px solid #eeeeee; margin: 30px 0;" />
  
            <div style="text-align: center; font-size: 14px; color: #999;">
                <p style="margin: 0 0 10px;">Thanks for being part of Mejarc!</p>
                <p>&copy; ${new Date().getFullYear()} Mejarc. All rights reserved.</p>
            </div>
        </div>
      `,
    };
    try {
      await this.brevoClient.sendTransacEmail(mailOptions);
      console.log(`✅ Email sent: Payment Verified to ${email}`);
    } catch (err) {
      console.error(`Failed to send Payment Verified to ${email}:`, err.message);
    }
  }

  async Invoice(
    email: string,
    firstName: string,
    lastName: string,
    amount: number,
    referencePay: string,
    trans_status: string,
    orderItems: any[],
    pricingPlan: any,
    orderDate: Date,
  ) {
    const formattedDate = new Date(orderDate).toLocaleDateString();

    let itemsHtml = '';
    if (orderItems && orderItems.length > 0) {
      itemsHtml += orderItems
        .map((item) => {
          const productName = item?.productId?.title || 'N/A';
          const quantity = item?.totalQuantity || 0;
          const price = item?.productId?.price || 0;
          const total = quantity * price;

          return `<tr><td style="padding: 8px; border: 1px solid #ccc;">${productName}</td><td style="padding: 8px; border: 1px solid #ccc;">${quantity}</td><td style="padding: 8px; border: 1px solid #ccc;">₦${total.toLocaleString()}</td></tr>`;
        })
        .join('');
    }

    let pricingPlanHtml = '';
    if (pricingPlan) {
      pricingPlanHtml = `<tr><td style="padding: 8px; border: 1px solid #ccc;">${pricingPlan.name || 'Pricing Plan'}</td><td style="padding: 8px; border: 1px solid #ccc;">1</td><td style="padding: 8px; border: 1px solid #ccc;">₦${pricingPlan.price?.toLocaleString() || '0'}</td></tr>`;
    }

    const tableRows = `${itemsHtml}${pricingPlanHtml}`;

    const mailOptions = {
      sender: { name: 'Mejarc', email: process.env.MAIL_FROM },
      to: [{ email, name: firstName }],
      subject: 'Invoice - Payment Verified',
      htmlContent: `
      <div style="font-family: 'Arial', sans-serif; max-width: 700px; margin: auto; padding: 20px; background-color: #fff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" width="150" alt="Mejarc Logo" />
          <h2 style="color: #333;">Payment Invoice</h2>
          <p style="color: #777;">Transaction successful on ${formattedDate}</p>
        </div>
        <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
        <p>Thank you for your purchase! Here are your order details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr>
              <th style="padding: 10px; border: 1px solid #ccc;">Item</th>
              <th style="padding: 10px; border: 1px solid #ccc;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #ccc;">Total</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p><strong>Payment Reference:</strong> ${referencePay}</p>
        <p><strong>Total Amount Paid:</strong> ₦${amount.toLocaleString()}</p>
        <p><strong>Transaction Status:</strong> ${trans_status}</p>
        <hr style="margin: 30px 0;" />
        <div style="text-align: center; color: #aaa;">
          <p>&copy; ${new Date().getFullYear()} Mejarc. All rights reserved.</p>
        </div>
      </div>
    `,
    };
    try {
      await this.brevoClient.sendTransacEmail(mailOptions);
      console.log(`✅ Invoice sent to ${email}`);
    } catch (err) {
      console.error(`Failed to send invoice to ${email}:`, err.message);
    }
  }

  async notifyAdminOfInvoice(
    email: string,
    firstName: string,
    lastName: string,
    amount: number,
    referencePay: string,
    trans_status: string,
    orderItems: any[],
    pricingPlan: any,
    orderDate: Date,
  ) {
    const formattedDate = new Date(orderDate).toLocaleDateString();

    let itemsHtml = '';
    if (orderItems && orderItems.length > 0) {
      itemsHtml += orderItems
        .map((item) => {
          const productName = item?.productId?.title || 'N/A';
          const quantity = item?.totalQuantity || 0;
          const price = item?.productId?.price || 0;
          const total = quantity * price;

          return `<tr><td style="padding: 8px; border: 1px solid #ccc;">${productName}</td><td style="padding: 8px; border: 1px solid #ccc;">${quantity}</td><td style="padding: 8px; border: 1px solid #ccc;">₦${total.toLocaleString()}</td></tr>`;
        })
        .join('');
    }

    let pricingPlanHtml = '';
    if (pricingPlan) {
      pricingPlanHtml = `<tr><td style="padding: 8px; border: 1px solid #ccc;">${pricingPlan.name || 'Pricing Plan'}</td><td style="padding: 8px; border: 1px solid #ccc;">1</td><td style="padding: 8px; border: 1px solid #ccc;">₦${pricingPlan.price?.toLocaleString() || '0'}</td></tr>`;
    }

    const tableRows = `${itemsHtml}${pricingPlanHtml}`;

    const adminMailOptions = {
      sender: { name: 'Mejarc System', email: process.env.MAIL_FROM },
      to: [{ email: 'nwaiwugetrude@gmail.com' }],
      subject: `Payment Approved - ${firstName} ${lastName}`,
      htmlContent: `
      <div style="font-family: 'Arial', sans-serif; max-width: 700px; margin: auto; padding: 20px; background-color: #fff;">
        <h3 style="color: #333;">New Payment Verified</h3>
        <p><strong>User:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</p>
        <p><strong>Payment Reference:</strong> ${referencePay}</p>
        <p><strong>Transaction Status:</strong> ${trans_status}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>

        <h4>Invoice Details:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr>
              <th style="padding: 10px; border: 1px solid #ccc;">Item</th>
              <th style="padding: 10px; border: 1px solid #ccc;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #ccc;">Total</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <hr style="margin: 30px 0;" />
        <div style="text-align: center; color: #aaa;">
          <p>&copy; ${new Date().getFullYear()} Mejarc</p>
        </div>
      </div>
    `,
    };
    try {
      await this.brevoClient.sendTransacEmail(adminMailOptions);
      console.log('Admin email sent successfully');
    } catch (err) {
      console.error('Error sending admin email:', err.message);
    }
  }

  async sendAccountCreatedMail(email: string, plainPassword?: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);
      const resetToken = uuidv4();
      user.resetToken = resetToken;
      user.resetTokenExpires = expiryDate;
      await this.userRepository.save(user);

      const resetLink = `${process.env.Frontend_Domain_Url}/reset-password?token=${resetToken}`;

      const mailOptions = {
        sender: { name: 'Mejarc', email: process.env.MAIL_FROM },
        to: [{ email, name: user.firstName }],
        subject: 'Your Mejarc Account Has Been Created 🎉',
        htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Mejarc!</h2>
        <p>Hi ${user.firstName || ''} ${user.lastName || ''},</p>
        <p>An account has been automatically created for you after your successful payment.</p>
        <p><strong>Temporary Login Details:</strong></p>
        <p>
          <b>Email:</b> ${email}<br>
          <b>Temporary Password:</b> ${plainPassword || 'Generated password unavailable'}
        </p>
        <p>You can log in with these credentials and then change your password in your account settings.</p>
        <p>If you prefer, you can reset your password directly using the link below:</p>
        <a href="${resetLink}" style="display:inline-block; background-color:#4CAF50; color:white; padding:10px 20px; border-radius:5px; text-decoration:none;">
          Reset Your Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>We’re excited to have you onboard 🚀</p>
        <hr>
        <p style="color:#777;">If you didn’t make this payment, please ignore this email.</p>
        <p>&copy; ${new Date().getFullYear()} Mejarc</p>
      </div>
    `,
      };
      try {
        await this.brevoClient.sendTransacEmail(mailOptions);
        console.log(`✅ Account creation email sent to ${email}`);
      } catch (err) {
        console.error('Failed to send account creation email:', err.message);
      }
    }
  }

  async sendProductDeliveryMail(email: string, firstName: string, orderItems: any[]) {
    let productsHtml = '';

    if (orderItems && orderItems.length > 0) {
      productsHtml += orderItems
        .map((item) => {
          const productName = item?.product?.title || 'Unknown Product';
          let filesHtml = '<ul style="padding-left: 20px;">';

          if (item?.product?.architecturalPlan) {
            filesHtml += `<li><a href="${item.product.architecturalPlan}" style="color: #4CAF50; text-decoration: none;">Download Architectural Plan</a></li>`;
          }
          if (item?.product?.structuralPlan) {
            filesHtml += `<li><a href="${item.product.structuralPlan}" style="color: #4CAF50; text-decoration: none;">Download Structural Plan</a></li>`;
          }
          if (item?.product?.mechanicalPlan) {
            filesHtml += `<li><a href="${item.product.mechanicalPlan}" style="color: #4CAF50; text-decoration: none;">Download Mechanical Plan</a></li>`;
          }
          if (item?.product?.electricalPlan) {
            filesHtml += `<li><a href="${item.product.electricalPlan}" style="color: #4CAF50; text-decoration: none;">Download Electrical Plan</a></li>`;
          }

          if (filesHtml === '<ul style="padding-left: 20px;">') {
            filesHtml += '<li>No files available for download yet. Please contact support.</li>';
          }
          filesHtml += '</ul>';

          return `
          <div style="border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
             <h4 style="margin-top: 0; color: #333;">${productName}</h4>
             <p style="font-size: 14px; color: #666;">Here are your product files:</p>
             ${filesHtml}
          </div>
        `;
        })
        .join('');
    }

    const mailOptions = {
      sender: { name: 'Mejarc', email: process.env.MAIL_FROM },
      to: [{ email, name: firstName }],
      subject: 'Your Product Download Links 📦',
      htmlContent: `
        <div style="font-family: 'Arial', sans-serif; max-width: 700px; margin: auto; padding: 20px; background-color: #fff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" width="150" alt="Mejarc Logo" />
            <h2 style="color: #333;">Your Purchase is Ready!</h2>
          </div>
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Thank you for your purchase! We successfully processed your payment and your product files are ready for download.</p>
          <div style="margin: 30px 0;">
             ${productsHtml}
          </div>
          <p>If you have any issues accessing these files, please reply to this email.</p>
          <hr style="margin: 30px 0;" />
          <div style="text-align: center; color: #aaa;">
            <p>&copy; ${new Date().getFullYear()} Mejarc</p>
          </div>
        </div>
      `,
    };

    try {
      await this.brevoClient.sendTransacEmail(mailOptions);
      console.log(`✅ Product delivery email sent to ${email}`);
    } catch (err) {
      console.error(`Failed to send delivery email to ${email}:`, err.message);
    }
  }

  async notifyAgentOfProductSale(agentEmail: string, agentName: string, productTitle: string, amountEarned: number) {
    const mailOptions = {
      sender: { name: 'Mejarc', email: process.env.MAIL_FROM },
      to: [{ email: agentEmail, name: agentName }],
      subject: '🎉 You Made a Sale!',
      htmlContent: `
          <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #fff; border: 1px solid #eaeaea; border-radius: 8px;">
            <div style="text-align: center; padding-bottom: 20px;">
                <img src="https://res.cloudinary.com/dlrelihio/image/upload/v1770794866/mejarcnewlogo_rswhb7.webp" alt="Mejarc Logo" style="width: 150px; margin-bottom: 20px;" />
            </div>
            <h2 style="color: #333; text-align: center;">Great news, ${agentName}!</h2>
            <p style="font-size: 16px; color: #555;">One of your products was just purchased.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Product Sold:</strong> ${productTitle}</p>
                <p><strong>Amount Credited to Wallet:</strong> ₦${amountEarned.toLocaleString()}</p>
            </div>
            
            <p style="font-size: 16px; color: #555;">Your wallet balance has been updated. You can check your earnings on your dashboard.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://mejarc.com/agent-dashboard" style="background: #4CAF50; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-size: 16px;">View Dashboard</a>
            </div>
          </div>
          `
    };

    try {
      await this.brevoClient.sendTransacEmail(mailOptions);
    } catch (err) {
      console.error(`Failed to notify agent ${agentEmail} of sale:`, err.message);
    }
  }
}
