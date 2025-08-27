import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { AuthUser } from './auth-user.decorator';
import { JwtPayload } from './types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from './cookie.util';

/**
 * Controller responsável por mapear as rotas de autenticação.
 *
 * Base: /auth
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Cria um novo usuário
   * @route POST /auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Faz login e retorna tokens
   * @route POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const ua = req.headers['user-agent'] as string | undefined;
    const ip = (req.headers['x-forwarded-for'] as string) || (req.ip as string);

    const result = await this.authService.login(dto, ua, ip);

    setRefreshCookie(reply, result.refresh.token, result.refresh.maxAgeMs);

    return reply.send({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  }

  /**
   * Retorna informações do usuário autenticado (via Bearer Token)
   * @route GET /auth/me
   * @returns { id, email, displayName, createdAt}
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@AuthUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  /**
   * Rotaciona o refresh token e retorna novo access token
   * Usa o cookie HttpOnly `refresh_token`
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const ua = req.headers['user-agent'] as string | undefined;
    const ip = (req.headers['x-forwarded-for'] as string) || (req.ip as string);
    const cookie = (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) || '';

    const result = await this.authService.refresh(cookie, ua, ip);

    setRefreshCookie(reply, result.refresh.token, result.refresh.maxAgeMs);

    return reply.send({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  }

  /**
   * Revoga o refresh atual e limpa cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const cookie = (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) || '';
    await this.authService.logout(cookie);
    clearRefreshCookie(reply);
    return reply.send({ ok: true });
  }
}
