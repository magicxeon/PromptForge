import { Navigate, useLocation, useParams } from 'react-router-dom';
import { routePaths } from '../../app/routeRegistry/routes';

export function LegacyRouteRedirect({ to }: { to: string }) {
  const location = useLocation();
  const params = useParams();
  const resolvedPath = Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}?`, value ? encodeURIComponent(value) : '').replace(`:${key}`, value ? encodeURIComponent(value) : ''),
    to
  ).replace(/\/:[^/]+\?/g, '');
  const target = new URL(resolvedPath, window.location.origin);
  if (!target.search) target.search = location.search;
  if (!target.hash) target.hash = location.hash;
  return <Navigate to={`${target.pathname}${target.search}${target.hash}`} replace />;
}

export function LegacyStudioRedirect() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const target = search.get('mode') === 'character-sheet'
    ? routePaths.createStudioCharacter
    : routePaths.createStudioFace;
  search.delete('mode');
  return <Navigate to={`${target}${search.size ? `?${search}` : ''}${location.hash}`} replace />;
}
