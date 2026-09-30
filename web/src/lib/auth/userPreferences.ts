import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../api/apiClient';
import { getActiveActorId } from './actorStore';

export const userPreferencesSchema = z.object({ confirmCreditUsage: z.boolean() });
export const userPreferencesKey = (actorId: string) => ['user-preferences', actorId] as const;

export function useUserPreferences(actorId: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: userPreferencesKey(actorId),
    queryFn: ({ signal }) => {
      if (getActiveActorId() !== actorId) throw new Error('Actor changed.');
      return apiRequest('/api/me/preferences', { schema: userPreferencesSchema, signal });
    },
    enabled: Boolean(actorId) && getActiveActorId() === actorId, staleTime: 60_000, gcTime: 300_000, retry: false });
  async function save(confirmCreditUsage: boolean) {
    if (getActiveActorId() !== actorId) throw new Error('Actor changed.');
    await client.cancelQueries({ queryKey: userPreferencesKey(actorId), exact: true });
    if (getActiveActorId() !== actorId) throw new Error('Actor changed.');
    const result = await apiRequest('/api/me/preferences', { method: 'PATCH',
      body: { confirmCreditUsage }, schema: userPreferencesSchema });
    if (getActiveActorId() === actorId) {
      await client.cancelQueries({ queryKey: userPreferencesKey(actorId), exact: true });
      if (getActiveActorId() === actorId) client.setQueryData(userPreferencesKey(actorId), result);
    }
    return result;
  }
  return { ...query, save };
}
