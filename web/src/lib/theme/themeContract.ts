export const themePreferences = ['auto', 'default', 'fashion', 'creative'] as const;
export const resolvedThemes = ['default', 'fashion', 'creative'] as const;

export type ThemePreference = typeof themePreferences[number];
export type ResolvedTheme = typeof resolvedThemes[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string'
    && themePreferences.includes(value as ThemePreference);
}

export function resolveRouteTheme(pathname: string): ResolvedTheme {
  if (pathname === '/create/fashion' || pathname.startsWith('/create/fashion/')) {
    return 'fashion';
  }
  if (
    pathname === '/create/playground'
    || pathname.startsWith('/create/playground/')
    || pathname === '/playground'
    || pathname.startsWith('/playground/')
  ) {
    return 'creative';
  }
  return 'default';
}

export function resolveTheme(
  preference: ThemePreference,
  routeTheme: ResolvedTheme
): ResolvedTheme {
  return preference === 'auto' ? routeTheme : preference;
}
