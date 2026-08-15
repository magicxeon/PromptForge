import fs from 'fs';
import path from 'path';
import { WEB_DIST_ROOT } from '../config/paths.js';

const routeOwnershipConfig = JSON.parse(fs.readFileSync(
  new URL('../config/frontend-route-ownership.json', import.meta.url),
  'utf8'
));

const compiledRoutes = routeOwnershipConfig.routes.flatMap(route =>
  route.patterns.map(pattern => ({
    id: route.id,
    runtime: route.runtime,
    enabled: route.enabled !== false,
    pattern,
    matcher: compilePattern(pattern)
  }))
);

export function resolveFrontendRoute(pathname) {
  const normalizedPath = normalizePath(pathname);
  const match = compiledRoutes.find(route => route.matcher.test(normalizedPath));
  if (!match) {
    return { matched: false, runtime: null, routeId: null, pathname: normalizedPath };
  }

  const requestedRuntime = match.enabled ? match.runtime : routeOwnershipConfig.defaultRuntime;
  const reactBuildAvailable = fs.existsSync(path.join(WEB_DIST_ROOT, 'index.html'));

  return {
    matched: true,
    runtime: requestedRuntime,
    requestedRuntime,
    reactBuildAvailable,
    routeId: match.id,
    pathname: normalizedPath
  };
}

function compilePattern(pattern) {
  const normalized = normalizePath(pattern);
  const expression = normalized
    .split('/')
    .map(segment => segment.startsWith(':') ? '[^/]+' : escapeRegExp(segment))
    .join('/');
  return new RegExp(`^${expression}/?$`);
}

function normalizePath(value) {
  const pathname = String(value || '/').split(/[?#]/, 1)[0] || '/';
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
