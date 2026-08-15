import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/apiClient';
import { actorSchema, mockUsersResponseSchema, type Actor, type MockUser } from './actorSchemas';
import { getActiveActorId, persistActiveActorId } from './actorStore';

type ActorContextValue = {
  actor: Actor | null;
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
  const [mockUsers, setMockUsers] = useState<MockUser[]>([]);
  const [mockSwitcherEnabled, setMockSwitcherEnabled] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextActor, usersResponse] = await Promise.all([
        apiRequest('/api/me', { schema: actorSchema }),
        apiRequest('/api/mock-users', { schema: mockUsersResponseSchema })
      ]);
      setActor(nextActor);
      setMockUsers(usersResponse.users);
      setMockSwitcherEnabled(usersResponse.enabled);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error('Actor context is unavailable.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchActor = useCallback(async (actorId: string) => {
    if (!actorId || actorId === getActiveActorId()) return;
    persistActiveActorId(actorId);
    await queryClient.cancelQueries();
    queryClient.clear();
    await refresh();
  }, [queryClient, refresh]);

  const value = useMemo<ActorContextValue>(() => ({
    actor,
    mockUsers,
    mockSwitcherEnabled,
    isLoading,
    error,
    switchActor,
    refresh
  }), [actor, mockUsers, mockSwitcherEnabled, isLoading, error, switchActor, refresh]);

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
