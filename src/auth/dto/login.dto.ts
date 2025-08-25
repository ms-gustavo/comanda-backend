import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO usado no endpoint POST /auth/login
 * - Representa os dados para autenticação de um usuário existente
 */
export class LoginDto {
  /** E-mail do usuário */
  @IsEmail()
  email!: string;

  /** Senha do usuário */
  @IsNotEmpty()
  password!: string;
}
