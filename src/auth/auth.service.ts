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
import * as crypto from 'crypto';

/**
 * Serviço responsável pelas regras de negócio da autenticação.
 * - Registro de usuários
 * - Login e emissão de tokens
 * - Consulta de usuário autenticado
 * - Refresh/Logout
 */

function parseMsFrom(ttl: string | number): number {
  if (typeof ttl === 'number') return ttl;

  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return Number(ttl) | 0;
  const n = Number(m[1]);
  const unit = m[2];
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
  return n * map[unit as keyof typeof map];
}

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
  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const { accessToken, expiresIn } = await this.issueAccessToken(user.id, user.email);
    const { refreshToken, maxAgeMs } = await this.issueAndStoreRefresh(user.id, userAgent, ip);

    return {
      accessToken,
      expiresIn,
      refresh: { token: refreshToken, maxAgeMs },
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
  async refresh(refreshTokenPlain: string, userAgent?: string, ip?: string) {
    if (!refreshTokenPlain) throw new UnauthorizedException(`Refresh token ausente!`);

    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true, tokenHash: true },
    });

    let tokenRecord: { id: string; userId: string } | null = null;
    for (const t of tokens) {
      const match = await argon2.verify(t.tokenHash, refreshTokenPlain);
      if (match) {
        tokenRecord = { id: t.id, userId: t.userId };
        break;
      }
    }

    if (!tokenRecord) throw new UnauthorizedException(`Refresh token inválido!`);

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      select: { id: true, email: true },
    });
    if (!user) throw new UnauthorizedException(`Usuário não encontrado!`);

    const { accessToken, expiresIn } = await this.issueAccessToken(user.id, user.email);
    const { refreshToken, maxAgeMs } = await this.issueAndStoreRefresh(user.id, userAgent, ip);

    return { accessToken, expiresIn, refresh: { token: refreshToken, maxAgeMs } };
  }

  /**
   * Revoga refresh token atual e limpa sessão
   */
  async logout(refreshTokenPlain?: string) {
    if (!refreshTokenPlain) return { ok: true };
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null },
      select: { id: true, tokenHash: true },
    });

    for (const t of tokens) {
      const match = await argon2.verify(t.tokenHash, refreshTokenPlain).catch(() => false);
      if (match) {
        await this.prisma.refreshToken.update({
          where: { id: t.id },
          data: { revokedAt: new Date() },
        });
        break;
      }
    }

    return { ok: true };
  }

  private async issueAccessToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload);
    const expiresIn = process.env.JWT_ACCESS_TTL ?? '900s';
    return { accessToken, expiresIn };
  }

  private async issueAndStoreRefresh(userId: string, userAgent?: string, ip?: string) {
    const ttl = process.env.JWT_REFRESH_TTL ?? '30d';
    const maxAgeMs = parseMsFrom(ttl);

    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = await argon2.hash(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + maxAgeMs),
        userAgent,
        ip,
      },
    });

    return { refreshToken, maxAgeMs };
  }
}
