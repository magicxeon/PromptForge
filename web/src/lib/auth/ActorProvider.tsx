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
import { beginIdentityResolution, getIdentitySnapshot, publishIdentity } from './actorStore';
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

export function ActorProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [actor, setActor] = useState<Actor | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const previous = useRef<{ actorId: string; authMode: AuthConfig['authMode'] } | null>(null);
  const refreshSequence = useRef(0);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const epoch = beginIdentityResolution();
    setLoading(true);
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
      const next = { actorId: nextActor?.userId || '', authMode: nextConfig.authMode };
      const old = previous.current;
      if (old && (old.actorId !== next.actorId || old.authMode !== next.authMode)) {
        queryClient.clear();
        clearActorOwnedBrowserState(old.actorId, old.authMode);
      }
      if (!publishIdentity(epoch, { ...next, csrfToken: nextConfig.csrfToken || '' })) return;
      previous.current = next;
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
      queryClient.clear();
      setError(reason instanceof Error ? reason : new Error('Actor context is unavailable.'));
    } finally {
      if (sequence === refreshSequence.current && epoch === getIdentitySnapshot().epoch) setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    void refresh();
    const invalidate = () => { void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') invalidate(); };
    const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('mpf-identity-invalidation') : null;
    if (channel) channel.onmessage = invalidate;
    const localInvalidation = () => { channel?.postMessage('invalidate'); invalidate(); };
    window.addEventListener('focus', invalidate);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('mpf:identity-invalidated', localInvalidation);
    return () => {
      ++refreshSequence.current;
      beginIdentityResolution();
      window.removeEventListener('focus', invalidate);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('mpf:identity-invalidated', localInvalidation);
      channel?.close();
    };
  }, [refresh]);

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
