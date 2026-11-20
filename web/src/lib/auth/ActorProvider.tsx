import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/apiClient';
import { authConfigSchema, currentActorSchema, type Actor, type MockUser, type AuthConfig } from './actorSchemas';
import { beginIdentityResolution, beginIdentityRevalidation, finishIdentityRevalidation, getIdentitySnapshot, publishIdentity } from './actorStore';
import { clearActorOwnedBrowserState } from '../persistence/actorScopedStorage';

type ActorContextValue = {
  actor: Actor | null;
  config: AuthConfig | null;
  identityScope: string;
  mockUsers: MockUser[];
  mockSwitcherEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
  switchActor: (actorId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ActorContext = createContext<ActorContextValue | null>(null);

const authority = (actor: Actor | null) => JSON.stringify(actor && {
  userId: actor.userId, authMode: actor.authMode, role: actor.role,
  roles: [...(actor.roles || [])].sort(), accountStatus: actor.accountStatus,
  securityVersion: actor.securityVersion
});

export function ActorProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [actor, setActor] = useState<Actor | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const previous = useRef<{ actorId: string; authMode: AuthConfig['authMode']; authority: string } | null>(null);
  const confirmed = useRef<{ actor: Actor | null; config: AuthConfig } | null>(null);
  const background = useRef<symbol | null>(null);
  const refreshSequence = useRef(0);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const epoch = beginIdentityResolution();
    setLoading(true);
    // Hard invalidation removes mounted private state even for a same-ID role
    // or security-version change. Ordinary focus never enters this path.
    setActor(null);
    setError(null);
    await queryClient.cancelQueries();
    if (sequence !== refreshSequence.current) return;
    try {
      // Config must establish the browser/CSRF context before resolving /me.
      const nextConfig = await apiRequest('/api/auth/config', { schema: authConfigSchema });
      if (sequence !== refreshSequence.current || epoch !== getIdentitySnapshot().epoch) return;
      const nextActor = await apiRequest('/api/me', { schema: currentActorSchema });
      if (sequence !== refreshSequence.current || epoch !== getIdentitySnapshot().epoch) return;
      if (nextActor && (nextActor.authMode !== nextConfig.authMode || nextActor.accountStatus && nextActor.accountStatus !== 'active')) {
        throw new Error('Identity contract is unavailable.');
      }
      if (nextConfig.authMode === 'development_bypass' && (!nextActor || !['user', 'admin'].includes(nextActor.role))) {
        throw new Error('Development identity is unavailable.');
      }
      const next = { actorId: nextActor?.userId || '', authMode: nextConfig.authMode, authority: authority(nextActor) };
      const old = previous.current;
      if (old && (old.actorId !== next.actorId || old.authMode !== next.authMode || old.authority !== next.authority)) {
        queryClient.clear();
        clearActorOwnedBrowserState(old.actorId, old.authMode);
      }
      if (!publishIdentity(epoch, { ...next, csrfToken: nextConfig.csrfToken || '' })) return;
      previous.current = next;
      confirmed.current = { actor: nextActor, config: nextConfig };
      setActor(nextActor);
      setConfig(nextConfig);
      setError(null);
      // The public policy provider can have started before Identity resolution;
      // restore its cancelled observer through its existing canonical key.
      void queryClient.invalidateQueries();
    } catch (reason) {
      if (sequence !== refreshSequence.current || epoch !== getIdentitySnapshot().epoch) return;
      setActor(null);
      setConfig(null);
      confirmed.current = null;
      queryClient.clear();
      if (previous.current) clearActorOwnedBrowserState(previous.current.actorId, previous.current.authMode);
      setError(reason instanceof Error ? reason : new Error('Actor context is unavailable.'));
    } finally {
      if (sequence === refreshSequence.current && epoch === getIdentitySnapshot().epoch) setLoading(false);
    }
  }, [queryClient]);

  const revalidate = useCallback(async () => {
    if (background.current || !getIdentitySnapshot().ready || !confirmed.current) return;
    const sequence = refreshSequence.current;
    const epoch = getIdentitySnapshot().epoch;
    const baseline = confirmed.current;
    const token = beginIdentityRevalidation();
    background.current = token;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    const current = () => sequence === refreshSequence.current && epoch === getIdentitySnapshot().epoch;
    try {
      const nextConfig = await apiRequest('/api/auth/config', { schema: authConfigSchema, signal: controller.signal });
      if (!current()) return;
      if (JSON.stringify(nextConfig) !== JSON.stringify(baseline.config)) { await refresh(); return; }
      const nextActor = await apiRequest('/api/me', { schema: currentActorSchema, signal: controller.signal });
      if (!current()) return;
      if (JSON.stringify(nextActor) !== JSON.stringify(baseline.actor)) { await refresh(); return; }
      // Identical session: release waiting requests without changing the epoch,
      // invalidating caches, revoking media URLs or hiding the workspace.
      finishIdentityRevalidation(token);
    } catch {
      if (current()) await refresh();
    } finally {
      window.clearTimeout(timeout);
      finishIdentityRevalidation(token);
      if (background.current === token) background.current = null;
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
    const invalidate = () => { void refresh(); };
    const focus = () => { void revalidate(); };
    const visible = () => { if (document.visibilityState === 'visible') focus(); };
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('mpf-identity-invalidation') : null;
    if (channel) channel.onmessage = invalidate;
    const localInvalidation = () => { channel?.postMessage('invalidate'); invalidate(); };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('mpf:identity-invalidated', localInvalidation);
    return () => {
      ++refreshSequence.current;
      beginIdentityResolution();
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('mpf:identity-invalidated', localInvalidation);
      channel?.close();
    };
  }, [refresh, revalidate]);

  const switchActor = useCallback(async () => { throw new Error('Actor switching is unavailable.'); }, []);

  const value = useMemo<ActorContextValue>(() => ({
    actor,
    config,
    identityScope: config ? `${config.authMode}:${actor?.userId || 'guest'}` : 'unresolved',
    mockUsers: [],
    mockSwitcherEnabled: false,
    isLoading,
    error,
    switchActor,
    refresh
  }), [actor, config, isLoading, error, switchActor, refresh]);

  return <ActorContext.Provider value={value}>{children}</ActorContext.Provider>;
}

// The provider and its colocated hook intentionally share one private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useActor() {
  const context = useContext(ActorContext);
  if (!context) {
    throw new Error('useActor must be used within ActorProvider.');
  }
  return context;
}
