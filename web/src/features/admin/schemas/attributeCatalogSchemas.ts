import { z } from 'zod';

const localizedTextSchema = z.union([
  z.string(),
  z.record(z.string(), z.string())
]);

export const attributeCatalogOptionSchema = z.object({
  id: z.string(),
  category: z.string(),
  subcategory: z.string(),
  label: localizedTextSchema,
  prompt: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  tags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  presentationKind: z.enum(['visual', 'text']),
  ui: z.object({
    control: z.string().optional(),
    group: z.string().optional()
  }).passthrough().optional()
}).passthrough();

const facetSchema = z.object({
  category: z.string(),
  count: z.number(),
  fields: z.array(z.object({ field: z.string(), count: z.number() }))
});

export const attributeDefinitionsResponseSchema = z.object({
  items: z.array(attributeCatalogOptionSchema),
  offset: z.number(),
  limit: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
  facets: z.array(facetSchema),
  resolvedFilters: z.object({
    category: z.string(),
    subcategory: z.string(),
    optionId: z.string().nullable(),
    draftId: z.string().nullable().optional()
  })
});

export type AttributeCatalogOption = z.infer<typeof attributeCatalogOptionSchema>;
export type AttributeDefinitionsResponse = z.infer<typeof attributeDefinitionsResponseSchema>;

const attributeCatalogReleaseSchema = z.object({
  id: z.string(),
  status: z.string(),
  sourceDraftId: z.string().nullable().optional(),
  sourceDraftRevision: z.number().nullable().optional(),
  publishedByUsername: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  reason: z.string().nullable().optional()
}).passthrough();

export const attributeCatalogDraftSchema = z.object({
  id: z.string(),
  title: z.string(),
  revision: z.number(),
  status: z.string(),
  lastSavedOptionId: z.string().nullable().optional(),
  bundle: z.object({
    library: z.array(z.record(z.string(), z.unknown()))
  }).passthrough(),
  updatedAt: z.string().nullable().optional()
}).passthrough();

const attributeCatalogDraftSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  revision: z.number(),
  status: z.string(),
  optionCount: z.number(),
  updatedAt: z.string().nullable().optional(),
  ownerUsername: z.string().nullable().optional()
}).passthrough();

export const attributeCatalogOverviewSchema = z.object({
  drafts: z.array(attributeCatalogDraftSummarySchema).default([]),
  releases: z.array(attributeCatalogReleaseSchema).default([]),
  state: z.object({
    activeReleaseId: z.string().nullable(),
    previousReleaseId: z.string().nullable(),
    revision: z.number(),
    updatedAt: z.string().nullable().optional()
  }).passthrough(),
  permissions: z.object({
    canRead: z.boolean(),
    canMutate: z.boolean(),
    canPublish: z.boolean()
  }).passthrough()
}).passthrough();

export type AttributeCatalogOverview = z.infer<typeof attributeCatalogOverviewSchema>;
export type AttributeCatalogDraft = z.infer<typeof attributeCatalogDraftSchema>;
