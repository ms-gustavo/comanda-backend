import { FastifyReply } from 'fastify';

export const REFRESH_COOKIE_NAME = 'refresh_token';

export function setRefreshCookie(reply: FastifyReply, token: string, maxAgeMs: number) {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}
