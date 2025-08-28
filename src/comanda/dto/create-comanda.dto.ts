import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO usado para criar uma nova comanda
 * - Representa dados necessários para a criação de uma comanda
 */

export class CreateComandaDto {
  /** Nome da comanda */
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name!: string;

  /**
   * Nomes de participantes iniciais (convidados sem userId)
   * Opcional - pode ficar vazio
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];
}
