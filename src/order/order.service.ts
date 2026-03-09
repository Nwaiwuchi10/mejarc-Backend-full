import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository, IsNull } from 'typeorm';
import { MarketProduct } from '../marketproduct/entities/marketproduct.entity';
import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { PaystackService } from './paystack.service';
import { PaymentStatus } from './dto/paystack-payment.dto';
import axios from 'axios';
import { Query } from 'express-serve-static-core';
import { AddCommentDto } from './dto/AddOrderComment.dto';
import { Admin } from '../admin/entities/admin.entity';
import { MailService } from './Services/mail.service';
import { AddProjectDescDto } from './dto/projectDescription.dto';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, AWS_S3_BUCKET_NAME } from '../utils/aws-s3.config';
import { WalletTransaction, TransactionType } from '../wallet/entities/wallet-transaction.entity';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(PaystackService.name);
  private PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify';

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(MarketProduct)
    private readonly productRepository: Repository<MarketProduct>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionRepository: Repository<WalletTransaction>,
    private readonly configService: ConfigService,
    private readonly paystackService: PaystackService,
    private mailService: MailService,
  ) { }

  async createOrder(createOrderDTO: CreateOrderDto, userId?: string) {
    const { orderItems = [], redirect_url, email, billingInfo } = createOrderDTO;

    let userEmail: string;
    let userFirstName = '';
    let userLastName = '';

    if (userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new BadRequestException(`User with ID ${userId} not found`);
      userEmail = user.email;
      userFirstName = user.firstName;
      userLastName = user.lastName;
    } else {
      if (!email) throw new BadRequestException('Email is required for guest checkout.');
      userEmail = email;
    }

    let grandTotal = 0;
    const validatedOrderItems: any[] = [];

    if (orderItems.length > 0) {
      for (const item of orderItems) {
        const product = await this.productRepository.findOne({ where: { id: item.productId } });
        if (!product) throw new BadRequestException(`Product with ID ${item.productId} not found`);
        const totalPrice = Number(product.price) * item.totalQuantity;
        grandTotal += totalPrice;
        validatedOrderItems.push({
          productId: item.productId,
          totalQuantity: item.totalQuantity,
          totalPrice,
        });
      }
    }

    if (validatedOrderItems.length === 0) {
      throw new BadRequestException('You must select a product.');
    }

    const paystackResponse = await this.paystackService.initializePayment(
      userId || null,
      grandTotal,
      redirect_url,
      userEmail,
    );

    if (!paystackResponse?.data?.reference) {
      throw new BadRequestException('Failed to generate Paystack payment reference.');
    }

    const newOrder = this.orderRepository.create({
      userId: userId || undefined,
      orderItems: validatedOrderItems,
      grandTotal,
      redirect_url,
      billingInfo,
      payStackPayment: {
        userId: userId || undefined,
        email: userEmail,
        reference: paystackResponse.data.reference,
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        amount: grandTotal,
        transactionStatus: 'pending',
        status: 'notPaid',
        orderItems: validatedOrderItems,
        metadata: paystackResponse.metadata,
      },
    });

    await this.orderRepository.save(newOrder);

    try {
      await this.mailService.ConfirmOrder(
        userEmail,
        userFirstName,
        userLastName,
        grandTotal,
        paystackResponse.data.reference,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${userEmail}`, error);
    }

    return {
      message: 'Order created successfully, complete payment using Paystack',
      reference: paystackResponse.data.reference,
      access_code: paystackResponse.data.access_code,
      authorization_url: paystackResponse.data.authorization_url,
      orderId: newOrder.id,
      orderItems: validatedOrderItems,
      redirect_url,
      userId: userId || null,
      email: userEmail,
      amount: grandTotal,
      billingInfo,
      metadata: paystackResponse.metadata,
    };
  }

  // Same logic as createOrder


  async verifyPaystackPayment(reference: string) {
    try {
      const response = await axios.get(`${this.PAYSTACK_VERIFY_URL}/${reference}`, {
        headers: { Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}` },
      });

      const data = response.data.data;
      if (data.status !== 'success') throw new BadRequestException('Payment verification failed.');

      const order = await this.orderRepository.createQueryBuilder('order')
        .where(`order.payStackPayment->>'reference' = :reference`, { reference })
        .getOne();

      if (!order) throw new BadRequestException(`Order with reference ${reference} not found.`);

      if (order.isPaid) {
        return {
          message: 'Payment already verified',
          orderId: order.id,
          reference: order.payStackPayment.reference,
          amountPaid: order.amountPaid,
          status: order.payStackPayment.status,
          redirectUrl: order.redirect_url || null,
        };
      }

      const customerEmail = data.customer?.email;
      if (!customerEmail) throw new BadRequestException('Customer email not found from Paystack response.');

      let user = await this.userRepository.findOne({ where: { email: customerEmail } });

      if (!user) {
        const generatedPassword = uuidv4().slice(0, 10);
        user = this.userRepository.create({
          email: customerEmail,
          password: generatedPassword,
          firstName: 'New',
          lastName: 'User',
        });
        await this.userRepository.save(user);

        try {
          await this.mailService.sendAccountCreatedMail(user.email, generatedPassword);
        } catch (error) {
          console.error('Failed to send account creation mail', error.message);
        }
      }

      const amountInNaira = data.amount / 100;

      order.isPaid = true;
      order.payStackPayment = {
        ...order.payStackPayment,
        status: PaymentStatus.paid,
        transactionStatus: data.status,
      };
      order.amountPaid = amountInNaira.toString();
      order.grandTotal = amountInNaira;
      order.userId = user.id;

      await this.orderRepository.save(order);

      const orderDetails = await this.orderRepository.findOne({
        where: { id: order.id },
        relations: ['user', 'orderItems', 'orderItems.product', 'orderItems.product.agent', 'orderItems.product.agent.wallet'],
      });

      // Handle payment splitting for agent products if we have orderItems
      if (orderDetails && orderDetails.orderItems?.length > 0) {
        for (const item of orderDetails.orderItems) {
          const product = await this.productRepository.findOne({
            where: { id: item.productId },
            relations: ['agent', 'agent.wallet']
          });

          if (product && product.agent && product.agent.wallet) {
            const productTotal = Number(product.price) * (item.totalQuantity || 1);
            const agentShare = productTotal * 0.90; // 90% to agent

            const wallet = product.agent.wallet;
            wallet.balance = Number(wallet.balance) + agentShare;
            wallet.lifetimeEarnings = Number(wallet.lifetimeEarnings) + agentShare;

            // Save updated wallet
            await this.orderRepository.manager.save(wallet);

            // Create transaction record
            const transactionRecord = this.walletTransactionRepository.create({
              type: TransactionType.CREDIT,
              amount: agentShare,
              balanceAfter: wallet.balance,
              description: `Product Sale - ${product.title}`,
              wallet: wallet,
            });
            await this.walletTransactionRepository.save(transactionRecord);
          }
        }
      }

      try {
        await this.mailService.VerifyOrder(user.email, user.firstName, user.lastName, amountInNaira, reference, data.status);
      } catch (err) {
        console.error(`Failed to send payment confirmation email to ${user.email}`);
      }

      try {
        if (orderDetails) {
          await this.mailService.Invoice(
            user.email, user.firstName, user.lastName, order.grandTotal, reference, data.status,
            orderDetails.orderItems, null, orderDetails.createdAt,
          );
        }
      } catch (err) {
        console.error(`Failed to send invoice to ${user.email}`);
      }

      try {
        if (orderDetails) {
          await this.mailService.notifyAdminOfInvoice(
            user.email, user.firstName, user.lastName, order.grandTotal, reference, 'success',
            orderDetails.orderItems, null, orderDetails.createdAt,
          );
        }
      } catch (error) {
        console.error(`Failed to send invoice to Admin`);
      }

      // Handle Product File Delivery to User
      try {
        if (orderDetails && orderDetails.orderItems?.length > 0) {
          await this.mailService.sendProductDeliveryMail(user.email, user.firstName, orderDetails.orderItems);
        }
      } catch (error) {
        console.error(`Failed to send product delivery email to User ${user.email}`, error);
      }

      // Notice to Agent(s)
      try {
        if (orderDetails && orderDetails.orderItems?.length > 0) {
          for (const item of orderDetails.orderItems) {
            const product = await this.productRepository.findOne({
              where: { id: item.productId },
              relations: ['agent', 'agent.user']
            });

            if (product && product.agent && product.agent.user) {
              const productTotal = Number(product.price) * (item.totalQuantity || 1);
              const agentShare = productTotal * 0.90;
              await this.mailService.notifyAgentOfProductSale(
                product.agent.user.email,
                product.agent.user.firstName || 'Agent',
                product.title,
                agentShare
              );
            }
          }
        }
      } catch (error) {
        console.error(`Failed to send sale notification to Agent`, error);
      }

      return {
        message: 'Payment verified successfully',
        orderId: order.id,
        reference: order.payStackPayment.reference,
        amountPaid: order.amountPaid,
        status: order.payStackPayment.status,
        redirectUrl: order.redirect_url || null,
        userId: order?.userId,
      };
    } catch (error) {
      throw new BadRequestException(error.response?.data?.message || 'Error verifying payment, User did not complete transaction');
    }
  }

  async handlePaystackWebhook(payload: any) {
    const { event, data } = payload;
    if (event !== 'charge.success') return;

    const reference = data.reference;
    const order = await this.orderRepository.createQueryBuilder('order')
      .where(`order.payStackPayment->>'reference' = :reference`, { reference })
      .getOne();

    if (!order || order.isPaid) return;

    try {
      return await this.verifyPaystackPayment(reference);
    } catch (error) {
      console.error('Webhook verification failed:', error.message);
      return;
    }
  }

  async handlePaystackWebhookFunction(payload: any) {
    return this.handlePaystackWebhook(payload); // Re-use the main webhook function
  }

  async verifyPaystackPaymentPreviousFlow(reference: string) {
    return this.verifyPaystackPayment(reference);
  }

  async handlePaystackWebhookStandaloneFuction(payload: any) {
    return this.handlePaystackWebhook(payload);
  }

  async verifyPaystackPaymentss(reference: string) {
    return this.verifyPaystackPayment(reference);
  }

  async verifyPaystackPaymentWithoutMailInvoice(reference: string) {
    return this.verifyPaystackPayment(reference); // Delegate to main, we don't need code duplication
  }

  async findOrderDetails(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
    if (!order) throw new BadRequestException(`Order with ${id} not found`);

    if (order.user) delete order.user.password; // Exclude password
    return { order };
  }

  async findAllOrderPagination(query: Query): Promise<Order[]> {
    const resPerPage = 10;
    const currentPage = Number(query.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
      take: resPerPage,
      skip,
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
  }

  async findAllApprovedOrderPagination(query: Query): Promise<Order[]> {
    const resPerPage = 10;
    const currentPage = Number(query.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    return this.orderRepository.find({
      where: { isPaid: true },
      order: { createdAt: 'DESC' },
      take: resPerPage,
      skip,
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
  }

  async findLoginUserAllApprovedOrderPagination(query: Query, userId: string): Promise<Order[]> {
    const resPerPage = 10;
    const currentPage = Number(query.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    return this.orderRepository.find({
      where: { userId, isPaid: true },
      order: { createdAt: 'DESC' },
      take: resPerPage,
      skip,
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
  }

  async findAllNotApprovedOrderPagination(query: Query): Promise<Order[]> {
    const resPerPage = 10;
    const currentPage = Number(query.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    return this.orderRepository.find({
      where: { isPaid: false },
      order: { createdAt: 'DESC' },
      take: resPerPage,
      skip,
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
  }

  async findLoginUserAllNotApprovedOrderPagination(query: Query, userId: string): Promise<Order[]> {
    const resPerPage = 10;
    const currentPage = Number(query.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    return this.orderRepository.find({
      where: { userId, isPaid: false },
      order: { createdAt: 'DESC' },
      take: resPerPage,
      skip,
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
  }

  async findAllLoginUserOrderPagination(query: Query, userId: string): Promise<Order[]> {
    const resPerPage = 10;
    const currentPage = Number(query.page) || 1;
    const skip = resPerPage * (currentPage - 1);

    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: resPerPage,
      skip,
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
  }

  async findAllUserOrderPagination(query: Query, userId: string): Promise<Order[]> {
    return this.findAllLoginUserOrderPagination(query, userId);
  }

  findAll() {
    return this.orderRepository.find({ relations: ['user', 'orderItems', 'orderItems.product'] });
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
    if (!order) throw new BadRequestException(`Order with ${id} not found`);
    return { order };
  }

  async addComment(id: string, addCommentDto: AddCommentDto, userId: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const customer = await this.orderRepository.findOne({ where: { userId } });
    const adminUser = await this.adminRepository.findOne({ where: { userId } });
    if (!customer && !adminUser) throw new NotFoundException('Only Admin & Customer for the order is permitted to add a comment');

    let PicsUrl: string | undefined;

    if (addCommentDto.fileUrl) {
      if (addCommentDto.fileUrl.startsWith('data:')) {
        const matches = addCommentDto.fileUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          try {
            const buffer = Buffer.from(matches[2], 'base64');
            const fileName = `orderComment_${Date.now()}.jpg`;
            const command = new PutObjectCommand({
              Bucket: AWS_S3_BUCKET_NAME,
              Key: `Order/${fileName}`,
              Body: buffer,
              ContentType: matches[1],
              ACL: 'public-read'
            });
            await s3Client!.send(command);
            PicsUrl = `https://${AWS_S3_BUCKET_NAME}.s3.amazonaws.com/Order/${fileName}`;
            addCommentDto.fileUrl = PicsUrl;
          } catch (error) {
            console.error('Error uploading to S3:', error);
            throw new BadRequestException('Error uploading order picture');
          }
        }
      } else {
        PicsUrl = addCommentDto.fileUrl as string;
      }
    }

    const newComment = {
      userId,
      commentText: addCommentDto.commentText,
      fileUrl: addCommentDto.fileUrl,
      createdAt: new Date(),
    };

    order.comments = [...(order.comments || []), newComment];
    return this.orderRepository.save(order);
  }

  update(id: string, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }

  async addCommentFormData(id: string, addCommentDto: AddCommentDto, userId: string, file?: Express.Multer.File) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const customer = await this.orderRepository.findOne({ where: { userId } });
    const adminUser = await this.adminRepository.findOne({ where: { userId } });
    if (!customer && !adminUser) throw new NotFoundException('Only Admin & Customer for the order is permitted to add a comment');

    if (file) {
      try {
        const filePath = `${process.env.Base_Url || process.env.Base_Url_Local}/uploads/${file.filename}`;
        addCommentDto.fileUrl = filePath;
      } catch (error) {
        throw new BadRequestException('Error saving file(s)');
      }
    }

    const newComment = {
      userId,
      commentText: addCommentDto.commentText,
      fileUrl: addCommentDto.fileUrl,
      createdAt: new Date(),
    };

    order.comments = [...(order.comments || []), newComment];
    return this.orderRepository.save(order);
  }

  async addCommentFormDataCLOUD(id: string, addCommentDto: AddCommentDto, userId: string, file?: Express.Multer.File) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const customer = await this.orderRepository.findOne({ where: { userId } });
    const adminUser = await this.adminRepository.findOne({ where: { userId } });
    if (!customer && !adminUser) throw new NotFoundException('Only Admin & Customer for the order is permitted to add a comment');

    let imgUrl: string | undefined;
    if (file) {
      try {
        const fileName = `orderComment_${Date.now()}_${file.originalname}`;
        const command = new PutObjectCommand({
          Bucket: AWS_S3_BUCKET_NAME,
          Key: `Order/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        });
        if (s3Client) {
          await s3Client.send(command);
        } else {
          throw new Error('S3 Client is not initialized');
        }
        imgUrl = `https://${AWS_S3_BUCKET_NAME}.s3.amazonaws.com/Order/${fileName}`;
      } catch (error) {
        throw new BadRequestException('Error uploading order picture');
      }
    }

    const newComment = {
      userId,
      commentText: addCommentDto.commentText,
      fileUrl: imgUrl,
      createdAt: new Date(),
    };

    order.comments = [...(order.comments || []), newComment];
    return this.orderRepository.save(order);
  }

}
