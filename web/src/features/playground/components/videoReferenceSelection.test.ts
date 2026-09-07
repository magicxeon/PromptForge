import { describe, expect, it } from 'vitest';
import { videoModelCapabilitySchema } from '../../generation/schemas/videoGenerationSchemas';
import {
  characterLookSchema,
  characterSummarySchema,
} from '../../profiles/schemas/profileSchemas';
import {
  approvedVideoLooks,
  buildVideoReferenceSelection,
  type VideoReferenceSelection,
} from './videoReferenceSelection';

const model = videoModelCapabilitySchema.parse({
  providerId: 'modelark',
  modelId: 'seedance',
  displayName: 'Seedance',
  operations: ['text_to_video'],
  inputModes: ['text_to_video', 'image_to_video', 'multimodal_reference'],
  referenceImageLimit: 9,
  supportsOrderedImageReferences: true,
  qualificationStatus: 'internal_testing',
  paidRoutingEnabled: false,
});
const selection: VideoReferenceSelection = {
  operation: 'character_to_video',
  referenceImageUrl: '/outputs/scene.png',
  character: characterSummarySchema.parse({
    id: 'char',
    displayName: 'Character',
    characterProfileVersionId: 'cv',
    displayImageUrl: '/community/cover.png',
  }),
  lookSheet: {
    name: 'Look',
    url: '/api/sheet',
    lookId: 'look',
    versionId: 'lv',
  },
};

describe('Playground video reference selection', () => {
  it('supports Character alone and blocks Character plus uploaded Look', () => {
    const result = buildVideoReferenceSelection({ ...selection, lookSheet: null }, model);
    expect(result.ready).toBe(true);
    expect(result.references.at(-1)).toEqual({ role: 'reference_image', purpose: 'character_reference', characterProfileId: 'char' });
    expect(buildVideoReferenceSelection({ ...selection, lookSheet: { name: 'upload', url: '/outputs/look.png' } }, model).reason).toMatch(/identityConflict/);
  });
  it('orders scene then Look with explicit reference_image roles, never the Community display image', () => {
    const plan = buildVideoReferenceSelection(selection, model);
    expect(plan.ready).toBe(true);
    expect(plan.references.map((item) => item.referenceImageUrl)).toEqual([
      '/outputs/scene.png',
      '/api/sheet',
    ]);
    expect(plan.references.map((item) => item.role)).toEqual([
      'reference_image',
      'reference_image',
    ]);
    expect(plan.inputMode).toBe('multimodal_reference');
  });
  it('first-frame and text modes omit retained Look selections', () => {
    expect(
      buildVideoReferenceSelection(
        { ...selection, operation: 'image_to_video' },
        model,
      ).references,
    ).toEqual([
      {
        purpose: 'opening_frame',
        role: 'first_frame',
        referenceImageUrl: '/outputs/scene.png',
      },
    ]);
    expect(
      buildVideoReferenceSelection(
        { ...selection, operation: 'text_to_video' },
        model,
      ).references,
    ).toEqual([]);
  });
  it('supports uploaded Look alone and reports missing or unsupported inputs', () => {
    expect(
      buildVideoReferenceSelection(
        {
          ...selection,
          character: null,
          referenceImageUrl: null,
          lookSheet: {
            name: 'Uploaded',
            url: '/outputs/look.png',
            assetId: 'upload',
          },
        },
        model,
      ).references[0]?.purpose,
    ).toBe('look_sheet_upload');
    expect(
      buildVideoReferenceSelection({ ...selection, character: null, lookSheet: null }, model)
        .reason,
    ).toMatch(/needIdentity/);
    expect(
      buildVideoReferenceSelection(selection, {
        ...model,
        inputModes: ['text_to_video'],
      }).reason,
    ).toMatch(/unsupportedMode/);
    expect(
      buildVideoReferenceSelection(selection, {
        ...model,
        supportsOrderedImageReferences: false,
      }).reason,
    ).toMatch(/unsupportedCount/);
  });
  it('only offers approved sheets pinned to the selected Character version', () => {
    const look = characterLookSchema.parse({
      id: 'look',
      characterProfileId: 'char',
      sourceCharacterProfileVersionId: 'cv',
      name: 'Look',
      official: false,
      visibility: 'private',
      lifecycleStatus: 'approved',
      activeVersionId: 'lv',
      approvedVersionId: 'lv',
      createdAt: '',
      updatedAt: '',
      retiredAt: null,
      versions: [
        {
          id: 'lv',
          versionNumber: 1,
          sourceMode: 'uploaded_character_sheet',
          canonicalFaceAssetId: null,
          status: 'approved',
          approvedViewAssets: null,
          approvedSheetAsset: { assetId: 'sheet', contentHash: 'hash' },
          createdAt: '',
          updatedAt: '',
          approvedAt: '',
        },
      ],
    });
    expect(approvedVideoLooks([look], selection.character!)[0]?.url).toContain(
      '/media/sheet',
    );
    expect(
      approvedVideoLooks(
        [{ ...look, sourceCharacterProfileVersionId: 'other' }],
        selection.character!,
      ),
    ).toEqual([]);
    expect(
      approvedVideoLooks(
        [{ ...look, lifecycleStatus: 'retired' }],
        selection.character!,
      ),
    ).toEqual([]);
  });
});
