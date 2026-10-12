import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeAuthRuntime } from './config/authPolicy.js';
import { readIdentityRuntimeConfig } from './config/identityRuntime.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const unavailableCode = 'AUTH_RUNTIME_STARTUP_UNAVAILABLE';

// Import protected capability singletons only after configuration AND durable
// schema qualification. Tests inject loaders without importing the workspace app.
export async function prepareServerComposition({ env = process.env, root = projectRoot,
  initialize = initializeAuthRuntime,
  loadIdentity = () => import('./domain/identity/createIdentityRuntime.js'),
  loadProtected = () => import('./app/createApp.js'),
  loadUnavailable = () => import('./app/createAuthenticationUnavailableApp.js'),
  report = () => {} } = {}) {
  let identityRuntime, authRuntime;
  const reportFailure = () => { try { report({ code: unavailableCode }); } catch {} };
  try {
    authRuntime = initialize(env, root);
    const runtime = readIdentityRuntimeConfig(env);
    if (!['true', 'false', undefined].includes(env.AUTH_BILLABLE_RECOVERY_ENABLED)) throw new Error();
    if (runtime) {
      const { isIdentityRuntimeDeploymentReady } = await import('./domain/identity/createIdentityRuntime.js');
      const owner = await loadIdentity();
      identityRuntime = await owner.createIdentityRuntime({ runtime, onError: reportFailure });
      if (!isIdentityRuntimeDeploymentReady(identityRuntime)) throw new Error();
    }
    if (authRuntime.enabled || identityRuntime) {
      const { createApp } = await loadProtected();
      const app = createApp({ authRuntime, identityRuntime,
        billableRecoveryReady: !!identityRuntime && env.AUTH_BILLABLE_RECOVERY_ENABLED === 'true' });
      return { app, authRuntime, identityRuntime };
    }
  } catch {
    await Promise.resolve(identityRuntime?.close?.()).catch(() => {});
    identityRuntime = undefined;
    reportFailure();
  }
  const { createAuthenticationUnavailableApp } = await loadUnavailable();
  const port = Number(env.PORT ?? 6500);
  return { app: createAuthenticationUnavailableApp(), identityRuntime: undefined,
    authRuntime: { enabled: false, host: '127.0.0.1', port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : 6500 } };
}

export async function listenServer(composition, { env = process.env,
  loadRecovery = () => import('./domain/generation/VideoRecoveryMonitor.js'),
  signals = process, report = () => {} } = {}) {
  const { app, authRuntime, identityRuntime } = composition;
  let videoRecoveryMonitor, closing;
  const server = app.listen(authRuntime.port, authRuntime.host);
  const shutdown = () => {
    if (closing) return closing;
    closing = (async () => {
      videoRecoveryMonitor?.stop();
      const httpClosed = new Promise(resolve => server.close(resolve));
      server.closeIdleConnections?.();
      const deadline = setTimeout(() => server.closeAllConnections?.(), 5000);
      deadline.unref?.();
      try { await httpClosed; } finally {
        clearTimeout(deadline);
        await identityRuntime?.close?.();
        signals.removeListener('SIGINT', shutdown); signals.removeListener('SIGTERM', shutdown);
      }
    })();
    return closing;
  };
  try {
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    if (app.locals.authRuntimeReady || app.locals.billableRecoveryReady) {
      const { isIdentityRuntimeDeploymentReady } = await import('./domain/identity/createIdentityRuntime.js');
      if (!isIdentityRuntimeDeploymentReady(identityRuntime) ||
        composition.authRuntime.enabled || app.locals.billableRecoveryReady && !app.locals.authRuntimeReady)
        throw new Error();
    }
    signals.once('SIGINT', shutdown); signals.once('SIGTERM', shutdown);
    if (app.locals.authRuntimeReady) identityRuntime.start();
    // Login readiness does not authorize persisted billable recovery.
    if (app.locals.billableRecoveryReady) {
      const { VideoRecoveryMonitor } = await loadRecovery();
      const { collectionManager, comparisonOrchestrator, getAttributesBundle,
        startBillableRecovery, videoGenerationApplicationService } = app.locals.modelPromptForge ?? {};
      if (env.ENABLED_CACHE_ATTRIBUTE_BUNDLE === 'true' && env.REFRESH_CACHE_ATTRIBUTE_BUNDLE === 'true')
        getAttributesBundle?.().catch(() => report({ code: 'ATTRIBUTE_CACHE_UNAVAILABLE' }));
      await collectionManager?.init?.(); await comparisonOrchestrator?.init?.();
      await startBillableRecovery?.();
      await videoGenerationApplicationService?.resumeRecoverable?.();
      if (videoGenerationApplicationService?.resumeRecoverable) {
        videoRecoveryMonitor = new VideoRecoveryMonitor({ recover: () => videoGenerationApplicationService.resumeRecoverable() });
        videoRecoveryMonitor.start();
      }
    }
    return { server, shutdown };
  } catch {
    await shutdown().catch(() => {});
    throw Object.assign(new Error('Authentication startup unavailable.'), { code: unavailableCode });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config();
  const composition = await prepareServerComposition({ report: event => console.warn('[Identity]', event.code) });
  if (composition.authRuntime.enabled)
    console.warn('[Identity] Isolated local Login bypass active; paid and security actions unavailable.');
  await listenServer(composition, { report: event => console.warn('[Startup]', event.code) });
  console.log(`Server listening on ${composition.authRuntime.host}:${composition.authRuntime.port}`);
}
