import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { useActor } from '../auth/ActorProvider';
import { getActiveActorId } from '../auth/actorStore';
import { ThemeContext } from './ThemeContext';
import {
  resolveRouteTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference
} from './themeContract';
import { applyDocumentTheme } from './themeDocument';
import {
  readThemePreference,
  writeThemePreference
} from './themePreference';

type PreferenceState = {
  actorId: string;
  preference: ThemePreference;
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const { actor } = useActor();
  const actorId = actor?.userId || getActiveActorId();
  const [preferenceState, setPreferenceState] = useState<PreferenceState>(() => ({
    actorId,
    preference: readThemePreference(actorId)
  }));
  const [routeTheme, setRouteTheme] = useState<ResolvedTheme>(() => (
    resolveRouteTheme(window.location.pathname)
  ));
  const preference = preferenceState.actorId === actorId
    ? preferenceState.preference
    : readThemePreference(actorId);
  const resolvedTheme = resolveTheme(preference, routeTheme);

  useEffect(() => {
    if (preferenceState.actorId === actorId) return;
    setPreferenceState({
      actorId,
      preference: readThemePreference(actorId)
    });
  }, [actorId, preferenceState.actorId]);

  useEffect(() => {
    applyDocumentTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    writeThemePreference(actorId, nextPreference);
    setPreferenceState({ actorId, preference: nextPreference });
  }, [actorId]);

  const syncRoute = useCallback((pathname: string) => {
    setRouteTheme(resolveRouteTheme(pathname));
  }, []);

  const value = useMemo(() => ({
    preference,
    resolvedTheme,
    setPreference,
    syncRoute
  }), [preference, resolvedTheme, setPreference, syncRoute]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

