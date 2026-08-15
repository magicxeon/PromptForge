import { z } from 'zod';

export const adminOverviewSchema = z.object({
  users: z.object({ total: z.number(), active: z.number() }),
  generationJobs: z.object({ totalApprox: z.number() }),
  communityPosts: z.object({ totalApprox: z.number() }),
  auditEvents: z.object({ totalApprox: z.number() })
});

export const adminUsersSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    role: z.string(),
    status: z.string(),
    credits: z.object({
      availableCredits: z.number(),
      reservedCredits: z.number()
    }).nullable(),
    createdAt: z.union([z.string(), z.number()]).nullable().optional()
  }).passthrough())
});

const page = z.object({
  items: z.array(z.record(z.string(), z.unknown())).default([]),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false),
  totalApprox: z.number().optional()
}).passthrough();

export const adminPageSchema = page;
export const adminMutationSchema = z.record(z.string(), z.unknown());
