import { IsNumber, Min } from 'class-validator';

export class WithdrawDto {
    @IsNumber()
    @Min(100, { message: 'Minimum withdrawal amount is 100.' })
    amount: number;
}
