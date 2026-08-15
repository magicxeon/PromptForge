export const themePreferences = ['auto', 'default', 'fashion', 'creative'] as const;
export const resolvedThemes = ['default', 'fashion', 'creative'] as const;

export type ThemePreference = typeof themePreferences[number];
export type ResolvedTheme = typeof resolvedThemes[number];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string'
    && themePreferences.includes(value as ThemePreference);
}

export function resolveRouteTheme(pathname: string): ResolvedTheme {
  // Application Theme is actor-scoped. Routes no longer change the palette
  // beneath a user who selected Auto.
  void pathname;
  return 'default';
}

export function resolveTheme(
  preference: ThemePreference,
  routeTheme: ResolvedTheme
): ResolvedTheme {
  return preference === 'auto' ? routeTheme : preference;
}
