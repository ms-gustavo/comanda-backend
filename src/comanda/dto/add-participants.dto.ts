import { ArrayMinSize, IsArray, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO para adicionar participantes (convidados sem userId vinculado) a uma comanda já existente.
 */
export class AddParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(60, { each: true })
  names!: string[];
}
