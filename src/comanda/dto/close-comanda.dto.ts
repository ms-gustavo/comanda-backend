import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExtraFeeDto {
  @IsString() label!: string;
  @IsNumber() amount!: number;
}

export enum RoundStrategy {
  NONE = 'none',
  PER_PERSON = 'per_person',
  TOTAL = 'total',
}

export class CloseComandaDto {
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  serviceFeePct?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discountPct?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraFeeDto)
  extras?: ExtraFeeDto[];

  @IsOptional()
  @IsEnum(RoundStrategy)
  roundStrategy?: RoundStrategy;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  roundTo?: number;
}

export type CloseParticipantLine = {
  participantId: string;
  name: string;
  subtotal: string;
  serviceFee: string;
  extras: string;
  discount: string;
  total: string;
};

export type CloseSummary = {
  comandaId: string;
  status: 'CLOSED';
  closedAt: string;
  closedById: string;
  serviceFeePct: string;
  discountPct: string;
  extras: { label: string; amount: string }[];
  lines: CloseParticipantLine[];
  grandTotal: string;
};
