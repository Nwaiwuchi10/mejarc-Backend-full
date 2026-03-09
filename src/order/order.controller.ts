import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UserAuthGuard } from '../user/guard/user.guard';
import { Order } from './entities/order.entity';
import { Query as ExpressQuery } from 'express-serve-static-core';
import { AddCommentDto } from './dto/AddOrderComment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { OptionalAuthGuard } from '../user/guard/optional-auth.guard';

@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
  ) { }

  // @UseGuards(UserAuthGuard)
  @UseGuards(OptionalAuthGuard)
  @Post('/initialize')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createOrder(@Body() createOrderDTO: CreateOrderDto, @Req() req) {
    const userId = req.userId || null;
    return this.orderService.createOrder(createOrderDTO, userId);
  }

  @Post('/paystack/webhook')
  @HttpCode(200)
  async handlePaystackWebhook(@Req() req, @Res() res) {
    console.log('webhhook request', req);
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    const allowedSource = this.configService.get<string>('Forwarded_From');

    // Validate custom header
    const forwardedFrom =
      req.headers['forwarded-from'] || req.headers['Forwarded-From'];
    if (forwardedFrom !== allowedSource) {
      return res.status(403).send('Invalid source');
    }

    // Validate Paystack signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const paystackSignature = req.headers['x-paystack-signature'];

    if (hash !== paystackSignature) {
      return res.status(401).send('Unauthorized webhook');
    }

    await this.orderService.handlePaystackWebhook(req.body);
    return res.sendStatus(200);
  }

  // @UseGuards(UserAuthGuard)
  @Get('/paystack/verify')
  async verifyPayment(@Query('reference') reference: string) {
    return this.orderService.verifyPaystackPayment(reference);
  }

  @Post('/paystack/webhook/test')
  @HttpCode(200) // Paystack expects a 200 OK response
  async handlePaystackWebhooks(@Req() req, @Res() res) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (
      hash !== req.headers['x-paystack-signature'] ||
      req.headers['X-Paystack-Signature']
    ) {
      return res.status(401).send('Unauthorized webhook');
    }

    await this.orderService.handlePaystackWebhook(req.body);

    return res.sendStatus(200);
  }

  @Get('approved/all')
  async getAllApprovedOrdersPagination(
    @Query() query: ExpressQuery,
  ): Promise<Order[]> {
    return this.orderService.findAllApprovedOrderPagination(query);
  }
  @Get('notapproved/all')
  async getAllNotApprovedOrdersPagination(
    @Query() query: ExpressQuery,
  ): Promise<Order[]> {
    return this.orderService.findAllNotApprovedOrderPagination(query);
  }

  @UseGuards(UserAuthGuard)
  @Get('approved/all/user')
  async getLoginUserAllApprovedOrdersPagination(
    @Query() query: ExpressQuery,
    @Req() req,
  ): Promise<Order[]> {
    const userId = req.userId;
    return this.orderService.findLoginUserAllApprovedOrderPagination(
      query,
      userId,
    );
  }

  @UseGuards(UserAuthGuard)
  @Get('notapproved/all/user')
  async getLoginUserAllNotApprovedOrdersPagination(
    @Query() query: ExpressQuery,
    @Req() req,
  ): Promise<Order[]> {
    const userId = req.userId;
    return this.orderService.findLoginUserAllNotApprovedOrderPagination(
      query,
      userId,
    );
  }
  @Get('pag/all')
  async getAllOrdersPagination(@Query() query: ExpressQuery): Promise<Order[]> {
    return this.orderService.findAllOrderPagination(query);
  }

  @UseGuards(UserAuthGuard)
  @Get('pag/all/user')
  async getAllLoginUserOrderPagination(
    @Query() query: ExpressQuery,
    @Req() req,
  ): Promise<Order[]> {
    const userId = req.userId;
    console.log('UserID in Controller:', userId);
    return this.orderService.findAllLoginUserOrderPagination(query, userId);
  }
  @Get('pag/all/:userId')
  async findAllUserOrderPagination(
    @Query() query: ExpressQuery,
    @Param('userId') userId: string,
  ): Promise<Order[]> {
    return this.orderService.findAllUserOrderPagination(query, userId);
  }
  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(+id);
  }

  @UseGuards(UserAuthGuard)
  @Patch(':id/comment/new')
  async addComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @Req() req,
  ) {
    const userId = req.userId;
    return this.orderService.addComment(id, addCommentDto, userId);
  }

  @UseGuards(UserAuthGuard)
  @Patch(':id/comment')
  @UseInterceptors(
    FileInterceptor('fileUrl', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async addCommentFormData(
    @Param('id') id: string,
    @Body() addCommentDto: AddCommentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const userId = req.userId;
    return this.orderService.addCommentFormDataCLOUD(
      id,
      addCommentDto,
      userId,
      file,
    );
  }
}
