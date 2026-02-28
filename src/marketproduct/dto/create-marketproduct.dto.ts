import {
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsArray,
    IsDecimal,
} from 'class-validator';
import {
    ProductCategory,
    PlanType,
    FileTypeOption,
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
}
