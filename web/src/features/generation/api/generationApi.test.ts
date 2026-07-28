import { describe, expect, it } from 'vitest';
import { generationPayload, pricingPayload, type GenerationRequestDraft } from './generationApi';

function draft(overrides: Partial<GenerationRequestDraft> = {}): GenerationRequestDraft {
  return {
    provider: 'gemini',
    submodel: 'gemini-test',
    prompt: 'Editorial portrait',
    negativePrompt: 'watermark',
    aspectRatio: '6:8',
    imageResolution: '1K',
    outputCount: 1,
    generationMode: 'headshot',
    generationSurface: 'studio',
    references: {},
    authoringMode: 'manual',
    characterType: null,
    ...overrides
  };
}

describe('React generation contract', () => {
  it('maps every explicit reference role to the canonical request fields', () => {
    const payload = generationPayload(draft({
      references: {
        face_reference: '/outputs/face.png',
        style_reference: '/outputs/style.png',
        pose_reference: '/outputs/pose.png',
        outfit_front: '/outputs/front.png',
        outfit_back: '/outputs/back.png'
      }
    }));

    expect(payload.imageReferences).toMatchObject({
      faceMatch: true,
      characterReference: false,
      styleMatch: true,
      poseMatch: true,
      outfitReference: true
    });
    expect(payload.faceReferenceImageA).toBe('/outputs/face.png');
    expect(payload.styleReferenceImageA).toBe('/outputs/style.png');
    expect(payload.styleReferenceImageB).toBe('/outputs/pose.png');
    expect(payload.outfitReferenceImageFront).toBe('/outputs/front.png');
    expect(payload.outfitReferenceImageBack).toBe('/outputs/back.png');
  });

  it('keeps estimate inputs aligned with the submitted provider and output settings', () => {
    const input = draft({
      aspectRatio: '1:1',
      imageResolution: '2K',
      outputCount: 2,
      references: { character_reference: '/outputs/character.png' }
    });
    const estimate = pricingPayload(input);
    const payload = generationPayload(input, { estimateId: 'est_1', requestId: 'req_1' });

    expect(estimate.requestedProviderId).toBe(payload.provider);
    expect(estimate.requestedModelId).toBe(payload.submodel);
    expect(estimate.resolution).toBe(payload.imageResolution);
    expect(estimate.aspectRatio).toBe(payload.aspectRatio);
    expect(estimate.outputCount).toBe(payload.outputCount);
    expect(estimate.referenceCount).toBe(1);
    expect(payload.estimateId).toBe('est_1');
  });

  it('preserves headshot and character-sheet generation modes', () => {
    const headshot = generationPayload(draft());
    expect(headshot.generationMode).toBe('headshot');
    expect(headshot.mode).toBe('headshot');
    const characterSheet = generationPayload(draft({
      generationMode: 'character-sheet',
      characterType: 'reusable_model'
    }));
    expect(characterSheet.mode).toBe('character-sheet');
    expect(characterSheet.characterType).toBe('reusable_model');
  });

  it('forwards custom hair and garment colors to the canonical compiler', () => {
    const payload = generationPayload(draft({
      customColors: {
        Color: {
          enabled: true,
          base: '#3a2418',
          highlightEnabled: true,
          highlight: '#c99662'
        },
        'Primary Color': { enabled: true, color: '#1f2937' },
        'Secondary Color': { enabled: true, color: '#f8fafc' }
      }
    }));

    expect(payload.customColors).toMatchObject({
      Color: { base: '#3a2418', highlight: '#c99662' },
      'Primary Color': { color: '#1f2937' },
      'Secondary Color': { color: '#f8fafc' }
    });
  });

  it('keeps Scene, Playground and Fashion on the normal prompt compiler', () => {
    for (const generationMode of ['scene', 'playground', 'fashion'] as const) {
      expect(generationPayload(draft({ generationMode })).mode).toBe('normal');
    }
  });

  it('carries reusable and styled Character Reference outfit behavior', () => {
    expect(generationPayload(draft({
      generationMode: 'scene',
      references: { character_reference: '/outputs/reusable-character.png' },
      characterReferenceOutfitBehavior: 'replaceable'
    })).characterReferenceOutfitBehavior).toBe('replaceable');

    expect(generationPayload(draft({
      generationMode: 'scene',
      references: { character_reference: '/outputs/styled-character.png' }
    })).characterReferenceOutfitBehavior).toBe('preserve');
  });
});
