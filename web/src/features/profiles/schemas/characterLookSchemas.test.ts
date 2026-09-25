import { describe, expect, it } from 'vitest';
import { characterLookGenerationPlanSchema, characterLookGenerationStyleSchema, characterLookVersionSchema } from './profileSchemas';

const legacyVersion = {
  id: 'version_1', versionNumber: 1, sourceMode: 'ai_suggestion',
  canonicalFaceAssetId: 'face_1', status: 'source_ready', approvedViewAssets: null,
  createdAt: '2026-09-25', updatedAt: '2026-09-25', approvedAt: null
};
const legacyPlan = {
  operation: 'character_look_sheet', recipe: { id: 'character-look-sheet', version: 2, fingerprint: 'recipe' },
  prompt: 'A Look sheet.', references: {}, characterProfileContext: {},
  output: { aspectRatio: '1:1', outputCount: 1 },
  source: { characterProfileId: 'character_1', characterProfileVersionId: 'character_version_1', lookId: 'look_1', lookVersionId: 'version_1' }
};

describe('Character Look generation style contracts', () => {
  it('accepts legacy versions without a style and defaults legacy generation plans without mutating input', () => {
    expect(characterLookVersionSchema.parse(legacyVersion).generationStyle).toBeUndefined();
    const plan = characterLookGenerationPlanSchema.parse(legacyPlan);
    expect(plan.generationStyle).toBe('realistic');
    expect(plan.source.generationStyle).toBe('realistic');
    expect(legacyVersion).not.toHaveProperty('generationStyle');
    expect(legacyPlan.source).not.toHaveProperty('generationStyle');
  });

  it.each(characterLookGenerationStyleSchema.options)('preserves %s through version and plan parsing', generationStyle => {
    expect(characterLookVersionSchema.parse({ ...legacyVersion, generationStyle }).generationStyle).toBe(generationStyle);
    const plan = characterLookGenerationPlanSchema.parse({ ...legacyPlan, generationStyle,
      source: { ...legacyPlan.source, generationStyle } });
    expect(plan.generationStyle).toBe(generationStyle);
    expect(plan.source.generationStyle).toBe(generationStyle);
  });

  it.each(['unknown', '', null])('rejects invalid preset %s at every response boundary', generationStyle => {
    expect(characterLookVersionSchema.safeParse({ ...legacyVersion, generationStyle }).success).toBe(false);
    expect(characterLookGenerationPlanSchema.safeParse({ ...legacyPlan, generationStyle }).success).toBe(false);
    expect(characterLookGenerationPlanSchema.safeParse({ ...legacyPlan, source: { ...legacyPlan.source, generationStyle } }).success).toBe(false);
  });
});
