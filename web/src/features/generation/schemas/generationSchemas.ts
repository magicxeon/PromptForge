import { z } from 'zod';

const localizedLabelSchema = z.union([z.string(), z.record(z.string(), z.string())]);

export const providerModelSchema = z.object({
  id: z.string(),
  displayName: localizedLabelSchema,
  capabilities: z.object({
    imageGeneration: z.boolean().default(true),
    imageEdit: z.boolean().default(false),
    imageReferences: z.boolean().default(false),
    maxReferenceImages: z.number().default(0),
    streaming: z.boolean().default(false),
    aspectRatios: z.array(z.string()).default([]),
    resolutions: z.array(z.string()).optional()
  }).passthrough(),
  defaults: z.object({
    resolution: z.string().optional(),
    imageSize: z.string().optional()
  }).passthrough().optional()
}).passthrough();

export const providerSchema = z.object({
  id: z.string(),
  displayName: localizedLabelSchema,
  defaultModel: z.string().optional(),
  models: z.array(providerModelSchema).default([])
}).passthrough();

export const providerCatalogSchema = z.object({
  schemaVersion: z.number().optional(),
  configVersion: z.number().optional(),
  defaultProvider: z.string(),
  providers: z.array(providerSchema).default([])
}).passthrough();

export const creditEstimateResponseSchema = z.object({
  estimate: z.object({
    estimateId: z.string(),
    estimatedCredits: z.number(),
    expiresAt: z.union([z.string(), z.number()]),
    pricingInputs: z.record(z.string(), z.unknown()).optional(),
    routing: z.record(z.string(), z.unknown()).optional()
  }).passthrough(),
  account: z.object({
    availableCredits: z.number(),
    canAfford: z.boolean()
  })
});

export const generationSubmitSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  providerStreaming: z.boolean().optional(),
  reservation: z.object({
    reservationId: z.string(),
    amountCredits: z.number()
  }).optional()
}).passthrough();

export const compiledPromptPreviewSchema = z.object({
  compiledPrompt: z.string()
});

export const jobStatusSchema = z.object({
  id: z.string().optional(),
  jobId: z.string().optional(),
  status: z.string(),
  result: z.object({
    imageUrl: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    generationDuration: z.union([z.string(), z.number()]).nullable().optional()
  }).nullable().optional(),
  error: z.union([
    z.string(),
    z.object({ code: z.string().optional(), message: z.string().optional() }).passthrough()
  ]).nullable().optional(),
  timings: z.object({
    queueWaitMs: z.number().nullable(),
    referenceProcessingMs: z.number().nullable(),
    providerMs: z.number().nullable(),
    outputPersistenceMs: z.number().nullable(),
    totalMs: z.number().nullable()
  }).nullable().optional()
}).passthrough();

export const comparisonEstimateSchema = z.object({
  slots: z.array(z.object({
    id: z.string(),
    provider: z.string(),
    model: z.string(),
    estimateId: z.string(),
    estimatedCredit: z.number(),
    estimateExpiresAt: z.union([z.string(), z.number()]).nullable().optional(),
    imageResolution: z.string().nullable().optional()
  }).passthrough()),
  estimatedTotalCredit: z.number(),
  providerConfigVersion: z.number(),
  expiresAt: z.number(),
  estimateToken: z.string()
}).passthrough();

export const comparisonSubmitSchema = z.object({
  setId: z.string(),
  runId: z.string(),
  status: z.string(),
  jobs: z.array(z.object({
    slotId: z.string(),
    jobId: z.string().nullable().optional()
  }).passthrough()).default([])
}).passthrough();

const localizedSceneRecipeTextSchema = z.object({
  en: z.string(),
  th: z.string()
}).passthrough();

export const scenePoseRecipeSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  purpose: z.string(),
  label: localizedSceneRecipeTextSchema,
  description: localizedSceneRecipeTextSchema,
  bestFor: z.array(z.string()).default([]),
  previewAsset: z.string().optional(),
  discoverable: z.boolean().default(true),
  fieldSelections: z.record(z.string(), z.string()),
  clearFields: z.array(z.string()).default([]),
  enabled: z.boolean().default(true)
}).passthrough();

