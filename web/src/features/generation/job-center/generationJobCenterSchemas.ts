import { z } from 'zod';

export const generationJobCenterItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['image_job', 'image_group', 'image_result', 'video_task']),
  mediaType: z.enum(['image', 'video']),
  status: z.string(),
  terminal: z.boolean(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  providerId: z.string().nullable(),
  modelId: z.string().nullable(),
  resultUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  detailHref: z.string().nullable(),
  resumeHref: z.string().nullable(),
  billingStatus: z.string().nullable(),
  estimatedCredits: z.number(),
  progress: z.object({
    completed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative()
  }).nullable(),
  error: z.object({ code: z.string().nullable(), message: z.string().nullable() }).nullable()
});

export const generationJobCenterSchema = z.object({
  items: z.array(generationJobCenterItemSchema),
  activeCount: z.number().int().nonnegative(),
  terminalCount: z.number().int().nonnegative(),
  polledAt: z.string()
});

export type GenerationJobCenterItem = z.infer<typeof generationJobCenterItemSchema>;

