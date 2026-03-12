import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CreateMarketproductDto } from './dto/create-marketproduct.dto';
import { UpdateMarketproductDto } from './dto/update-marketproduct.dto';
import { MarketProduct } from './entities/marketproduct.entity';
import { Rating } from './entities/rating.entity';
import { Agent } from '../agent/entities/agent.entity';
import { RateProductDto } from './dto/rate-product.dto';
import { MarketProductMailService } from './service/mail.service';
import { PaginationDto } from '../utils/pagination.dto';

@Injectable()
export class MarketproductService {
  constructor(
    @InjectRepository(MarketProduct)
    private readonly productRepo: Repository<MarketProduct>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    private readonly mailService: MarketProductMailService,
  ) { }

  async create(
    agentId: string,
    dto: CreateMarketproductDto,
    files?: {
      productImage?: Express.Multer.File[];
      architecturalPlan?: Express.Multer.File[];
      structuralPlan?: Express.Multer.File[];
    },
  ) {
    // 1. Find the agent and user
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // 2. Map S3 URLs from uploaded files
    const productImage = files?.productImage?.map((f: any) => f.location) || [];
    const architecturalPlan = files?.architecturalPlan?.map((f: any) => f.location) || [];
    const structuralPlan = files?.structuralPlan?.map((f: any) => f.location) || [];

    // 3. Create Product entity
    const product = this.productRepo.create({
      ...dto,
      agentId,
      agent,
      productImage,
      architecturalPlan,
      structuralPlan,
    });

    const savedProduct = await this.productRepo.save(product);

    // 4. Send notification email
    if (agent.user) {
      await this.mailService.sendProductSubmittedNotification(
        agent.user,
        savedProduct,
      );
    }

    return savedProduct;
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      relations: ['agent', 'agent.user', 'agent.profile'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
    };

    if (search) {
      queryOptions.where = [
        { title: Like(`%${search}%`) },
        { description: Like(`%${search}%`) },
        { category: Like(`%${search}%`) },
        { planType: Like(`%${search}%`) },
      ];
    }

    const [data, total] = await this.productRepo.findAndCount(queryOptions);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllByAgent(agentId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      where: { agentId },
      relations: ['agent', 'agent.user', 'agent.profile'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
    };

    if (search) {
      queryOptions.where = [
        { agentId, title: Like(`%${search}%`) },
        { agentId, description: Like(`%${search}%`) },
        { agentId, category: Like(`%${search}%`) },
        { agentId, planType: Like(`%${search}%`) },
      ];
    }

    const [data, total] = await this.productRepo.findAndCount(queryOptions);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['agent', 'agent.user', 'agent.profile'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(
    id: string,
    updateMarketproductDto: UpdateMarketproductDto,
    files?: {
      productImage?: Express.Multer.File[];
      architecturalPlan?: Express.Multer.File[];
      structuralPlan?: Express.Multer.File[];
    },
  ) {
    const product = await this.findOne(id);
    
    // 1. Apply DTO updates first
    Object.assign(product, updateMarketproductDto);

    // 2. Map new S3 URLs if provided (overrides DTO values if both present)
    if (files?.productImage?.length) {
      product.productImage = files.productImage.map((f: any) => f.location);
    }
    if (files?.architecturalPlan?.length) {
      product.architecturalPlan = files.architecturalPlan.map((f: any) => f.location);
    }
    if (files?.structuralPlan?.length) {
      product.structuralPlan = files.structuralPlan.map((f: any) => f.location);
    }

    return this.productRepo.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepo.remove(product);
    return { success: true, message: 'Product deleted' };
  }

  async rateProduct(userId: string, productId: string, dto: RateProductDto) {
    const product = await this.findOne(productId);

    let rating = await this.ratingRepo.findOne({
      where: { userId, productId },
    });

    if (rating) {
      rating.rating = dto.rating;
      rating.comment = dto.comment;
    } else {
      rating = this.ratingRepo.create({
        userId,
        productId,
        ...dto,
      });
    }

    await this.ratingRepo.save(rating);

    // Update product average rating and count
    const [ratings, count] = await this.ratingRepo.findAndCount({
      where: { productId },
    });

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    product.averageRating = count > 0 ? totalRating / count : 0;
    product.ratingCount = count;

    await this.productRepo.save(product);

    return rating;
  }
}
