import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsNumberString()
  price!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  note?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
