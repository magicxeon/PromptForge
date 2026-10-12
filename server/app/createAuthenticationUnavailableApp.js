import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IdentityPublicPolicyService } from '../domain/identity/IdentityPublicPolicyService.js';

// Read-only guest composition. Import no capability singletons, mutable path
// registry, repository, provider, worker or recovery code before real Identity
// composition is qualified. Explicit roots support isolated HTTP fixtures.
export function createAuthenticationUnavailableApp({
  webDistRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  i18nRoot = fileURLToPath(new URL('../../client/i18n/', import.meta.url)),
  brandRoot = fileURLToPath(new URL('../../client/assets/brand/', import.meta.url)),
} = {}) {
  const app = express();
  app.locals.authRuntimeReady = false;
  app.locals.billableRecoveryReady = false;
  app.use((req, res, next) => {
    req.actorContext = null;
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/auth/config', (req, res) => {
    res.json({ ...new IdentityPublicPolicyService().project(), csrfToken: null });
  });
  app.get('/api/me', (req, res) => res.json(null));
  app.get('/api/mock-users', (req, res) => res.json({ enabled: false, users: [] }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', authentication: 'unavailable' }));
  app.use((req, res, next) => {
    const route = req.path.toLowerCase();
    if (
      !['GET', 'HEAD'].includes(req.method) ||
      route === '/api' ||
      route.startsWith('/api/') ||
      route.startsWith('/outputs') ||
      route.startsWith('/sub-app-game-character')
    ) {
      return res.status(503).json({ code: 'auth_service_unavailable', error: 'Authentication unavailable.' });
    }
    next();
  });
  app.use('/react-assets', express.static(path.join(webDistRoot, 'react-assets')));
  app.use('/i18n', express.static(i18nRoot));
  app.use('/assets/brand', express.static(brandRoot));
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDistRoot, 'index.html'), (error) => {
      if (error && !res.headersSent)
        res.status(503).json({ code: 'auth_service_unavailable', error: 'Authentication unavailable.' });
    });
  });
  return app;
}
