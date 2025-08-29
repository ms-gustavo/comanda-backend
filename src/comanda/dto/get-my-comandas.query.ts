import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetMyComandasQueryDto {
  /** owner | participant | all */
  @IsOptional()
  @IsIn(['owner', 'participant', 'all'])
  role?: 'owner' | 'participant' | 'all';

  /** OPEN | CLOSED (opcional) */
  @IsOptional()
  @IsIn(['OPEN', 'CLOSED'])
  status?: 'OPEN' | 'CLOSED';

  /** Busca por nome */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  /** paginação por cursor (ID da comanda) */
  @IsOptional()
  @IsString()
  cursor?: string;

  /** limite por página */
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit: number = 20;
}
