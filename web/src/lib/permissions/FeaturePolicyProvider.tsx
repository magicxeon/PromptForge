import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../api/apiClient';
import { queryKeys } from '../api/queryKeys';

const featurePolicySchema = z.object({
  schemaVersion: z.number().default(1),
  community: z.object({
    enabled: z.boolean().default(false),
    shareEnabled: z.boolean().default(false),
    exploreEnabled: z.boolean().default(false),
    engagementEnabled: z.boolean().default(false),
    creatorProfilesEnabled: z.boolean().default(false),
    galleryEnabled: z.boolean().default(false),
    characterProfilesEnabled: z.boolean().default(false),
    moderationEnabled: z.boolean().default(false),
    privateBeta: z.boolean().default(false)
  }),
  development: z.object({
    mockActorSwitcherEnabled: z.boolean().default(false),
    debugPromptOverrideEnabled: z.boolean().default(false)
  }),
  routing: z.object({
    automaticSimpleModeEnabled: z.boolean().default(false)
  }),
  generation: z.object({
    promptRefinementEnabled: z.boolean().default(false)
  }).default({ promptRefinementEnabled: false }),
  cinematic: z.object({
    enabled: z.boolean().default(false),
    playgroundVideoEnabled: z.boolean().default(false),
    videoComparisonEnabled: z.boolean().default(false),
    communityVideoEnabled: z.boolean().default(false)
  }).default({
    enabled: false,
    playgroundVideoEnabled: false,
    videoComparisonEnabled: false,
    communityVideoEnabled: false
  })
});

export type FeaturePolicy = z.infer<typeof featurePolicySchema>;

type FeaturePolicyContextValue = {
  policy: FeaturePolicy | null;
  isLoading: boolean;
  error: Error | null;
  isEnabled: (path: FeaturePath) => boolean;
};

type FeaturePath =
  | `community.${keyof FeaturePolicy['community']}`
  | `development.${keyof FeaturePolicy['development']}`
  | `routing.${keyof FeaturePolicy['routing']}`
  | `generation.${keyof FeaturePolicy['generation']}`
  | `cinematic.${keyof FeaturePolicy['cinematic']}`;

const FeaturePolicyContext = createContext<FeaturePolicyContextValue | null>(null);

export function FeaturePolicyProvider({ children }: PropsWithChildren) {
  const query = useQuery({
    queryKey: queryKeys.features,
    queryFn: () => apiRequest('/api/community/features', { schema: featurePolicySchema }),
    staleTime: 5 * 60_000,
    retry: false
  });
  const value = useMemo<FeaturePolicyContextValue>(() => ({
    policy: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    isEnabled: path => {
      if (!query.data) return false;
      const [group, key] = path.split('.') as [
        keyof Omit<FeaturePolicy, 'schemaVersion'>,
        string
      ];
      const values = query.data[group] as Record<string, boolean>;
      return values[key] === true;
    }
  }), [query.data, query.error, query.isLoading]);

  return (
    <FeaturePolicyContext.Provider value={value}>
      {children}
    </FeaturePolicyContext.Provider>
  );
}

// The provider and hook intentionally share their private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useFeaturePolicy() {
  const context = useContext(FeaturePolicyContext);
  if (!context) throw new Error('useFeaturePolicy must be used within FeaturePolicyProvider.');
  return context;
}
