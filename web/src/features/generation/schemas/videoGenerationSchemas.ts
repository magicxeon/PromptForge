import { z } from 'zod';

export const videoModelCapabilitySchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  operations: z.array(z.string()).default([]),
  durations: z.array(z.number().positive()).default([]),
  resolutions: z.array(z.string()).default([]),
  aspectRatios: z.array(z.string()).default([]),
  audioModes: z.array(z.enum(['none', 'generated'])).default([]),
  referenceImageLimit: z.number().int().nonnegative().default(0),
  supportsFirstFrame: z.boolean().default(false),
  supportsLastFrame: z.boolean().default(false),
  qualificationStatus: z.string(),
  paidRoutingEnabled: z.boolean(),
  testingRoutingEnabled: z.boolean().default(false)
}).passthrough();

export const videoCapabilityCatalogSchema = z.object({
  schemaVersion: z.number(),
  catalogVersion: z.string(),
  mediaType: z.literal('video'),
  models: z.array(videoModelCapabilitySchema),
  comparison: z.object({
    enabled: z.boolean(),
    minimumSlots: z.literal(2),
    maximumSlots: z.literal(2)
  }),
  launchStatus: z.enum(['available', 'qualification_blocked'])
});

export type VideoModelCapability = z.infer<typeof videoModelCapabilitySchema>;
export type VideoCapabilityCatalog = z.infer<typeof videoCapabilityCatalogSchema>;

export const videoQuoteSchema = z.object({
  estimate: z.object({
    estimateId: z.string(),
    estimatedCredits: z.number().nonnegative(),
    expiresAt: z.string(),
    breakdown: z.record(z.string(), z.unknown()).default({})
  }).passthrough(),
  account: z.object({
    availableCredits: z.number().nonnegative(),
    canAfford: z.boolean()
  })
});

export const videoTaskSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  operation: z.string().nullable().optional(),
  aspectRatio: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  billingStatus: z.string().nullable().optional(),
  estimatedCredits: z.number().nullable().optional(),
  submittedRequest: z.object({
    operation: z.string().nullable().optional(),
    aspectRatio: z.string().nullable().optional(),
    resolution: z.string().nullable().optional(),
    durationSeconds: z.number().nullable().optional(),
    audioMode: z.string().nullable().optional(),
    referenceImageCount: z.number().int().nonnegative().optional(),
    characterAttributions: z.array(z.object({
      characterProfileId: z.string(),
      characterProfileVersionId: z.string(),
      role: z.string().nullable().optional()
    }).passthrough()).default([])
  }).passthrough().nullable().optional(),
  providerError: z.object({ code: z.string().optional() }).passthrough().nullable().optional(),
  outputAsset: z.object({
    publicUrl: z.string(),
    mimeType: z.string().optional(),
    posterUrl: z.string().nullable().optional()
  }).passthrough().nullable().optional()
}).passthrough();

export type VideoTask = z.infer<typeof videoTaskSchema>;

export const recentVideoTasksSchema = z.object({
  items: z.array(videoTaskSchema).default([]),
  hasMore: z.boolean().default(false)
});
