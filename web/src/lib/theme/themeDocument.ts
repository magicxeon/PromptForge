import { getActiveActorId } from '../auth/actorStore';
import { resolveRouteTheme, resolveTheme, type ResolvedTheme } from './themeContract';
import { readThemePreference } from './themePreference';

const THEME_COLOR: Record<ResolvedTheme, string> = {
  default: '#03050b',
  fashion: '#f4f5f7',
  creative: '#090204'
};

export function applyDocumentTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'fashion' ? 'light' : 'dark';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  meta?.setAttribute('content', THEME_COLOR[theme]);
}

export function bootstrapDocumentTheme(pathname = window.location.pathname) {
  const preference = readThemePreference(getActiveActorId());
  applyDocumentTheme(resolveTheme(preference, resolveRouteTheme(pathname)));
}
