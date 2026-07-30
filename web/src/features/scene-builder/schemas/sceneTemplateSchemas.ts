import { z } from 'zod';

export const replaceableVariableSchema = z.object({
  id: z.string(),
  label: z.string().default('Variable'),
  type: z.string().default('text'),
  required: z.boolean().default(false),
  replacementPolicy: z.enum(['locked', 'replaceable']).default('replaceable'),
  sourceFieldName: z.string().default(''),
  fashionBindingRole: z.enum([
    'fashion.character',
    'fashion.outfit_front',
    'fashion.outfit_back',
    'fashion.environment',
    'fashion.pose',
    'fashion.brand_text'
  ]).nullable().optional(),
  defaultValue: z.unknown().nullable().optional(),
  options: z.array(z.unknown()).optional()
}).passthrough();

export const sceneTemplateSnapshotSchema = z.object({
  sceneTemplateVersion: z.number().default(1),
  authoringMode: z.enum(['guided', 'manual']).default('guided'),
  finalPromptSnapshot: z.string().default(''),
  structuredSelectionsSnapshot: z.record(z.string(), z.unknown()).default({}),
  manualPromptSnapshot: z.string().default(''),
  additionalDirectionSnapshot: z.string().max(300).optional(),
  referenceSlotMapping: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  replaceableVariables: z.array(replaceableVariableSchema).default([]),
  providerModelSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  generationSettingsSnapshot: z.record(z.string(), z.unknown()).nullable().optional()
}).passthrough();

export const sharedTemplateSchema = z.object({
  id: z.string(),
  title: z.string().default('Untitled template'),
  description: z.string().default(''),
  thumbnailUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  presentationUrls: z.object({
    templateCard: z.string().nullable().optional()
  }).default({}),
  ownerUsername: z.string().nullable().optional(),
  promptVisibility: z.string().optional(),
  templatePricing: z.object({
    accessCredits: z.number().default(0),
    currency: z.string().default('credits')
  }).nullable().optional(),
  sceneTemplateSnapshot: sceneTemplateSnapshotSchema.optional(),
  templateSnapshot: sceneTemplateSnapshotSchema.optional()
}).passthrough();

export const sharedTemplateListSchema = z.array(sharedTemplateSchema);

export const useTemplateResponseSchema = z.union([
  z.object({
    snapshot: sceneTemplateSnapshotSchema
  }).passthrough(),
  z.object({
    sceneTemplateSnapshot: sceneTemplateSnapshotSchema
  }).passthrough(),
  z.object({
    template: sceneTemplateSnapshotSchema
  }).passthrough(),
  sceneTemplateSnapshotSchema
]);

export const templateUseContextSchema = z.object({
  templateId: z.string(),
  templateVersionId: z.string(),
  templateUseSessionId: z.string(),
  sourceCommunityPostId: z.string().nullable().optional(),
  expiresAt: z.string(),
  pricing: z.object({
    accessCredits: z.number().default(0),
    currency: z.string().default('credits')
  }).passthrough(),
  publicInputSchema: z.object({
    schemaVersion: z.number().default(1),
    inputs: z.array(replaceableVariableSchema).default([])
  })
});

export type SceneTemplateSnapshot = z.infer<typeof sceneTemplateSnapshotSchema>;
export type SharedTemplate = z.infer<typeof sharedTemplateSchema>;
export type TemplateUseContext = z.infer<typeof templateUseContextSchema>;
