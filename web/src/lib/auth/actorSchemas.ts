import { z } from 'zod';

export const actorSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: z.string(),
  activeCreatorProfileId: z.string().nullable().optional(),
  isMockActor: z.boolean().optional(),
  authProvider: z.string().optional()
});

export const mockUsersResponseSchema = z.object({
  enabled: z.boolean(),
  users: z.array(z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    role: z.string(),
    activeCreatorProfileId: z.string().nullable().optional(),
    featureFlags: z.array(z.string()).optional()
  }))
});

export type Actor = z.infer<typeof actorSchema>;
export type MockUser = z.infer<typeof mockUsersResponseSchema>['users'][number];
