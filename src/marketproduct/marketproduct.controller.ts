import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { MarketproductService } from './marketproduct.service';
import { CreateMarketproductDto } from './dto/create-marketproduct.dto';
import { UpdateMarketproductDto } from './dto/update-marketproduct.dto';
import { RateProductDto } from './dto/rate-product.dto';
import { AgentAuthGuard } from '../agent/guards/agent-auth.guard';
import { UserAuthGuard } from '../user/guard/user.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from '../utils/aws-s3.config';
import { MarketProductFilterDto } from './dto/marketproduct-filter.dto';

@ApiTags('Marketplace Product')
@Controller('marketproduct')
export class MarketproductController {
  constructor(private readonly marketproductService: MarketproductService) {}

  /**
   * POST /marketproduct
   * Creates a new professional product listing.
   * Requires Agent token.
   * Handles multiple file uploads: productImage, architecturalPlan, structuralPlan.
   */
  @UseGuards(AgentAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new marketplace design product listing (Agent only)',
    description:
      'Uploads product metadata alongside architecture, structural, electrical, and mechanical plan files',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Modern 4-Bedroom Duplex' },
        description: {
          type: 'string',
          example:
            'Contemporary architectural design with complete structural calculations.',
        },
        price: { type: 'number', example: 150000 },
        category: { type: 'string', example: 'Residential' },
        subCategory: { type: 'string', example: 'Duplex' },
        productImage: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Product preview photos / 3D renders',
        },
        architecturalPlan: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Architectural blueprints / CAD / PDF files',
        },
        structuralPlan: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Structural engineering drawings',
        },
        electricalPlan: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Electrical layout plans',
        },
        mechanicalPlan: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Mechanical / plumbing plans',
        },
      },
      required: ['title', 'price'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Marketplace product listed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Agent token required',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'productImage', maxCount: 10 },
        { name: 'architecturalPlan', maxCount: 10 },
        { name: 'structuralPlan', maxCount: 10 },
        { name: 'electricalPlan', maxCount: 10 },
        { name: 'mechanicalPlan', maxCount: 10 },
      ],
      {
        storage: createS3Storage('market-products'),
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
      },
    ),
  )
  async create(
    @Request() req: any,
    @Body() dto: CreateMarketproductDto,
    @UploadedFiles()
    files: {
      productImage?: Express.Multer.File[];
      architecturalPlan?: Express.Multer.File[];
      structuralPlan?: Express.Multer.File[];
      electricalPlan?: Express.Multer.File[];
      mechanicalPlan?: Express.Multer.File[];
    },
  ) {
    const agentId = req.agentId;
    return this.marketproductService.create(agentId, dto, files);
  }

  @Get()
  @ApiOperation({
    summary: 'Search and filter marketplace products',
    description:
      'Retrieve marketplace products with filters for category, price range, search keywords, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered marketplace product listing',
  })
  findAll(@Query() filterDto: MarketProductFilterDto) {
    return this.marketproductService.findAll(filterDto);
  }

  @Get('agent/:agentId')
  @ApiOperation({
    summary: 'Get all marketplace products published by an agent',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID UUID' })
  @ApiResponse({ status: 200, description: 'Agent product listing' })
  findAllByAgent(
    @Param('agentId') agentId: string,
    @Query() filterDto: MarketProductFilterDto,
  ) {
    return this.marketproductService.findAllByAgent(agentId, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get marketplace product details by ID' })
  @ApiParam({ name: 'id', description: 'Product ID UUID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.marketproductService.findOne(id);
  }

  @UseGuards(AgentAuthGuard)
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update marketplace product (Agent owner only)' })
  @ApiParam({ name: 'id', description: 'Product ID UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Product updated' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'productImage', maxCount: 10 },
        { name: 'architecturalPlan', maxCount: 10 },
        { name: 'structuralPlan', maxCount: 10 },
        { name: 'electricalPlan', maxCount: 10 },
        { name: 'mechanicalPlan', maxCount: 10 },
      ],
      {
        storage: createS3Storage('market-products'),
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
      },
    ),
  )
  update(
    @Param('id') id: string,
    @Body() updateMarketproductDto: UpdateMarketproductDto,
    @UploadedFiles()
    files?: {
      productImage?: Express.Multer.File[];
      architecturalPlan?: Express.Multer.File[];
      structuralPlan?: Express.Multer.File[];
      electricalPlan?: Express.Multer.File[];
      mechanicalPlan?: Express.Multer.File[];
    },
  ) {
    return this.marketproductService.update(id, updateMarketproductDto, files);
  }

  @UseGuards(AgentAuthGuard)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete marketplace product (Agent owner only)' })
  @ApiParam({ name: 'id', description: 'Product ID UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  remove(@Param('id') id: string) {
    return this.marketproductService.remove(id);
  }

  @UseGuards(UserAuthGuard)
  @Post(':id/rate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rate and review a marketplace product' })
  @ApiParam({ name: 'id', description: 'Product ID UUID' })
  @ApiResponse({ status: 200, description: 'Review submitted' })
  rate(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RateProductDto,
  ) {
    const userId = req.userId;
    return this.marketproductService.rateProduct(userId, id, dto);
  }
}
