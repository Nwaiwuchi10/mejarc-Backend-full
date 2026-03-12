import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class RateProductDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
