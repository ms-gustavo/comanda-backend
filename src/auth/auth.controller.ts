import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt.guard';
import { AuthUser } from './auth-user.decorator';
import { JwtPayload } from './types';

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
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
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
   * Rotaciona refresh token
   * @route POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async refresh() {
    return this.authService.refresh();
  }

  /**
   * Encerra a sessão e revoga refresh token
   * @route POST /auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async logout() {
    return this.authService.logout();
  }
}
