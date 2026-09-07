import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routePaths } from '../../../app/routeRegistry/routes';
import { useActor } from '../../../lib/auth/ActorProvider';

export function AdminNavigation() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-[var(--mpf-border)]" aria-label={t('admin.navigation.label')}>
      <NavLink end to={routePaths.admin} className={navigationClassName}>
        {t('admin.navigation.dashboard')}
      </NavLink>
      <NavLink to={routePaths.adminOperations} className={navigationClassName}>
        {t('admin.navigation.operations')}
      </NavLink>
      <NavLink to={routePaths.adminAttributes} className={navigationClassName}>
        {t('admin.navigation.attributes')}
      </NavLink>
      <NavLink to={routePaths.adminCinematic} className={navigationClassName}>
        {t('admin.navigation.cinematic')}
      </NavLink>
      <NavLink to={routePaths.adminProviders} className={navigationClassName}>
        {t('admin.navigation.providers')}
      </NavLink>
      <NavLink to={routePaths.adminControlPlane} className={navigationClassName}>
        {t('admin.navigation.controlPlane')}
      </NavLink>
      {actor?.role === 'admin' ? <NavLink to={routePaths.adminFinance} className={navigationClassName}>
        {t('finance.title')}
      </NavLink> : null}
    </nav>
  );
}

function navigationClassName({ isActive }: { isActive: boolean }) {
  return `shrink-0 border-b-2 px-4 py-3 text-sm ${isActive
    ? 'border-cyan-400 text-[var(--mpf-text)]'
    : 'border-transparent text-[var(--mpf-text-muted)] hover:text-[var(--mpf-text)]'}`;
}
