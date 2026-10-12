import { permitsOptionalIdentityRead, requiresIdentityAdmission } from '../config/identityAccessPolicy.js';

const denial = (req, res, code, status) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json({ error: 'Authentication unavailable.', code, requestId: req.requestId ?? null });
};

// Mount after explicitly registered Auth endpoints and optional session
// resolution, before any private API/media handler. This never grants ownership.
export function createIdentityAccessMiddleware({ identityApplicationService: identity }) {
  if (typeof identity?.actorProof !== 'function' || typeof identity?.unsafe !== 'function'
    || typeof identity?.resolveActor !== 'function') throw new Error('Identity facade required.');
  return async (req, res, next) => {
    if (!requiresIdentityAdmission(req.path)) return next();
    const optional = permitsOptionalIdentityRead(req.method, req.path);
    if (optional && !req.actorContext) return next();
    try {
      const actor = req.actorContext;
      if (!actor || actor.authMode !== 'session' || actor.isMockActor !== false
        || actor.accountStatus !== 'active') return denial(req, res, 'auth_session_expired', 401);
      identity.actorProof(actor);
      if (/^\/api\/admin(?:\/|$)/i.test(req.path) && !['admin', 'support'].includes(actor.role))
        return denial(req, res, 'auth_forbidden', 403);
      if (!['GET', 'HEAD'].includes(req.method)) await identity.unsafe({
        cookieHeader: req.headers?.cookie ?? '', origin: req.headers?.origin,
        csrfToken: req.headers?.['x-csrf-token'],
      });
      const cookieHeader = req.headers?.cookie ?? '', requestId = req.requestId;
      req.reauthorizeIdentity = async () => {
        const current = await identity.resolveActor(cookieHeader, requestId);
        if (!current || current.userId !== actor.userId || current.securityVersion !== actor.securityVersion
          || current.authMode !== 'session' || current.accountStatus !== 'active' || current.isMockActor !== false)
          throw Object.assign(new Error('Authentication unavailable.'), { code: 'auth_session_expired' });
        identity.actorProof(current);
        return current;
      };
      if (!optional) res.setHeader('Cache-Control', 'no-store');
      return next();
    } catch (error) {
      const code = ['auth_forbidden', 'auth_csrf_invalid', 'auth_session_expired'].includes(error?.code)
        ? error.code : 'auth_service_unavailable';
      return denial(req, res, code, code === 'auth_session_expired' ? 401 : code === 'auth_service_unavailable' ? 503 : 403);
    }
  };
}
