import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { CreateMarketproductDto } from './dto/create-marketproduct.dto';
import { UpdateMarketproductDto } from './dto/update-marketproduct.dto';
import { MarketProduct, MarketProductStatus } from './entities/marketproduct.entity';
import { Rating } from './entities/rating.entity';
import { Agent, AgentRegistrationStatus } from '../agent/entities/agent.entity';
import { RateProductDto } from './dto/rate-product.dto';
import { MarketProductMailService } from './service/mail.service';
import { MarketProductFilterDto } from './dto/marketproduct-filter.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

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
    private readonly notificationService: NotificationService,
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

    if (agent.registrationStatus !== AgentRegistrationStatus.APPROVED) {
      throw new BadRequestException(
        `Agent account is not approved. Current status: ${agent.registrationStatus}.`,
      );
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

  async findAll(filterDto: MarketProductFilterDto) {
    const { page = 1, limit = 10, search, planType, category, buildingGuides, numBedrooms, numBathrooms, numFloors, area, designStyle, minPrice, maxPrice } = filterDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      relations: ['agent', 'agent.user', 'agent.profile'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
    };

    const filters: any = {};
    if (planType) filters.planType = planType;
    if (category) filters.category = category;
    if (numBedrooms) filters.numBedrooms = numBedrooms;
    if (numBathrooms) filters.numBathrooms = numBathrooms;
    if (numFloors) filters.numFloors = numFloors;
    if (area) filters.area = area;
    if (designStyle) filters.designStyle = designStyle;

    if (minPrice !== undefined && maxPrice !== undefined) {
      filters.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      filters.price = Between(minPrice, 999999999);
    } else if (maxPrice !== undefined) {
      filters.price = Between(0, maxPrice);
    }

    if (buildingGuides) {
      filters.addOns = Like(`%${buildingGuides}%`);
    }

    if (search) {
      queryOptions.where = [
        { ...filters, title: Like(`%${search}%`) },
        { ...filters, description: Like(`%${search}%`) },
        { ...filters, category: Like(`%${search}%`) },
        { ...filters, planType: Like(`%${search}%`) },
      ];
    } else {
      queryOptions.where = filters;
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

  async findAllByAgent(agentId: string, filterDto: MarketProductFilterDto) {
    const { page = 1, limit = 10, search, planType, category, buildingGuides, numBedrooms, numBathrooms, numFloors, area, designStyle, minPrice, maxPrice } = filterDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      relations: ['agent', 'agent.user', 'agent.profile'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
    };

    const filters: any = { agentId };
    if (planType) filters.planType = planType;
    if (category) filters.category = category;
    if (numBedrooms) filters.numBedrooms = numBedrooms;
    if (numBathrooms) filters.numBathrooms = numBathrooms;
    if (numFloors) filters.numFloors = numFloors;
    if (area) filters.area = area;
    if (designStyle) filters.designStyle = designStyle;

    if (minPrice !== undefined && maxPrice !== undefined) {
      filters.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      filters.price = Between(minPrice, 999999999);
    } else if (maxPrice !== undefined) {
      filters.price = Between(0, maxPrice);
    }

    if (buildingGuides) {
      filters.addOns = Like(`%${buildingGuides}%`);
    }

    if (search) {
      queryOptions.where = [
        { ...filters, title: Like(`%${search}%`) },
        { ...filters, description: Like(`%${search}%`) },
        { ...filters, category: Like(`%${search}%`) },
        { ...filters, planType: Like(`%${search}%`) },
      ];
    } else {
      queryOptions.where = filters;
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
    const oldStatus = product.status;

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

    const updatedProduct = await this.productRepo.save(product);

    // 3. Notify agent if approved
    if (oldStatus !== MarketProductStatus.APPROVED && updatedProduct.status === MarketProductStatus.APPROVED) {
      const agent = await this.agentRepo.findOne({
        where: { id: updatedProduct.agentId },
        relations: ['user']
      });
      if (agent && agent.user) {
        await this.notificationService.createNotification(
          agent.user.id,
          NotificationType.PRODUCT,
          'Product Approved',
          `Your product "${updatedProduct.title}" has been approved by admin.`,
          { productId: updatedProduct.id },
          'projectStatusChanged',
        );
      }
    }

    return updatedProduct;
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
