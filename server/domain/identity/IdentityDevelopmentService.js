import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { qualifiedDevelopmentActor, developmentFixtureId } from '../../config/authPolicy.js';
import { IdentityPublicPolicyService } from './IdentityPublicPolicyService.js';

const cookieName = 'mpf_local_development';
const safeReadPaths = new Set([
  '/api/me',
  '/api/me/preferences',
  '/api/mock-users',
  '/api/health',
  '/api/providers',
  '/api/attributes/bundle',
  '/api/history',
  '/api/collections',
  '/api/credits',
  '/api/credits/account',
]);
const publicReadPaths = new Set(['/api/me', '/api/mock-users', '/api/health']);
const loopback = (peer) => peer === '127.0.0.1' || peer === '::ffff:127.0.0.1';
const fail = (res, code, status = 403) =>
  res.status(status).json({ error: 'This action is unavailable in the current authentication mode.', code });

// Deliberately limited local workspace admission. Existing capability handlers
// still enforce ownership; provider, financial, security and media operations
// have no local exception. This is never a real authentication/session proof.
export class IdentityDevelopmentService {
  constructor({ runtime, userRepository, realIdentity, clock = Date, csrfKey = randomBytes(32) }) {
    this.runtime = runtime;
    this.userRepository = userRepository;
    this.realIdentity = realIdentity;
    this.clock = clock;
    this.csrfKey = csrfKey;
    if (!Buffer.isBuffer(csrfKey) || csrfKey.length !== 32)
      throw new Error('Invalid local CSRF configuration.');
  }
  mac(value) {
    return createHmac('sha256', this.csrfKey).update(`development-csrf-v1:${value}`).digest('base64url');
  }
  token(cookie) {
    return `${cookie}.${this.mac(cookie)}`;
  }
  readCookie(header = '') {
    const matches = String(header)
      .split(';')
      .map((v) => v.trim())
      .filter((v) => v.startsWith(`${cookieName}=`));
    if (matches.length !== 1) return null;
    const value = matches[0].slice(cookieName.length + 1);
    const [nonce, expiry, ...extra] = value.split('.');
    if (
      extra.length ||
      !/^[A-Za-z0-9_-]{43}$/.test(nonce) ||
      !/^\d{13}$/.test(expiry) ||
      Number(expiry) <= this.clock.now() ||
      Number(expiry) > this.clock.now() + 3600000
    )
      return null;
    return value;
  }
  validCsrf(req) {
    const cookie = this.readCookie(req.headers?.cookie),
      token = req.headers?.['x-csrf-token'];
    if (!cookie || typeof token !== 'string' || token.length > 160) return false;
    const expected = this.token(cookie);
    return token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }
  local(req) {
    return (
      loopback(req.socket?.remoteAddress) &&
      this.runtime.allowedHosts.includes(req.headers?.host) &&
      (!req.headers?.origin || this.runtime.allowedOrigins.includes(req.headers.origin)) &&
      !['cross-site'].includes(req.headers?.['sec-fetch-site'])
    );
  }
  middleware() {
    return async (req, res, next) => {
      const requestPath = req.path.toLowerCase();
      res.setHeader('Cache-Control', 'no-store');
      if (!this.runtime.enabled) {
        req.actorContext = null;
        if (requestPath === '/api/auth/config' && req.method === 'GET') {
          if (this.realIdentity) return next();
          return res.json({ ...new IdentityPublicPolicyService().project(), csrfToken: null });
        }
        if (this.realIdentity) return next();
        if (requestPath === '/api/mock-users') return res.json({ enabled: false, users: [] });
        if (
          (requestPath.startsWith('/api/') && !publicReadPaths.has(requestPath)) ||
          requestPath.startsWith('/outputs') ||
          requestPath.startsWith('/sub-app-game-character')
        )
          return fail(res, 'auth_service_unavailable', 503);
        if (requestPath.startsWith('/api/') && !['GET', 'HEAD'].includes(req.method))
          return fail(res, 'auth_service_unavailable', 503);
        return next();
      }
      if (!this.local(req)) return fail(res, 'auth_development_request_denied');
      try {
        const user = await this.userRepository.findById(developmentFixtureId);
        if (!qualifiedDevelopmentActor(user)) return fail(res, 'auth_development_fixture_unavailable', 503);
        req.actorContext = Object.freeze({
          ...this.userRepository.toActorContext(user),
          authMode: 'development_bypass',
          authProvider: 'development_bypass',
        });
        if (requestPath === '/api/auth/config' && req.method === 'GET') {
          const cookie =
            this.readCookie(req.headers.cookie) ??
            `${randomBytes(32).toString('base64url')}.${this.clock.now() + 3600000}`;
          res.setHeader(
            'Set-Cookie',
            `${cookieName}=${cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`
          );
          return res.json({
            ...new IdentityPublicPolicyService().project({ authMode: 'development_bypass' }),
            csrfToken: this.token(cookie),
          });
        }
        if (requestPath === '/api/mock-users') return res.json({ enabled: false, users: [] });
        if (requestPath.startsWith('/api/auth/')) return fail(res, 'auth_development_mode_unavailable');
        if (requestPath.startsWith('/outputs') || requestPath.startsWith('/sub-app-game-character'))
          return fail(res, 'auth_development_action_unavailable');
        if (requestPath.startsWith('/api/')) {
          if (req.method === 'PATCH' && requestPath === '/api/me/preferences') {
            if (!this.runtime.allowedOrigins.includes(req.headers.origin) || !this.validCsrf(req))
              return fail(res, 'auth_csrf_invalid');
          } else if (!['GET', 'HEAD'].includes(req.method) || !safeReadPaths.has(requestPath))
            return fail(res, 'auth_development_action_unavailable');
        }
        return next();
      } catch {
        return fail(res, 'auth_development_fixture_unavailable', 503);
      }
    };
  }
}
