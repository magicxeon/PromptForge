import { z } from 'zod';

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  story: z.string().default(''),
  coverJobId: z.string().nullable().optional(),
  jobIds: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number()
}).passthrough();

export const collectionListSchema = z.object({
  version: z.number().optional(),
  defaultCollectionId: z.string().nullable().optional(),
  collections: z.array(collectionSchema).default([])
}).passthrough();

export const collectionMutationSchema = z.union([
  collectionSchema,
  z.object({ success: z.boolean() }).passthrough(),
  z.null()
]);

export type Collection = z.infer<typeof collectionSchema>;
