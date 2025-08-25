import { Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Serviço responsável pelas regras de negócio da autenticação.
 * - Registro de usuários
 * - Login e emissão de tokens
 * - Consulta de usuário autenticado
 * - Refresh/Logout
 */
@Injectable()
export class AuthService {
  /**
   * Cria um novo usuário a partir do RegisterDto
   */
  async register(_dto: RegisterDto) {
    return { ok: false, message: 'Not implemented yet' };
  }

  /**
   * Valida credenciais e retorna tokens de acesso/refresh
   */
  async login(_dto: LoginDto) {
    return { ok: false, message: 'Not implemented yet' };
  }

  /**
   * Retorna dados do usuário logado (via access token)
   */
  async me(_userId?: string) {
    return { ok: false, message: 'Not implemented yet' };
  }

  /**
   * Rotaciona refresh token e retorna novo access token
   */
  async refresh() {
    return { ok: false, message: 'Not implemented yet' };
  }

  /**
   * Revoga refresh token atual e limpa sessão
   */
  async logout() {
    return { ok: false, message: 'Not implemented yet' };
  }
}
