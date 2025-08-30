import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateInviteDto {
  /** horas até expirar (default: 24) */
  @IsOptional()
  @IsInt()
  @IsPositive()
  ttlHours?: number;

  /** limite de usos (null/omitido = ilimitado) */
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUses?: number;

  /** manter convites antigos? (default: false → revoga anteriores) */
  @IsOptional()
  @IsBoolean()
  keepExisting?: boolean;
}
