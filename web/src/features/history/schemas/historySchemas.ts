import { z } from 'zod';

export const historyItemSchema = z.object({
  id: z.string(),
  prompt: z.string().default(''),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  timestamp: z.number(),
  provider: z.string().default(''),
  submodel: z.string().default(''),
  mode: z.string().default('normal'),
  creditCost: z.number().optional(),
  mimeType: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  generationDuration: z.union([z.string(), z.number()]).nullable().optional(),
  referencedFaceJobIds: z.array(z.string()).default([]),
  referencedStyleJobIds: z.array(z.string()).default([]),
  referencedCharacterJobIds: z.array(z.string()).default([]),
  referencedOutfitJobIds: z.array(z.string()).default([])
}).passthrough();

export const historyPageSchema = z.object({
  items: z.array(historyItemSchema),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false),
  totalApprox: z.number().optional()
}).passthrough();

export const collectionsSchema = z.object({
  version: z.number().optional(),
  defaultCollectionId: z.string().nullable().optional(),
  collections: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(''),
    coverJobId: z.string().nullable().optional(),
    jobIds: z.array(z.string()).default([]),
    createdAt: z.number(),
    updatedAt: z.number()
  }).passthrough())
});

export type HistoryItem = z.infer<typeof historyItemSchema>;
