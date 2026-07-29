import { z } from 'zod';

export const replaceableVariableSchema = z.object({
  id: z.string(),
  label: z.string().default('Variable'),
  type: z.string().default('text'),
  sourceFieldName: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.unknown().nullable().optional(),
  options: z.array(z.unknown()).optional()
}).passthrough();

export const sceneTemplateSnapshotSchema = z.object({
  sceneTemplateVersion: z.number().default(1),
  authoringMode: z.enum(['guided', 'manual']).default('guided'),
  finalPromptSnapshot: z.string().default(''),
  structuredSelectionsSnapshot: z.record(z.string(), z.unknown()).default({}),
  manualPromptSnapshot: z.string().default(''),
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
  sceneTemplateSnapshot: sceneTemplateSnapshotSchema.optional(),
  templateSnapshot: sceneTemplateSnapshotSchema.optional()
}).passthrough();

export const sharedTemplateListSchema = z.array(sharedTemplateSchema);

export const useTemplateResponseSchema = z.union([
  sceneTemplateSnapshotSchema,
  z.object({
    snapshot: sceneTemplateSnapshotSchema.optional(),
    sceneTemplateSnapshot: sceneTemplateSnapshotSchema.optional(),
    template: sceneTemplateSnapshotSchema.optional()
  }).passthrough()
]);

export type SceneTemplateSnapshot = z.infer<typeof sceneTemplateSnapshotSchema>;
export type SharedTemplate = z.infer<typeof sharedTemplateSchema>;
