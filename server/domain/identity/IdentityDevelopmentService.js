import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { qualifiedDevelopmentActor, qualifiedDevelopmentRoster, developmentFixtureId } from '../../config/authPolicy.js';
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
  '/api/community/features',
]);
const adminReads = [
  /^\/api\/admin\/(?:capabilities|provider-health|provider-controls|content|overview|users|generations|operations|audit-events|credit-reconciliation)$/,
  /^\/api\/admin\/(?:traces|generation-command-previews|users)\/[^/]+$/,
  /^\/api\/admin\/support\/cases(?:\/[^/]+)?$/,
  /^\/api\/admin\/configuration\/revisions$/,
  /^\/api\/admin\/community\/(?:posts|reports)$/,
  /^\/api\/admin\/credits\/[^/]+\/ledger$/,
  /^\/api\/admin\/attribute-catalog\/(?:overview|definitions|drafts\/[^/]+)$/,
  /^\/api\/admin\/cinematic\/(?:projects(?:\/[^/]+)?|video-tasks|video-capabilities)$/,
  /^\/api\/admin\/finance\/(?:inventory|report|drafts)$/,
];
const adminWrites = [
  ['POST', /^\/api\/admin\/provider-controls\/commands$/],
  ['POST', /^\/api\/admin\/support\/cases$/],
  ['PATCH', /^\/api\/admin\/support\/cases\/[^/]+$/],
  ['POST', /^\/api\/admin\/configuration\/(?:validations|revisions)$/],
  ['POST', /^\/api\/admin\/users\/[^/]+\/status-commands$/],
  ['POST', /^\/api\/admin\/operations\/[^/]+\/(?:dismissals|restorations)$/],
  ['POST', /^\/api\/admin\/attribute-catalog\/drafts$/],
  ['PUT', /^\/api\/admin\/attribute-catalog\/drafts\/[^/]+\/option$/],
  ['POST', /^\/api\/admin\/attribute-catalog\/drafts\/[^/]+\/(?:validate|visual-candidates\/plan|focused-test\/plan|publish)$/],
  ['POST', /^\/api\/admin\/attribute-catalog\/releases\/[^/]+\/activate$/],
  ['POST', /^\/api\/admin\/attribute-catalog\/rollback$/],
];
const liveReads = [
  /^\/api\/comparisons(?:\/[^/]+)?$/,
  /^\/api\/jobs\/[^/]+(?:\/stream)?$/,
  /^\/api\/generation-groups\/[^/]+$/,
  /^\/api\/generation\/(?:job-center|look-sheet-preset)$/,
  /^\/api\/generation\/video\/(?:capabilities|trusted-sources|tasks(?:\/[^/]+)?)$/,
  /^\/api\/character-profiles(?:\/[^/]+(?:\/looks)?)?$/,
  /^\/api\/character-profiles\/[^/]+\/media\/(?:image|thumbnail|face|sheet)$/,
  /^\/api\/character-profiles\/[^/]+\/looks\/[^/]+\/versions\/[^/]+\/media\/sheet$/,
  /^\/api\/history\/[^/]+(?:\/presentations\/[^/]+)?$/,
  /^\/api\/references\/processing-policy$/,
  /^\/api\/credits\/ledger$/,
];
const liveWrites = [
  ['POST', /^\/api\/comparisons(?:\/estimate)?$/],
  ['PATCH', /^\/api\/comparisons\/[^/]+(?:\/winner)?$/],
  ['DELETE', /^\/api\/comparisons\/[^/]+$/],
  ['POST', /^\/api\/generate$/],
  ['POST', /^\/api\/generation\/(?:prompt-preview|look-sheet-preview)$/],
  ['POST', /^\/api\/generation\/video\/(?:quote|tasks)$/],
  ['POST', /^\/api\/references(?:\/(?:composites|processing-plan))?$/],
  ['POST', /^\/api\/credits\/(?:estimate|mock-grants)$/],
  ['POST', /^\/api\/media\/exports$/],
];
const publicReadPaths = new Set(['/api/me', '/api/mock-users', '/api/health']);
const loopback = (peer) => peer === '127.0.0.1' || peer === '::ffff:127.0.0.1';
const fail = (res, code, status = 403) =>
  res.status(status).json({ error: 'This action is unavailable in the current authentication mode.', code });

