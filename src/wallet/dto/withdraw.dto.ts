import { IsNumber, Min, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class WithdrawDto {
    @IsNumber()
    @Min(100, { message: 'Minimum withdrawal amount is 100.' })
    amount: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty({ message: 'Account details are required (e.g. NAME - NUMBER - BANK).' })
    accountDetails: string;
}
