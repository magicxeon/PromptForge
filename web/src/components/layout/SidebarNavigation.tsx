import {
  ChevronDown,
  ChevronLeft,
  Columns3,
  ContactRound,
  FlaskConical,
  FolderOpen,
  Home,
  ImagePlus,
  Images,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ScanFace,
  Settings,
  Shirt,
  Sparkles,
  UsersRound
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  isSidebarNavigationTargetActive,
  sidebarNavigationGroups,
  type SidebarNavigationItem
} from '../../app/routeRegistry/routes';
import { cn } from '../../lib/utils/cn';
import { scheduleHashTargetScroll } from '../../lib/navigation/hashScroll';

const iconRegistry = {
  home: Home,
  studio: Sparkles,
  face: ScanFace,
  character: ContactRound,
  scene: Images,
  fashion: Shirt,
  playground: FlaskConical,
  comparisons: Columns3,
  characters: UsersRound,
  history: ImagePlus,
  collections: FolderOpen,
  admin: Settings,
  fallback: LayoutDashboard
} as const;

export function SidebarNavigation({
  role,
  collapsed,
  studioOpen,
  communityEnabled,
  charactersEnabled,
  onToggleCollapsed,
  onToggleStudio,
  onNavigate
}: {
  role?: string;
  collapsed: boolean;
  studioOpen: boolean;
  communityEnabled: boolean;
  charactersEnabled: boolean;
  onToggleCollapsed: () => void;
  onToggleStudio: () => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation('shell');
  const location = useLocation();

  return (
    <div className="sidebar-navigation">
      <nav aria-label={t('shell.navigation.menu')}>
        {sidebarNavigationGroups.map(group => {
          const items = group.items.filter(item =>
            isVisible(item, role, communityEnabled, charactersEnabled)
          );
          if (!items.length) return null;
          return (
            <section className="sidebar-navigation__group" key={group.id}>
              {group.labelKey && !collapsed ? (
                <h2>{t(group.labelKey)}</h2>
              ) : null}
              <div className="sidebar-navigation__items">
                {items.map(item => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    location={`${location.pathname}${location.search}`}
                    collapsed={collapsed}
                    studioOpen={studioOpen}
                    child={false}
                    onToggleStudio={onToggleStudio}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </nav>
      <button
        type="button"
        className="sidebar-navigation__collapse"
        onClick={onToggleCollapsed}
        title={t('shell.navigation.collapse')}
      >
        {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        {!collapsed ? <span>{t('shell.navigation.collapse')}</span> : null}
      </button>
    </div>
  );
}

function SidebarItem({
  item,
  location,
  collapsed,
  studioOpen,
  child,
  onToggleStudio,
  onNavigate
}: {
  item: SidebarNavigationItem;
  location: string;
  collapsed: boolean;
  studioOpen: boolean;
  child: boolean;
  onToggleStudio: () => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation('shell');
  const Icon = iconRegistry[item.icon as keyof typeof iconRegistry] || iconRegistry.fallback;
  const active = item.children
    ? item.children.some(child => isSidebarNavigationTargetActive(child.id, location))
    : isSidebarNavigationTargetActive(item.id, location);

  if (item.children) {
    if (collapsed) {
      const collapsedDestination = item.children.find(child => child.id === 'scene-builder')
        || item.children[0];
      return (
        <div className={cn('sidebar-navigation__parent', active && 'is-active')}>
          <Link
            to={collapsedDestination?.path || '/studio/scene'}
            className={cn('sidebar-navigation__row', active && 'is-active')}
            aria-current={active ? 'page' : undefined}
            title={t(item.labelKey)}
            onClick={() => {
              onNavigate();
              const path = collapsedDestination?.path;
              if (path?.includes('#')) {
                scheduleHashTargetScroll(path.slice(path.indexOf('#')));
              }
            }}
          >
            <Icon aria-hidden="true" />
          </Link>
        </div>
      );
    }

    return (
      <div className={cn('sidebar-navigation__parent', active && 'is-active')}>
        <button
          type="button"
          className="sidebar-navigation__row"
          aria-expanded={studioOpen}
          onClick={onToggleStudio}
        >
          <Icon aria-hidden="true" />
          <span>{t(item.labelKey)}</span>
          <ChevronDown
            className={cn('sidebar-navigation__chevron', studioOpen && 'is-open')}
            aria-hidden="true"
          />
        </button>
        {studioOpen ? (
          <div className="sidebar-navigation__children">
            {item.children.map(child => (
              <SidebarItem
                key={child.id}
                item={child}
                location={location}
                collapsed={false}
                studioOpen={studioOpen}
                child
                onToggleStudio={onToggleStudio}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      to={item.path || '/community'}
      className={cn(
        'sidebar-navigation__row',
        child && 'is-child',
        active && 'is-active'
      )}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? t(item.labelKey) : undefined}
      onClick={() => {
        onNavigate();
        if (item.path?.includes('#')) {
          scheduleHashTargetScroll(item.path.slice(item.path.indexOf('#')));
        }
      }}
    >
      <Icon aria-hidden="true" />
      {!collapsed ? <span>{t(item.labelKey)}</span> : null}
      {item.id === 'home' && !collapsed ? <ChevronLeft className="sidebar-navigation__home-accent" aria-hidden="true" /> : null}
    </Link>
  );
}

function isVisible(
  item: SidebarNavigationItem,
  role: string | undefined,
  communityEnabled: boolean,
  charactersEnabled: boolean
) {
  if (item.allowedRoles?.length && (!role || !item.allowedRoles.includes(role))) return false;
  if (item.feature === 'community' && !communityEnabled) return false;
  if (item.feature === 'characters' && !charactersEnabled) return false;
  return true;
}
