import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '@prisma/prisma.service';
import * as argon2 from 'argon2';

/**
 * Serviço responsável pelas regras de negócio da autenticação.
 * - Registro de usuários
 * - Login e emissão de tokens
 * - Consulta de usuário autenticado
 * - Refresh/Logout
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * Cria um novo usuário a partir do RegisterDto
   */
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException(`E-mail já está em uso.`);

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        displayName: dto.displayName,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });
    return user;
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
