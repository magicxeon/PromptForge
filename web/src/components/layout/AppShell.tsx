import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Coins,
  Menu,
  Search,
  Sparkles,
  UserRound,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/api/apiClient';
import { queryKeys } from '../../lib/api/queryKeys';
import { useActor } from '../../lib/auth/ActorProvider';
import { changeLocale, i18n } from '../../lib/i18n/i18n';
import { Breadcrumbs } from './Breadcrumbs';
import { useFeaturePolicy } from '../../lib/permissions/FeaturePolicyProvider';
import { MomeloBrand } from '../brand/MomeloBrand';
import { SidebarNavigation } from './SidebarNavigation';
import { AppFooter } from './AppFooter';

const creditResponseSchema = z.object({
  account: z.object({
    availableCredits: z.number(),
    reservedCredits: z.number(),
    status: z.string().optional()
  })
});

const SIDEBAR_PREFERENCE_KEY = 'momelo.shell.sidebar-collapsed';

export function AppShell() {
  const { t } = useTranslation('shell');
  const { actor, mockUsers, mockSwitcherEnabled, switchActor } = useActor();
  const { isEnabled } = useFeaturePolicy();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(true);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const actorId = actor?.userId || 'loading';
  const credits = useQuery({
    queryKey: queryKeys.credits(actorId),
    queryFn: () => apiRequest('/api/credits/account', { schema: creditResponseSchema }),
    enabled: Boolean(actor)
  });

  useEffect(() => {
    setMobileOpen(false);
    if (isStudioLocation(location.pathname)) setStudioOpen(true);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      mobileTrigger.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed(value => {
      const next = !value;
      localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(next));
      return next;
    });
  }

  return (
    <div
      className={`app-shell${collapsed ? ' app-shell--collapsed' : ''}`}
      data-testid="application-shell"
    >
      <GlobalHeader
        actor={actor}
        users={mockUsers}
        showSwitcher={mockSwitcherEnabled}
        credits={credits.data?.account.availableCredits}
        onSwitchActor={switchActor}
        menuTriggerRef={mobileTrigger}
        onOpenMenu={() => setMobileOpen(true)}
      />
      <div className="app-shell__workspace">
        {mobileOpen ? (
          <button
            type="button"
            className="app-shell__backdrop"
            aria-label={t('shell.navigation.close')}
            onClick={() => {
              setMobileOpen(false);
              mobileTrigger.current?.focus();
            }}
          />
        ) : null}
        <aside className={`app-sidebar${mobileOpen ? ' is-open' : ''}`}>
          <div className="app-sidebar__mobile-heading">
            <MomeloBrand />
            <button
              type="button"
              className="app-sidebar__close"
              aria-label={t('shell.navigation.close')}
              onClick={() => {
                setMobileOpen(false);
                mobileTrigger.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <SidebarNavigation
            role={actor?.role}
            collapsed={collapsed}
            studioOpen={studioOpen}
            communityEnabled={isEnabled('community.enabled')}
            charactersEnabled={isEnabled('community.characterProfilesEnabled')}
            onToggleCollapsed={toggleCollapsed}
            onToggleStudio={() => setStudioOpen(value => !value)}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
        <div className="app-shell__page-column">
          <div className="app-shell__content">
            {location.pathname !== '/community' ? <Breadcrumbs /> : null}
            <Outlet />
          </div>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}

function GlobalHeader({
  actor,
  users,
  showSwitcher,
  credits,
  onSwitchActor,
  menuTriggerRef,
  onOpenMenu
}: {
  actor: ReturnType<typeof useActor>['actor'];
  users: ReturnType<typeof useActor>['mockUsers'];
  showSwitcher: boolean;
  credits?: number;
  onSwitchActor: (actorId: string) => Promise<void>;
  menuTriggerRef: React.RefObject<HTMLButtonElement | null>;
  onOpenMenu: () => void;
}) {
  const { t } = useTranslation(['shell', 'credits', 'community']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = useMemo(() => searchParams.get('search') || '', [searchParams]);
  const initials = actor?.displayName
    ?.split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'M';

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = String(form.get('search') || '').trim();
    navigate(search ? `/community?search=${encodeURIComponent(search)}` : '/community');
  }

  return (
    <header className="global-header">
      <div className="global-header__inner">
        <button
          ref={menuTriggerRef}
          type="button"
          className="global-header__menu"
          aria-label={t('shell.navigation.menu')}
          onClick={onOpenMenu}
        >
          <Menu aria-hidden="true" />
        </button>
        <Link to="/community" className="global-header__brand" aria-label={t('shell.navigation.homeLabel')}>
          <MomeloBrand />
        </Link>
        <form className="global-header__search" onSubmit={submitSearch}>
          <Search aria-hidden="true" />
          <input
            key={initialSearch}
            name="search"
            defaultValue={initialSearch}
            aria-label={t('shell.navigation.searchLabel')}
            placeholder={t('community.feed.searchPlaceholder', {
              ns: 'community',
              defaultValue: 'Search Community'
            })}
          />
        </form>
        <Link to="/studio" className="global-header__create">
          <Sparkles aria-hidden="true" />
          <span>{t('shell.navigation.create')}</span>
        </Link>
        <Link
          to="/credits"
          className="global-header__credits"
          title={t('badge.available', {
            ns: 'credits',
            defaultValue: 'Available Credits'
          })}
        >
          <strong>{credits ?? '...'}</strong>
          <Coins aria-hidden="true" />
        </Link>
        <label className="sr-only" htmlFor="react-language-select">
          {t('shell.languageLabel')}
        </label>
        <select
          id="react-language-select"
          value={(i18n.resolvedLanguage || 'th').split('-')[0]}
          onChange={event => void changeLocale(event.target.value as 'th' | 'en')}
          className="global-header__language"
        >
          <option value="th">TH</option>
          <option value="en">EN</option>
        </select>
        <div className="global-header__account">
          <span className="global-header__avatar" aria-hidden="true">
            {actor ? initials : <UserRound />}
          </span>
          {showSwitcher ? (
            <>
              <label className="sr-only" htmlFor="react-actor-select">
                {t('shell.activeUserLabel')}
              </label>
              <select
                id="react-actor-select"
                value={actor?.userId || ''}
                onChange={event => void onSwitchActor(event.target.value)}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span>{actor?.displayName || '...'}</span>
          )}
        </div>
      </div>
    </header>
  );
}

function readCollapsedPreference() {
  return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true';
}

function isStudioLocation(pathname: string) {
  return pathname === '/studio' || pathname === '/studio/scene' || pathname === '/create/scenes';
}
