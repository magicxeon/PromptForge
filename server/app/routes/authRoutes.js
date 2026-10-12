// Canonical handlers mount after the real actor resolver and 32KiB Auth-only
// parsers, before the shared private admission gate. The facade owns all proofs.
export function registerAuthRoutes(app, { identityApplicationService: identity }) {
  if (!identity) throw new Error('Identity facade required.');
  const request = (req) => ({
    cookieHeader: req.headers?.cookie ?? '',
    origin: req.headers?.origin,
    csrfToken: req.headers?.['x-csrf-token'],
  });
  const handler =
    (work, status = 200, acceptsBody = false) =>
    async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      try {
        if (
          req.body !== undefined &&
          (JSON.stringify(req.body).length > 32768 ||
            !req.body ||
            ![Object.prototype, null].includes(Object.getPrototypeOf(req.body)) ||
            (!acceptsBody && Object.keys(req.body).length))
        )
          throw Object.assign(new Error(), { code: 'auth_forbidden' });
        const result = await work(req);
        if (result?.cookies?.length) res.setHeader('Set-Cookie', result.cookies);
        if (['/auth/callback?provider=google', '/auth/callback?provider=facebook'].includes(result?.redirect))
          return res.redirect(303, result.redirect);
        if (status === 204) return res.status(204).end();
        return res.status(status).json(result?.body ?? result);
      } catch (error) {
        const code = error?.code === 'IDENTITY_RATE_LIMITED' ? 'auth_rate_limited' : [
          'auth_forbidden',
          'auth_session_expired',
          'auth_service_unavailable',
          'auth_invalid_credentials',
          'auth_rate_limited',
          'auth_password_policy',
          'auth_social_unavailable',
        ].includes(error?.code)
          ? error.code
          : 'auth_service_unavailable';
        return res
          .status(
            ['auth_password_policy', 'auth_social_unavailable'].includes(code)
              ? 400
              : code === 'auth_forbidden'
                ? 403
                : ['auth_session_expired', 'auth_invalid_credentials'].includes(code)
                  ? 401
                  : code === 'auth_rate_limited'
                    ? 429
                    : 503
          )
          .json({
            error: 'Authentication unavailable.',
            code,
            requestId: typeof req.requestId === 'string' ? req.requestId.slice(0, 128) : null,
          });
      }
    };
  app.get(
    '/api/auth/config',
    handler((req) => identity.config(req.headers?.cookie ?? ''))
  );
  app.post(
    '/api/auth/social/google/start',
    handler((req) => identity.startGoogle(request(req), req.body), 200, true)
  );
  app.get(
    '/api/auth/social/google/callback',
    handler((req) => identity.callbackGoogle(req.headers?.cookie ?? '', req.query))
  );
  app.get(
    '/api/auth/social/google/result',
    handler((req) => identity.googleResult(req.headers?.cookie ?? '', req.query))
  );
  app.post(
    '/api/auth/social/google/email',
    handler(
      (req) => identity.googleEmail(request(req), req.body, req.headers?.['idempotency-key']),
      202,
      true
    )
  );
  app.post('/api/auth/social/facebook/start', handler((req) => identity.startFacebook(request(req), req.body), 200, true));
  app.get('/api/auth/social/facebook/callback', handler((req) => identity.callbackFacebook(req.headers?.cookie ?? '', req.query)));
  app.get('/api/auth/social/facebook/result', handler((req) => identity.facebookResult(req.headers?.cookie ?? '', req.query)));
  app.post('/api/auth/social/facebook/email', handler((req) => identity.facebookEmail(request(req), req.body, req.headers?.['idempotency-key']), 202, true));
  app.post('/api/auth/social/facebook/deauthorization', handler((req) => identity.facebookEvent('deauthorization', req.body), 200, true));
  app.post('/api/auth/social/facebook/deletion', handler((req) => identity.facebookEvent('deletion_request', req.body), 200, true));
  app.get('/api/auth/social/facebook/deletion-status', handler((req) => identity.facebookDeletionStatus(req.query)));
  app.post(
    '/api/auth/password/reset',
    handler(
      (req) => identity.resetPassword(request(req), req.body, req.headers?.['idempotency-key']),
      200,
      true
    )
  );
  app.post(
    '/api/auth/action-contexts',
    handler((req) => identity.createActionContext(request(req), req.body), 200, true)
  );
  app.post(
    '/api/auth/reauthentication',
    handler((req) => identity.grantActionAssurance(request(req), req.body), 200, true)
  );
  app.post(
    '/api/auth/operations/prepare',
    handler(
      (req) => identity.prepareOperation(request(req), req.body, req.headers?.['idempotency-key']),
      200,
      true
    )
  );
  app.get(
    '/api/auth/operations/:id',
    handler((req) => identity.lookupOperation(req.headers?.cookie ?? '', req.params.id))
  );
  app.post(
    '/api/auth/challenges',
    handler(
      (req) => identity.issueChallenge(request(req), req.body, req.headers?.['idempotency-key']),
      202,
      true
    )
  );
  app.post(
    '/api/auth/challenges/:id/verify',
    handler((req) => identity.verifyChallenge(request(req), req.params.id, req.body), 200, true)
  );
  app.post(
    '/api/auth/register',
    handler((req) => identity.completeEnrollment(request(req), req.body), 200, true)
  );
  app.post(
    '/api/auth/enrollment-intents',
    handler((req) => identity.enrollmentIntent(request(req), req.body), 200, true)
  );
  app.post(
    '/api/auth/login',
    handler((req) => identity.loginPassword(request(req), req.body), 200, true)
  );
  app.get(
    '/api/me/sessions',
    handler((req) => identity.list({ cookieHeader: req.headers?.cookie ?? '', query: req.query ?? {} }))
  );
  app.post(
    '/api/auth/logout',
    handler((req) => identity.logout(request(req)), 204)
  );
  app.post(
    '/api/auth/logout-all',
    handler((req) => identity.logout(request(req), { all: true }), 204)
  );
  app.delete(
    '/api/me/sessions/:id',
    handler((req) => identity.revoke(request(req), req.params.id), 204)
  );
}
