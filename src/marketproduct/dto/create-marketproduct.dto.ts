import {
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsArray,
    IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    ProductCategory,
    PlanType,
    FileTypeOption,
    MarketProductStatus,
} from '../entities/marketproduct.entity';

export class CreateMarketproductDto {
    @IsString()
    title: string;

    @IsEnum(ProductCategory)
    category: ProductCategory;

    @IsEnum(PlanType)
    planType: PlanType;

    @IsString()
    @IsOptional()
    numBedrooms?: string;

    @IsString()
    @IsOptional()
    numBathrooms?: string;

    @IsString()
    @IsOptional()
    numFloors?: string;

    @IsNumber()
    @Type(() => Number)
    price: number;

    @IsString()
    description: string;

    @IsEnum(FileTypeOption)
    fileType: FileTypeOption;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    drawingSet?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    addOns?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    productImage?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    architecturalPlan?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    structuralPlan?: string[];

    @IsEnum(MarketProductStatus)
    @IsOptional()
    status?: MarketProductStatus;
}
