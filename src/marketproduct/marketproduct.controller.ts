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
import { MarketproductService } from './marketproduct.service';
import { CreateMarketproductDto } from './dto/create-marketproduct.dto';
import { UpdateMarketproductDto } from './dto/update-marketproduct.dto';
import { RateProductDto } from './dto/rate-product.dto';
import { AgentAuthGuard } from '../agent/guards/agent-auth.guard';
import { UserAuthGuard } from '../user/guard/user.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from '../utils/aws-s3.config';
import { PaginationDto } from '../utils/pagination.dto';

@Controller('marketproduct')
export class MarketproductController {
  constructor(private readonly marketproductService: MarketproductService) { }

  /**
   * POST /marketproduct
   * Creates a new professional product listing.
   * Requires Agent token.
   * Handles multiple file uploads: productImage, architecturalPlan, structuralPlan.
   */
  @UseGuards(AgentAuthGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'productImage', maxCount: 10 },
        { name: 'architecturalPlan', maxCount: 10 },
        { name: 'structuralPlan', maxCount: 10 },
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
    },
  ) {
    const agentId = req.agentId;
    return this.marketproductService.create(agentId, dto, files);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.marketproductService.findAll(paginationDto);
  }

  @Get('agent/:agentId')
  findAllByAgent(
    @Param('agentId') agentId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.marketproductService.findAllByAgent(agentId, paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketproductService.findOne(id);
  }

  @UseGuards(AgentAuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'productImage', maxCount: 10 },
        { name: 'architecturalPlan', maxCount: 10 },
        { name: 'structuralPlan', maxCount: 10 },
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
    },
  ) {
    return this.marketproductService.update(id, updateMarketproductDto, files);
  }

  @UseGuards(AgentAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marketproductService.remove(id);
  }

  @UseGuards(UserAuthGuard)
  @Post(':id/rate')
  rate(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: RateProductDto,
  ) {
    const userId = req.userId;
    return this.marketproductService.rateProduct(userId, id, dto);
  }
}
