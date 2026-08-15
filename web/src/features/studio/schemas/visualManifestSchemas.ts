import { z } from 'zod';

const localizedTextSchema = z.record(z.string(), z.string());
const visualAssetsSchema = z.object({
  thumb: z.string().optional(),
  preview: z.string().optional(),
  master: z.string().optional()
}).passthrough();

export const visualManifestItemSchema = z.object({
  assetId: z.string(),
  optionId: z.string(),
  attributeId: z.string().optional(),
  slug: z.string(),
  focalPoint: z.string().optional(),
  recolorMode: z.enum(['mask', 'none']).optional(),
  alt: localizedTextSchema.default({}),
  swatch: z.object({
    colors: z.array(z.string()).default([]),
    pattern: z.string().optional()
  }).passthrough().optional(),
  assets: visualAssetsSchema
}).passthrough();

export const visualManifestSchema = z.object({
  schemaVersion: z.number(),
  manifestId: z.string(),
  fieldId: z.string(),
  visualStyleVersion: z.string().optional(),
  recolorMode: z.enum(['mask', 'none']).optional(),
  items: z.array(visualManifestItemSchema).default([])
}).passthrough();

export const visualManifestIndexSchema = z.object({
  schemaVersion: z.number(),
  visualStyleVersion: z.string().optional(),
  manifests: z.array(z.object({
    fieldId: z.string(),
    manifestId: z.string(),
    url: z.string()
  }).passthrough()).default([])
}).passthrough();

export type VisualManifest = z.infer<typeof visualManifestSchema>;
export type VisualManifestItem = z.infer<typeof visualManifestItemSchema>;
export type VisualManifestIndex = z.infer<typeof visualManifestIndexSchema>;
