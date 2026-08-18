import { z } from 'zod';

export const comparisonSlotSchema = z.object({
  id: z.string(),
  position: z.number().optional(),
  provider: z.string().default(''),
  model: z.string().default(''),
  providerDisplayName: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  modelDisplayName: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
  estimatedCredit: z.number().optional(),
  actualCredit: z.number().optional(),
  jobId: z.string().nullable().optional(),
  status: z.string().default('queued'),
  submittedPrompt: z.string().default(''),
  thumbnailUrl: z.string().nullable().optional(),
  result: z.object({
    mediaType: z.enum(['image', 'video']).default('image'),
    imageUrl: z.string().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    posterUrl: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    generationDuration: z.union([z.string(), z.number()]).nullable().optional()
  }).nullable().optional(),
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional()
  }).nullable().optional()
}).passthrough();

export const comparisonRunSchema = z.object({
  id: z.string(),
  status: z.string(),
  sourcePrompt: z.string().default(''),
  mediaType: z.enum(['image', 'video']).default('image'),
  configurationSnapshot: z.object({
    mode: z.string().optional(),
    generationMode: z.string().optional()
  }).passthrough().optional(),
  estimatedTotalCredit: z.number().default(0),
  actualTotalCredit: z.number().default(0),
  createdAt: z.number(),
  completedAt: z.number().nullable().optional(),
  slots: z.array(comparisonSlotSchema).default([])
}).passthrough();

export const comparisonSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  winnerJobId: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  runs: z.array(comparisonRunSchema).default([])
}).passthrough();

export const comparisonPreviewImageSchema = z.object({
  jobId: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional()
}).passthrough();

export const comparisonListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  winnerJobId: z.string().nullable().optional(),
  collectionIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
  runCount: z.number().default(0),
  status: z.string().default('draft'),
  completedCount: z.number().default(0),
  slotCount: z.number().default(0),
  providers: z.array(z.string()).default([]),
  models: z.array(z.string()).default([]),
  previewImages: z.array(comparisonPreviewImageSchema).default([]),
  latestRun: z.object({
    id: z.string(),
    status: z.string(),
    estimatedTotalCredit: z.number().default(0),
    actualTotalCredit: z.number().default(0),
    createdAt: z.number(),
    completedAt: z.number().nullable().optional(),
    slotCount: z.number().default(0)
  }).nullable().optional()
}).passthrough();

export const comparisonPageSchema = z.object({
  items: z.array(comparisonListItemSchema).default([]),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false),
  totalApprox: z.number().optional()
}).passthrough();

export const comparisonMutationSchema = z.union([
  comparisonSetSchema,
  z.object({ success: z.boolean() }).passthrough()
]);

export type ComparisonSet = z.infer<typeof comparisonSetSchema>;
export type ComparisonRun = z.infer<typeof comparisonRunSchema>;
export type ComparisonSlot = z.infer<typeof comparisonSlotSchema>;
export type ComparisonListItem = z.infer<typeof comparisonListItemSchema>;