// Deliberately limited local workspace admission. Existing capability handlers
// still enforce ownership. Explicit local Admin image/Video Playground admission uses canonical
// Generation/Credits and fresh private-media authorization; other sensitive
// operations stay restricted. This is never a real authentication/session proof.
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
        const role = this.runtime.role ?? 'user';
        const users = await this.userRepository.readAll();
        if (!qualifiedDevelopmentRoster(users, role)) return fail(res, 'auth_development_fixture_unavailable', 503);
        const user = users.find(user => user.id === (this.runtime.actorId ?? developmentFixtureId));
        if (!qualifiedDevelopmentActor(user, role)) return fail(res, 'auth_development_fixture_unavailable', 503);
        req.actorContext = Object.freeze({
          ...this.userRepository.toActorContext(user),
          authMode: 'development_bypass',
          authProvider: 'development_bypass',
        });
        const liveGeneration = role === 'admin' && this.runtime.liveGeneration === true;
        if (liveGeneration) req.reauthorizeIdentity = async () => {
          if (!this.runtime.enabled || this.runtime.role !== 'admin' || !this.runtime.liveGeneration || !this.local(req))
            throw Object.assign(new Error('Authentication unavailable.'), { code: 'auth_session_expired' });
          const currentUsers = await this.userRepository.readAll();
          if (!qualifiedDevelopmentRoster(currentUsers, 'admin'))
            throw Object.assign(new Error('Authentication unavailable.'), { code: 'auth_session_expired' });
          const current = currentUsers.find(user => user.id === this.runtime.actorId);
          if (!qualifiedDevelopmentActor(current, 'admin') || current.id !== req.actorContext.userId)
            throw Object.assign(new Error('Authentication unavailable.'), { code: 'auth_session_expired' });
          return Object.freeze({ ...this.userRepository.toActorContext(current),
            authMode: 'development_bypass', authProvider: 'development_bypass' });
        };
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
            development: { liveGeneration },
          });
        }
        if (requestPath === '/api/mock-users') return res.json({ enabled: false, users: [] });
        if (requestPath.startsWith('/api/auth/')) return fail(res, 'auth_development_mode_unavailable');
        if ((requestPath.startsWith('/outputs') && !(liveGeneration && ['GET', 'HEAD'].includes(req.method)))
          || requestPath.startsWith('/sub-app-game-character'))
          return fail(res, 'auth_development_action_unavailable');
        if (requestPath.startsWith('/api/')) {
          const adminRead = role === 'admin' && adminReads.some(route => route.test(requestPath))
            && ['GET', 'HEAD'].includes(req.method);
          const adminWrite = role === 'admin' && adminWrites.some(([method, route]) =>
            method === req.method && route.test(requestPath));
          const liveRead = liveGeneration && ['GET', 'HEAD'].includes(req.method)
            && liveReads.some(route => route.test(requestPath));
          const liveWrite = liveGeneration && liveWrites.some(([method, route]) =>
            method === req.method && route.test(requestPath));
          if (adminWrite || liveWrite || req.method === 'PATCH' && requestPath === '/api/me/preferences') {
            if (!this.runtime.allowedOrigins.includes(req.headers.origin) || !this.validCsrf(req))
              return fail(res, 'auth_csrf_invalid');
          } else if (!adminRead && !liveRead && (!['GET', 'HEAD'].includes(req.method) || !safeReadPaths.has(requestPath)))
            return fail(res, 'auth_development_action_unavailable');
        }
        return next();
      } catch {
        return fail(res, 'auth_development_fixture_unavailable', 503);
      }
    };
  }
}
