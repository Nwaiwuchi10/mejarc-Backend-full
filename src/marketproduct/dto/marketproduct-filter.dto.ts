import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../utils/pagination.dto';
import { PlanType, ProductCategory } from '../entities/marketproduct.entity';

export class MarketProductFilterDto extends PaginationDto {
    @IsOptional()
    @IsString()
    planType?: PlanType;

    @IsOptional()
    @IsString()
    category?: ProductCategory;

    @IsOptional()
    @IsString()
    buildingGuides?: string;

    @IsOptional()
    @IsString()
    numBedrooms?: string;

    @IsOptional()
    @IsString()
    numBathrooms?: string;

    @IsOptional()
    @IsString()
    numFloors?: string;

    @IsOptional()
    @IsString()
    area?: string;

    @IsOptional()
    @IsString()
    designStyle?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;
}
