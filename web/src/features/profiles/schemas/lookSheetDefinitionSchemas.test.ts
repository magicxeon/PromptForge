import { describe, expect, it } from 'vitest';
import { lookSheetPresetSchema, lookSheetSnapshotSchema, lookSheetDefinitionSchema } from './lookSheetDefinitionSchemas';

const fields = { schemaVersion: 1, name: 'Mira', ageYears: 24, appearance: 'Dark hair',
  situation: 'Gardener', outfit: 'Work clothes', personality: 'Gentle' };

describe('Look Sheet recipe version compatibility', () => {
  it.each([1, 2])('accepts version %i presets and historical snapshots', version => {
    expect(lookSheetPresetSchema.safeParse({ id: 'character-document-sheet', version, strategy: 'single_image',
      defaults: { outfit: '', personality: '' }, direction: 'Editorial sheet' }).success).toBe(true);
    const parsed = lookSheetSnapshotSchema.parse({ schemaVersion: 1, presetId: 'character-document-sheet', presetVersion: version,
      strategy: 'single_image', fields, fingerprint: 'source', recipeFingerprint: 'recipe', entrySurface: 'playground',
      layoutId: 'editorial-v2-portrait', textMode: 'generated' });
    expect(parsed.layoutId).toBe('editorial-v2-portrait');
  });
  it('rejects unknown versions and preserves document-only adult validation', () => {
    expect(lookSheetPresetSchema.safeParse({ id: 'character-document-sheet', version: 3, strategy: 'single_image',
      defaults: { outfit: '', personality: '' }, direction: 'Unknown' }).success).toBe(false);
    expect(lookSheetDefinitionSchema.safeParse({ ...fields, ageYears: 17 }).success).toBe(false);
    expect(lookSheetDefinitionSchema.safeParse({ ...fields, ageYears: 18 }).success).toBe(true);
  });
});
