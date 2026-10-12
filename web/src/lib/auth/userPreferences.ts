import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../api/apiClient';
import { assertIdentityEpoch, getActiveActorId, getActorScope, getIdentitySnapshot } from './actorStore';

export const userPreferencesSchema = z.object({ confirmCreditUsage: z.boolean() });
export const userPreferencesKey = (actorId: string) => ['user-preferences', getActorScope(actorId)] as const;

export function useUserPreferences(actorId: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: userPreferencesKey(actorId),
    queryFn: ({ signal }) => {
      if (getActiveActorId() !== actorId) throw new Error('Actor changed.');
      return apiRequest('/api/me/preferences', { schema: userPreferencesSchema, signal });
    },
    enabled: Boolean(actorId) && getActiveActorId() === actorId, staleTime: 60_000, gcTime: 300_000, retry: false });
  async function save(confirmCreditUsage: boolean) {
    const identity = getIdentitySnapshot();
    const queryKey = userPreferencesKey(actorId);
    const assertCurrent = () => {
      assertIdentityEpoch(identity.epoch);
      if (!identity.ready || getActiveActorId() !== actorId) throw new Error('Actor changed.');
    };
    assertCurrent();
    await client.cancelQueries({ queryKey, exact: true });
    assertCurrent();
    const result = await apiRequest('/api/me/preferences', { method: 'PATCH',
      body: { confirmCreditUsage }, schema: userPreferencesSchema });
    assertCurrent();
    await client.cancelQueries({ queryKey, exact: true });
    assertCurrent();
    client.setQueryData(queryKey, result);
    return result;
  }
  return { ...query, save };
}
