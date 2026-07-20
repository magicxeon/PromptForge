import crypto from 'crypto';

export class RepositoryCursorError extends Error {
  constructor(message = 'Repository cursor is invalid for this query.') {
    super(message);
    this.name = 'RepositoryCursorError';
    this.code = 'invalid_repository_cursor';
    this.statusCode = 400;
  }
}

export function encodeRepositoryCursor(payload, scope, secret = process.env.REPOSITORY_CURSOR_SECRET || 'local-repository-cursor') {
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, scope })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function decodeRepositoryCursor(cursor, scope, secret = process.env.REPOSITORY_CURSOR_SECRET || 'local-repository-cursor') {
  try {
    const [encodedPayload, signature] = String(cursor || '').split('.');
    if (!encodedPayload || !signature) throw new Error('Malformed cursor');
    const expected = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new Error('Invalid cursor signature');
    }
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.scope !== scope || typeof payload.id !== 'string') throw new Error('Cursor scope changed');
    return payload;
  } catch {
    throw new RepositoryCursorError();
  }
}

