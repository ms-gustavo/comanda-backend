import { createHash } from 'crypto';

/**
 * Gera uma ETag forte a partir de um objeto serializado de forma estável.
 * Evita depender de JSON.stringify sem ordenação.
 */

export function strongEtagFrom(value: unknown): string {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  const hash = createHash('sha1').update(json).digest('hex');
  return `"W3-${hash}"`;
}
