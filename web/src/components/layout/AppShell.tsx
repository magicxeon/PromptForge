import { useMemo, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Coins,
  Columns3,
  FlaskConical,
  FolderOpen,
  History,
  Home,
  Search,
  Settings,
  Shirt,
  Sparkles,
  UserRound,
  UsersRound
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/api/apiClient';
import { queryKeys } from '../../lib/api/queryKeys';
import { useActor } from '../../lib/auth/ActorProvider';
import { changeLocale, i18n } from '../../lib/i18n/i18n';
import { cn } from '../../lib/utils/cn';
import { Breadcrumbs } from './Breadcrumbs';
import {
  visibleNavigationRoutes,
  type NavigationRouteId
} from '../../app/routeRegistry/routes';
import { useFeaturePolicy } from '../../lib/permissions/FeaturePolicyProvider';

const creditResponseSchema = z.object({
  account: z.object({
    availableCredits: z.number(),
    reservedCredits: z.number(),
    status: z.string().optional()
  })
});

const navIcons = {
  home: Home,
  characters: UsersRound,
  studio: Sparkles,
  fashion: Shirt,
  playground: FlaskConical,
  comparisons: Columns3,
  history: History,
  collections: FolderOpen,
  admin: Settings
} satisfies Record<NavigationRouteId, typeof Home>;

export function AppShell() {
  const { t } = useTranslation(['shell', 'credits', 'community']);
  const { actor, mockUsers, mockSwitcherEnabled, switchActor } = useActor();
  const { isEnabled } = useFeaturePolicy();
  const actorId = actor?.userId || 'loading';
  const credits = useQuery({
    queryKey: queryKeys.credits(actorId),
    queryFn: () => apiRequest('/api/credits/account', { schema: creditResponseSchema }),
    enabled: Boolean(actor)
  });

  return (
    <div className="min-h-screen" data-testid="application-shell">
      <GlobalHeader
        actor={actor}
        users={mockUsers}
        showSwitcher={mockSwitcherEnabled}
        credits={credits.data?.account.availableCredits}
        onSwitchActor={switchActor}
      />
      <div className="mx-auto grid max-w-[var(--mpf-content-max)] grid-cols-1 px-3 pb-8 pt-[calc(var(--mpf-header-height)+12px)] md:grid-cols-[var(--mpf-sidebar-width)_minmax(0,1fr)] md:gap-4 md:px-5">
        <aside className="sticky top-[calc(var(--mpf-header-height)+12px)] z-20 mb-4 self-start overflow-x-auto border-b border-[var(--mpf-border)] bg-[var(--mpf-bg)] md:mb-0 md:h-[calc(100vh-var(--mpf-header-height)-28px)] md:overflow-visible md:border md:bg-[var(--mpf-bg-raised)]">
          <nav className="flex min-w-max gap-1 p-2 md:min-w-0 md:flex-col" aria-label={t('shell.navigation.menu', 'Menu')}>
            {visibleNavigationRoutes(actor?.role)
              .filter(item => item.id !== 'characters' || isEnabled('community.characterProfilesEnabled'))
              .filter(item => item.id !== 'home' || isEnabled('community.enabled'))
              .map(item => {
              const Icon = navIcons[item.id];
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) => navClass(isActive)}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
              })}
          </nav>
        </aside>
        <div className="min-w-0">
          <Breadcrumbs />
          <Outlet />
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
  onSwitchActor
}: {
  actor: ReturnType<typeof useActor>['actor'];
  users: ReturnType<typeof useActor>['mockUsers'];
  showSwitcher: boolean;
  credits?: number;
  onSwitchActor: (actorId: string) => Promise<void>;
}) {
  const { t } = useTranslation(['shell', 'credits', 'community']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = useMemo(() => searchParams.get('search') || '', [searchParams]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = String(form.get('search') || '').trim();
    navigate(search ? `/community?search=${encodeURIComponent(search)}` : '/community');
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[var(--mpf-header-height)] border-b border-[var(--mpf-border)] bg-[#070911f2] backdrop-blur">
      <div className="mx-auto flex h-full max-w-[var(--mpf-content-max)] items-center gap-3 px-4">
        <Link to="/community" className="flex shrink-0 items-center gap-2 text-white no-underline">
          <span className="grid size-8 place-items-center rounded-[var(--mpf-radius-sm)] border border-cyan-400/60 bg-gradient-to-br from-cyan-400/20 to-pink-500/20 font-bold text-cyan-200">M</span>
          <strong className="hidden text-lg sm:block">momelo</strong>
        </Link>
        <form className="relative hidden max-w-xl flex-1 lg:block" onSubmit={submitSearch}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mpf-text-muted)]" aria-hidden="true" />
          <input
            key={initialSearch}
            name="search"
            defaultValue={initialSearch}
            aria-label={t('shell.navigation.searchLabel', 'Search')}
            placeholder={t('community.feed.searchPlaceholder', { ns: 'community', defaultValue: 'Search Community' })}
            className="h-10 w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] pl-10 pr-3 text-sm text-white"
          />
        </form>
        <Link
          to="/studio"
          className="ml-auto hidden min-h-10 items-center gap-2 rounded-[var(--mpf-radius-sm)] bg-gradient-to-r from-cyan-500 to-pink-500 px-4 text-sm font-semibold text-white no-underline sm:flex"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          {t('shell.navigation.create', 'Create')}
        </Link>
        <NavLink to="/credits" className="flex min-h-10 items-center gap-2 border-l border-[var(--mpf-border)] pl-3 text-sm text-amber-300 no-underline" title={t('badge.available', { ns: 'credits', defaultValue: 'Available Credits' })}>
          <Coins className="size-4" aria-hidden="true" />
          <strong>{credits ?? '...'}</strong>
        </NavLink>
        <label className="sr-only" htmlFor="react-language-select">{t('shell.languageLabel', 'Language')}</label>
        <select
          id="react-language-select"
          value={(i18n.resolvedLanguage || 'th').split('-')[0]}
          onChange={event => void changeLocale(event.target.value as 'th' | 'en')}
          className="h-9 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-2 text-xs"
        >
          <option value="th">TH</option>
          <option value="en">EN</option>
        </select>
        {showSwitcher ? (
          <>
            <label className="sr-only" htmlFor="react-actor-select">{t('shell.activeUserLabel', 'Active Mock User')}</label>
            <select
              id="react-actor-select"
              value={actor?.userId || ''}
              onChange={event => void onSwitchActor(event.target.value)}
              className="h-9 max-w-36 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-2 text-xs"
            >
              {users.map(user => <option key={user.id} value={user.id}>{user.displayName}</option>)}
            </select>
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm">
            <UserRound className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{actor?.displayName || '...'}</span>
          </span>
        )}
      </div>
    </header>
  );
}

function navClass(active: boolean) {
  return cn(
    'flex min-h-11 items-center gap-3 rounded-[var(--mpf-radius-sm)] px-3 py-2 text-sm no-underline transition',
    active
      ? 'bg-cyan-400/10 text-cyan-200 ring-1 ring-inset ring-cyan-400/35'
      : 'text-[var(--mpf-text-muted)] hover:bg-white/5 hover:text-white'
  );
}
