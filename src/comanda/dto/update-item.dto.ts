import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsNumberString,
} from 'class-validator';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  note?: string;

  @IsOptional()
  assignedToId?: string | null;
}
