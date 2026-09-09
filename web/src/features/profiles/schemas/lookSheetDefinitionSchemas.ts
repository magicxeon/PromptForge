import { z } from 'zod';

const bounded = (max: number) => z.string().trim().refine(value => [...value].length <= max);
export const lookSheetDraftSchema = z.object({
  schemaVersion: z.literal(1), name: bounded(80),
  ageYears: z.number().int().min(1).max(120).nullable(),
  appearance: bounded(2000), situation: bounded(800),
  outfit: bounded(800), personality: bounded(240)
}).strict();
export const lookSheetDefinitionSchema = lookSheetDraftSchema.extend({
  ageYears: z.number().int().min(18).max(120).nullable(),
  name: bounded(80).refine(Boolean), appearance: bounded(2000).refine(Boolean), situation: bounded(800).refine(Boolean)
});
export type LookSheetDefinition = z.infer<typeof lookSheetDefinitionSchema>;
export const lookSheetPresetSchema = z.object({
  id: z.literal('character-document-sheet'), version: z.union([z.literal(1), z.literal(2)]), strategy: z.literal('single_image'),
  defaults: z.object({ outfit: z.string(), personality: z.string() }), direction: z.string()
});
export const lookSheetSnapshotSchema = z.object({
  schemaVersion: z.literal(1), presetId: z.literal('character-document-sheet'), presetVersion: z.union([z.literal(1), z.literal(2)]),
  strategy: z.literal('single_image'), fields: lookSheetDraftSchema,
  fingerprint: z.string(), recipeFingerprint: z.string(), entrySurface: z.enum(['playground', 'studio'])
}).passthrough();