export const scenePoseStyleSchema = z.object({
  id: z.string(),
  label: localizedSceneRecipeTextSchema,
  description: localizedSceneRecipeTextSchema,
  optionId: z.string().nullable(),
  excludedRecipeIds: z.array(z.string()).default([]),
  enabled: z.boolean().default(true)
}).passthrough();

const scenePoseRecipeCatalogSchema = z.object({
  schemaVersion: z.number().int().positive(),
  catalogVersion: z.string(),
  poseStyles: z.array(scenePoseStyleSchema).default([]),
  recipes: z.array(scenePoseRecipeSchema).default([])
}).passthrough();

export const attributesBundleSchema = z.object({
  schema: z.unknown(),
  templates: z.unknown(),
  order: z.array(z.string()).default([]),
  library: z.array(z.record(z.string(), z.unknown())).default([]),
  presets: z.unknown(),
  scenePoseRecipes: scenePoseRecipeCatalogSchema.optional(),
  inputPolicy: z.object({
    schemaVersion: z.number(),
    customAttribute: z.object({
      maxCharactersPerField: z.number().int().positive(),
      maxCharactersTotal: z.number().int().positive()
    })
  }).optional()
}).passthrough();

export const referenceUploadSchema = z.object({
  referenceId: z.string(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  mimeType: z.string(),
  byteSize: z.number(),
  width: z.number(),
  height: z.number(),
  source: z.literal('upload')
}).passthrough();

export const referenceAuthorityProjectionSchema = z.object({
  schemaVersion: z.number(),
  policyVersion: z.string(),
  planFingerprint: z.string(),
  controlledGroups: z.array(z.object({
    group: z.string(),
    role: z.string(),
    editableFields: z.array(z.string()).default([]),
    suppressedFields: z.array(z.string()).default([])
  })).default([]),
  suppressedSelections: z.array(z.object({
    fieldName: z.string(),
    group: z.string(),
    role: z.string(),
    reasonCode: z.string()
  })).default([]),
  references: z.array(z.object({
    slotId: z.string(),
    role: z.string(),
    intent: z.string(),
    preserveTraits: z.array(z.string()).default([]),
    suppressTraits: z.array(z.string()).default([]),
    detectedScope: z.string().nullable().optional(),
    confidence: z.number().nullable().optional(),
    status: z.enum(['accepted', 'warning']),
    warningCodes: z.array(z.string()).default([])
  })).default([]),
  warnings: z.array(z.object({
    code: z.string(),
    severity: z.string(),
    role: z.string()
  })).default([])
});

export const referenceProcessingPreviewSchema = z.object({
  status: z.enum(['accepted', 'accepted_with_warning', 'action_required', 'rejected']),
  policyVersion: z.string(),
  planFingerprint: z.string(),
  publicAuthorityProjection: referenceAuthorityProjectionSchema,
  effectiveSelections: z.record(z.string(), z.unknown()),
  providerPlan: z.object({
    referenceCount: z.number(),
    executionMode: z.enum(['single_stage', 'multi_stage'])
  })
});

export type ProviderCatalog = z.infer<typeof providerCatalogSchema>;
export type ProviderModel = z.infer<typeof providerModelSchema>;
export type CreditEstimateResponse = z.infer<typeof creditEstimateResponseSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ComparisonEstimate = z.infer<typeof comparisonEstimateSchema>;
export type ReferenceAuthorityProjection = z.infer<typeof referenceAuthorityProjectionSchema>;
export type ScenePoseRecipe = z.infer<typeof scenePoseRecipeSchema>;
export type ScenePoseStyle = z.infer<typeof scenePoseStyleSchema>;
export type ReferenceProcessingPreview = z.infer<typeof referenceProcessingPreviewSchema>;
