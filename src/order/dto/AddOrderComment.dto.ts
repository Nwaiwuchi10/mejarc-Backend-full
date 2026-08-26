import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddCommentDto {
  @IsOptional()
  @IsString() // Validate that it's a string
  commentText: string;

  @IsOptional()
  fileUrl: string;
}
