import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { JwtPayload } from './types';
/**
 * Guard responsável por:
 * - Ler o header Authorization: Bearer <token>
 * - Validar o token com Jwt Service
 * - Injeta o payload em req.user
 */

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: JwtPayload;
      }
    >();
    const auth = req.headers['authorization'];

    if (!auth || !auth.startsWith('Bearer '))
      throw new UnauthorizedException(`Token de autenticação não fornecido ou inválido`);

    const token = auth.slice('Bearer '.length).trim();

    try {
      const payload = (await this.jwt.verifyAsync(token)) as JwtPayload;
      (req as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(`Token de autenticação inválido`);
    }
  }
}
