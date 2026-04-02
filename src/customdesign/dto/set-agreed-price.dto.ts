import { IsNumber, Min } from 'class-validator';

export class SetAgreedPriceDto {
    @IsNumber()
    @Min(1000, { message: 'Minimum agreed price is 1000.' })
    price: number;
}
