import { z } from 'zod';

export const adminOverviewSchema = z.object({
  generatedAt: z.string().optional(),
  status: z.enum(['ready', 'partial']).optional(),
  sources: z.record(z.string(), z.object({
    id: z.string(),
    status: z.enum(['ready', 'unavailable']),
    sourceUpdatedAt: z.string().nullable(),
    count: z.number().nullable(),
    activeCount: z.number().nullable().optional(),
    attentionCount: z.number().nullable().optional(),
    oldestActiveAt: z.string().nullable().optional()
  }).passthrough()).optional(),
  priorityItems: z.array(z.object({
    id: z.string(),
    capability: z.string(),
    severity: z.string(),
    count: z.number(),
    href: z.string()
  })).optional(),
  analytics: z.object({
    windowDays: z.number(),
    timezone: z.string(),
    daily: z.array(z.object({
      date: z.string(), success: z.number(), failed: z.number(), active: z.number(), other: z.number(), total: z.number()
    })),
    totals: z.object({
      success: z.number(), failed: z.number(), active: z.number(), other: z.number(), total: z.number(),
      successRate: z.number().nullable()
    })
  }).optional(),
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
  }).passthrough()),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false),
  totalApprox: z.number().optional()
});

const page = z.object({
  items: z.array(z.record(z.string(), z.unknown())).default([]),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false),
  totalApprox: z.number().optional()
}).passthrough();

export const adminPageSchema = page;
export const adminOperationsSchema = page;
export const adminMutationSchema = z.record(z.string(), z.unknown());
export const adminUserDetailSchema = z.object({
  user: z.object({
    id: z.string(), username: z.string(), displayName: z.string(), role: z.string(), status: z.string(),
    createdAt: z.string().nullable().optional(), updatedAt: z.string().nullable().optional()
  }),
  credits: z.object({ availableCredits: z.number(), reservedCredits: z.number() }).nullable(),
  activity: z.object({ imageJobs: z.number(), videoJobs: z.number(), communityPosts: z.number() })
});

export const adminCapabilitiesSchema = z.object({
  generatedAt: z.string(),
  environment: z.string(),
  capabilities: z.record(z.string(), z.object({
    id: z.string(), enabled: z.boolean(), mode: z.string(), env: z.string(),
    prerequisites: z.array(z.string()), reason: z.string().nullable()
  }))
});

export const adminContentSchema = page;
export const adminTraceSchema = z.object({
  identifier: z.string(), found: z.boolean(),
  direct: z.array(z.record(z.string(), z.unknown())),
  related: z.array(z.record(z.string(), z.unknown())),
  sensitiveFieldsRedacted: z.boolean()
});

export const adminSupportCaseSchema = z.object({
  id: z.string(), version: z.number(), title: z.string(), description: z.string(),
  priority: z.string(), status: z.string(), customerUserId: z.string().nullable(),
  assigneeUserId: z.string().nullable(),
  links: z.array(z.object({ targetType: z.string(), targetId: z.string() })),
  notes: z.array(z.object({ id: z.string(), body: z.string(), authorUserId: z.string(), createdAt: z.string() })),
  createdAt: z.string(), updatedAt: z.string()
}).passthrough();

export const adminSupportCasesSchema = z.object({
  items: z.array(adminSupportCaseSchema), nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false), totalApprox: z.number().optional()
});

export const adminConfigurationStateSchema = z.object({
  activeRevisionIds: z.record(z.string(), z.string()),
  revisions: z.array(z.object({
    id: z.string(), scope: z.string(), status: z.string(), createdAt: z.string(),
    createdByUserId: z.string(), validation: z.record(z.string(), z.unknown())
  }).passthrough())
});

export const adminProviderHealthSchema = z.object({
  checkedAt: z.string(), schemaVersion: z.union([z.string(), z.number()]).nullable(),
  defaultProvider: z.string().nullable(), note: z.string(),
  providers: z.array(z.object({
    id: z.string(), displayName: z.unknown(), status: z.string(), modelCount: z.number(),
    models: z.array(z.object({ id: z.string(), displayName: z.unknown(), status: z.string() }))
  }))
});

export const adminCreditReconciliationSchema = z.object({
  generatedAt: z.string(),
  counts: z.record(z.string(), z.number()),
  reservations: z.array(z.object({
    reservationId: z.string(), userId: z.string(), username: z.string().nullable(),
    status: z.string(), amountCredits: z.number(), jobId: z.string().nullable(),
    groupId: z.string().nullable(), expiresAt: z.string().nullable(),
    createdAt: z.string().nullable(), updatedAt: z.string().nullable()
  })),
  mutationAvailable: z.literal(false)
});
