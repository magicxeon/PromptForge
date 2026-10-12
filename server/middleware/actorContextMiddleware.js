import { randomUUID } from 'node:crypto';
import { permitsOptionalIdentityRead } from '../config/identityAccessPolicy.js';

// Exact fresh workflows retain the facade's Origin, CSRF and purpose checks.
const freshPosts = new Set([
  '/api/auth/login', '/api/auth/challenges',
  '/api/auth/register', '/api/auth/enrollment-intents', '/api/auth/password/reset',
  '/api/auth/action-contexts', '/api/auth/action-assurance', '/api/auth/operations/prepare',
  '/api/auth/social/google/start', '/api/auth/social/google/email',
  '/api/auth/social/facebook/start', '/api/auth/social/facebook/email',
  '/api/auth/social/facebook/deauthorization', '/api/auth/social/facebook/deletion',
]);
const freshGets = new Set([
  '/api/auth/config', '/api/auth/social/google/callback', '/api/auth/social/google/result',
  '/api/auth/social/facebook/callback', '/api/auth/social/facebook/result',
  '/api/auth/social/facebook/deletion-status',
]);
const permitsFreshIdentity = (method, pathname) => !/[%\\\x00]/.test(pathname) && (
  method === 'POST' && (freshPosts.has(pathname) || /^\/api\/auth\/challenges\/[A-Za-z0-9_-]{16,128}\/verify$/.test(pathname)) ||
  ['GET', 'HEAD'].includes(method) && (freshGets.has(pathname) || /^\/api\/auth\/operations\/[A-Za-z0-9_-]{16,128}$/.test(pathname))
);

export function createRealActorContextMiddleware({ identityApplicationService: identity }) {
  if (!identity?.cookies || typeof identity.withRequestPeer !== 'function') throw new Error('Identity facade required.');
  return async function realActorContext(req, res, next) {
    req.requestId = randomUUID();
    req.actorContext = null;
    try {
      return await identity.withRequestPeer(req.socket?.remoteAddress, async () => {
        // Parse first: malformed/duplicate cookies never become stale sessions.
        identity.cookies.read(req.headers?.cookie ?? '');
        try {
          req.actorContext = await identity.resolveActor(req.headers?.cookie ?? '', req.requestId);
        } catch (error) {
          if (error?.code !== 'auth_session_expired' || !(
            permitsOptionalIdentityRead(req.method, req.path) || permitsFreshIdentity(req.method, req.path)
          )) throw error;
          const name = identity.cookies.names.session;
          req.headers.cookie = (req.headers.cookie ?? '').split(';')
            .filter(part => part.trim().split('=')[0] !== name).join(';');
        }
        return next();
      });
    } catch (error) {
      req.actorContext = null;
      const code = ['auth_forbidden', 'auth_mfa_required', 'auth_session_expired'].includes(error?.code)
        ? error.code === 'auth_mfa_required' ? 'auth_forbidden' : error.code : 'auth_service_unavailable';
      res.setHeader('Cache-Control', 'no-store');
      return res.status(code === 'auth_service_unavailable' ? 503 : code === 'auth_forbidden' ? 403 : 401).json({
        error: 'Authentication unavailable.', code, requestId: req.requestId,
      });
    }
  };
}

// Import compatibility only. Mock headers/default actors have no authority.
// Isolated development uses IdentityDevelopmentService explicitly.
export function actorContextMiddleware(req, res) {
  req.actorContext = null;
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'Authentication unavailable.', code: 'auth_service_unavailable' });
}
