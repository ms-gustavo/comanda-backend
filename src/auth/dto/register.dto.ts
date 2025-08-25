import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * DTO usado no endpoint POST /auth/register
 * - Representa os dados necessários para registrar um novo usuário
 */
export class RegisterDto {
  /** E-mail único do usuário */
  @IsEmail()
  email!: string;

  /** Nome de exibição (mín. 3 caracteres) */
  @IsNotEmpty()
  @MinLength(3)
  displayName!: string;

  /** Senha do usuário (mín. 6 caracteres) */
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
