import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { JwtPayload } from './types';
/**
 * Decorator para obter o payload do usuário autenticado
 * @example
 *   me(@AuthUser() user: JwtPayload)
 */

export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as JwtPayload | undefined;
  },
);
