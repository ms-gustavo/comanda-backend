/**
 * Payload mínimo do access token (JWT)
 */
export interface JwtPayload {
  /** ID do usuário (sub = subject) */
  sub: string;
  /** Email do usuário */
  email: string;
  /** Emissão (automático do JWT) */
  iat?: number;
  /** Expiração (automático do JWT) */
  exp?: number;
}
