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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('Order')
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(UserAuthGuard)
  @Post('/initialize')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initialize a new checkout order / payment intent' })
  @ApiResponse({
    status: 201,
    description: 'Order initialized with payment link / reference',
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createOrder(@Body() createOrderDTO: CreateOrderDto, @Req() req) {
    const userId = req.userId || null;
    return this.orderService.createOrder(createOrderDTO, userId);
  }

  @Post('/paystack/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Paystack payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePaystackWebhook(@Req() req, @Res() res) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    const allowedSource = this.configService.get<string>('Forwarded_From');

    // Validate custom header
    const forwardedFrom =
      req.headers['forwarded-from'] || req.headers['Forwarded-From'];
    if (allowedSource && forwardedFrom !== allowedSource) {
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

  @Get('/paystack/verify')
  @ApiOperation({ summary: 'Verify a Paystack payment reference' })
  @ApiQuery({
    name: 'reference',
    description: 'Paystack transaction reference',
  })
  @ApiResponse({ status: 200, description: 'Payment verification result' })
  async verifyPayment(@Query('reference') reference: string) {
    return this.orderService.verifyPaystackPayment(reference);
  }

  @Post('/paystack/webhook/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test Paystack webhook receiver' })
  @ApiResponse({ status: 200, description: 'Webhook test received' })
  async handlePaystackWebhooks(@Req() req, @Res() res) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (
      hash !== req.headers['x-paystack-signature'] &&
      !req.headers['X-Paystack-Signature']
    ) {
      return res.status(401).send('Unauthorized webhook');
    }

    await this.orderService.handlePaystackWebhook(req.body);
    return res.sendStatus(200);
  }

  @Get('approved/all')
  @ApiOperation({ summary: 'Get all approved orders with pagination' })
  @ApiResponse({ status: 200, description: 'Approved orders list' })
  async getAllApprovedOrdersPagination(
    @Query() query: ExpressQuery,
  ): Promise<Order[]> {
    return this.orderService.findAllApprovedOrderPagination(query);
  }

  @Get('notapproved/all')
  @ApiOperation({
    summary: 'Get all pending / non-approved orders with pagination',
  })
  @ApiResponse({ status: 200, description: 'Non-approved orders list' })
  async getAllNotApprovedOrdersPagination(
    @Query() query: ExpressQuery,
  ): Promise<Order[]> {
    return this.orderService.findAllNotApprovedOrderPagination(query);
  }

  @UseGuards(UserAuthGuard)
  @Get('approved/all/user')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user approved orders' })
  @ApiResponse({ status: 200, description: 'User approved orders' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user pending / non-approved orders' })
  @ApiResponse({ status: 200, description: 'User pending orders' })
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
  @ApiOperation({ summary: 'Get all orders with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated orders' })
  async getAllOrdersPagination(@Query() query: ExpressQuery): Promise<Order[]> {
    return this.orderService.findAllOrderPagination(query);
  }

  @UseGuards(UserAuthGuard)
  @Get('pag/all/user')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all orders of currently logged in user' })
  @ApiResponse({ status: 200, description: 'User paginated orders' })
  async getAllLoginUserOrderPagination(
    @Query() query: ExpressQuery,
    @Req() req,
  ): Promise<Order[]> {
    const userId = req.userId;
    return this.orderService.findAllLoginUserOrderPagination(query, userId);
  }

  @Get('pag/all/:userId')
  @ApiOperation({ summary: 'Get all orders of a specific user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User orders' })
  async findAllUserOrderPagination(
    @Query() query: ExpressQuery,
    @Param('userId') userId: string,
  ): Promise<Order[]> {
    return this.orderService.findAllUserOrderPagination(query, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Orders list' })
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status / details' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order deleted' })
  remove(@Param('id') id: string) {
    return this.orderService.remove(+id);
  }

  @UseGuards(UserAuthGuard)
  @Patch(':id/comment/new')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a new comment to an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Comment added' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add comment with file attachment to order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileUrl: {
          type: 'string',
          format: 'binary',
          description: 'Attachment file (max 50MB)',
        },
        comment: {
          type: 'string',
          description: 'Comment text',
          example: 'Please check this revision',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Comment with attachment added' })
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
