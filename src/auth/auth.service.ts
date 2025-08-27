import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '@prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

/**
 * Serviço responsável pelas regras de negócio da autenticação.
 * - Registro de usuários
 * - Login e emissão de tokens
 * - Consulta de usuário autenticado
 * - Refresh/Logout
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}
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
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    const expiresIn = (this as any).jwt.options.signOptions?.expiresIn ?? '900s';

    return {
      accessToken,
      expiresIn,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  /**
   * Retorna dados do usuário logado (via access token)
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });

    if (!user) throw new NotFoundException(`Usuário não encontrado!`);
    return user;
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
