import { performanceTelemetry } from '../domain/observability/PerformanceTelemetry.js';

export function requestPerformanceMiddleware(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  const finish = performanceTelemetry.start('http.request', {
    requestId: req.requestId || null
  });
  const startedAt = performance.now();
  res.once('finish', () => {
    const durationMs = performance.now() - startedAt;
    finish(res.statusCode >= 500 ? 'error' : 'ok');
    const threshold = Number(process.env.SLOW_API_LOG_THRESHOLD_MS) || 500;
    if (durationMs >= threshold) {
      console.warn('[Performance]', JSON.stringify({
        operation: 'http.request',
        method: req.method,
        route: req.route?.path || req.path,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs),
        requestId: req.requestId || null
      }));
    }
  });
  next();
}
