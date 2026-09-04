import { z } from 'zod';

export const videoModelCapabilitySchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  operations: z.array(z.string()).default([]),
  commercialOperations: z.array(z.string()).default([]),
  inputModes: z.array(z.string()).default([]),
  durationControlMode: z.enum(['exact', 'prompted']).default('exact'),
  durations: z.array(z.number().positive()).default([]),
  resolutions: z.array(z.string()).default([]),
  aspectRatios: z.array(z.string()).default([]),
  audioModes: z.array(z.enum(['none', 'generated'])).default([]),
  referenceImageLimit: z.number().int().nonnegative().default(0),
  supportsFirstFrame: z.boolean().default(false),
  supportsLastFrame: z.boolean().default(false),
  portraitReferencePolicy: z.enum([
    'provider_authorized_asset_required',
    'provider_generated_asset_required'
  ]).optional(),
  qualificationStatus: z.string(),
  paidRoutingEnabled: z.boolean(),
  testingRoutingEnabled: z.boolean().default(false),
  developmentPocUnverified: z.boolean().optional(),
  developmentPocCredits: z.number().int().positive().nullable().optional(),
  developmentPocWarningCode: z.string().nullable().optional()
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

export const videoDurationReconciliationSchema = z.object({
  plannedDurationSeconds: z.number().positive(),
  renderDurationSeconds: z.number().positive(),
  trimDurationSeconds: z.number().nonnegative(),
  durationControlMode: z.enum(['exact', 'prompted']),
  strategy: z.enum(['exact', 'pad_and_trim', 'prompt_target', 'split_required']),
  supportedDurations: z.array(z.number().positive()).default([]),
  requiresSplit: z.boolean().default(false),
  reasonCode: z.string()
});

export const videoQuoteSchema = z.object({
  estimate: z.object({
    estimateId: z.string(),
    estimatedCredits: z.number().nonnegative(),
    expiresAt: z.string(),
    billingStatus: z.enum(['estimated', 'qualification_no_charge']).optional(),
    chargeMode: z.enum(['user_credits', 'qualification_no_charge', 'development_poc_credit']).optional(),
    breakdown: z.record(z.string(), z.unknown()).default({})
  }).passthrough(),
  account: z.object({
    availableCredits: z.number().nonnegative(),
    canAfford: z.boolean()
  }),
  selection: z.object({
    commercialOperation: z.string(),
    inputMode: z.string(),
    providerId: z.string(),
    modelId: z.string(),
    aspectRatio: z.string(),
    resolution: z.string(),
    durationSeconds: z.number().positive(),
    audioMode: z.string(),
    referenceImageCount: z.number().int().nonnegative(),
    referencePlanFingerprint: z.string(),
    referenceContainsPerson: z.boolean().optional(),
    referenceAuthorityFingerprint: z.string().nullable().optional()
  }).optional(),
  requestFingerprint: z.string().optional(),
  durationReconciliation: videoDurationReconciliationSchema.optional()
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
  commercialOperation: z.string().nullable().optional(),
  inputMode: z.string().nullable().optional(),
  aspectRatio: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  plannedDurationSeconds: z.number().nullable().optional(),
  billingStatus: z.string().nullable().optional(),
  estimatedCredits: z.number().nullable().optional(),
  developmentPocUnverified: z.boolean().optional(),
  developmentPocCredits: z.number().int().positive().nullable().optional(),
  developmentPocWarningCode: z.string().nullable().optional(),
  submittedRequest: z.object({
    operation: z.string().nullable().optional(),
    commercialOperation: z.string().nullable().optional(),
    inputMode: z.string().nullable().optional(),
    aspectRatio: z.string().nullable().optional(),
    resolution: z.string().nullable().optional(),
    durationSeconds: z.number().nullable().optional(),
    plannedDurationSeconds: z.number().nullable().optional(),
    durationReconciliation: videoDurationReconciliationSchema.nullable().optional(),
    audioMode: z.string().nullable().optional(),
    referenceImageCount: z.number().int().nonnegative().optional(),
    referencePlanFingerprint: z.string().nullable().optional(),
    referenceContainsPerson: z.boolean().optional(),
    referenceAuthorityFingerprint: z.string().nullable().optional(),
    requestFingerprint: z.string().nullable().optional(),
    renderedPromptFingerprint: z.string().nullable().optional(),
    promptStrategy: z.object({
      id: z.string(), version: z.number().int().nonnegative(),
      policyId: z.string(), policyVersion: z.number().int().nonnegative()
    }).nullable().optional(),
    references: z.array(z.object({
      role: z.string(),
      assetId: z.string().nullable().optional(),
      assetVersionId: z.string().nullable().optional(),
      sourceFingerprint: z.string().nullable().optional()
    })).default([]),
    developmentPocUnverified: z.boolean().optional(),
    developmentPocCredits: z.number().int().positive().nullable().optional(),
    developmentPocWarningCode: z.string().nullable().optional(),
    characterAttributions: z.array(z.object({
      characterProfileId: z.string(),
      characterProfileVersionId: z.string(),
      role: z.string().nullable().optional()
    }).passthrough()).default([])
  }).passthrough().nullable().optional(),
  providerError: z.object({ code: z.string().optional() }).passthrough().nullable().optional(),
  outputAsset: z.object({
    id: z.string().optional(),
    assetId: z.string().optional(),
    publicUrl: z.string(),
    mimeType: z.string().optional(),
    posterUrl: z.string().nullable().optional(),
    width: z.number().positive().nullable().optional(),
    height: z.number().positive().nullable().optional(),
    durationSeconds: z.number().positive().nullable().optional(),
    fps: z.number().positive().nullable().optional(),
    hasAudio: z.boolean().optional(),
    technicalProbe: z.object({
      schemaVersion: z.number().int().positive().optional(),
      probeVersion: z.string().optional(),
      status: z.enum(['pending', 'passed', 'failed']),
      container: z.string().nullable().optional(),
      durationSeconds: z.number().positive().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      fps: z.number().positive().optional(),
      videoCodec: z.string().nullable().optional(),
      audioCodec: z.string().nullable().optional(),
      hasAudio: z.boolean().optional(),
      probedAt: z.string().optional(),
      errorCode: z.string().optional()
    }).passthrough().optional()
  }).passthrough().nullable().optional()
}).passthrough();

export type VideoTask = z.infer<typeof videoTaskSchema>;

export const recentVideoTasksSchema = z.object({
  items: z.array(videoTaskSchema).default([]),
  hasMore: z.boolean().default(false)
});
