import { describe, expect, it } from 'vitest';
import type { AttributeField, AttributeSelection } from '../attributes/attributeModel';
import type { VisualManifest } from '../schemas/visualManifestSchemas';
import { resolveVisualPresentation } from './visualOptionRegistry';

const faceShapeField: AttributeField = {
  name: 'Face Shape',
  control: 'select',
  group: 'Face',
  options: [{
    id: 'face.002',
    category: 'face',
    subcategory: 'Face Shape',
    label: { en: 'Oval', th: 'รูปไข่' },
    group: 'Face',
    prompt: 'oval face',
    tags: ['face']
  }]
};

describe('Studio visual option registry', () => {
  it('maps a manifest option to the canonical attribute option', () => {
    const manifest = createManifest({
      fieldId: 'face.shape',
      optionId: 'face.shape.oval',
      imageUrl: '/assets/visual-character-builder/headshot-v1/oval.png'
    });

    const result = resolveVisualPresentation({
      field: faceShapeField,
      manifests: { 'face.shape': manifest }
    });

    expect(result?.kind).toBe('image');
    expect(result?.items[0]?.option.id).toBe('face.002');
    expect(result?.items[0]?.imageUrl).toBe(
      '/assets/visual-character-builder/headshot-v1/oval.png'
    );
  });

  it('rejects manifest assets outside the visual-character-builder root', () => {
    const manifest = createManifest({
      fieldId: 'face.shape',
      optionId: 'face.shape.oval',
      imageUrl: 'https://example.test/private.png'
    });

    expect(resolveVisualPresentation({
      field: faceShapeField,
      manifests: { 'face.shape': manifest }
    })).toBeNull();
  });

  it('selects the gender-specific character-sheet manifest', () => {
    const bodyField: AttributeField = {
      name: 'Body Silhouette',
      control: 'select',
      group: 'Body',
      options: [{
        id: 'body.female_silhouette_01',
        category: 'body',
        subcategory: 'Body Silhouette',
        label: 'Beauty slim',
        group: 'Body',
        prompt: 'beauty slim body silhouette',
        tags: ['body']
      }]
    };
    const manifest = createManifest({
      fieldId: 'body.silhouette.female',
      optionId: 'body.silhouette.female.beauty_slim',
      attributeId: 'body.female_silhouette_01',
      imageUrl: '/assets/visual-character-builder/character-sheet-v1/body/female.png'
    });
    const gender: AttributeSelection = {
      id: 'gender.female',
      value: 'female',
      label: 'Female',
      isCustom: false,
      group: 'Character',
      category: 'character',
      tags: [],
      gptPositiveWords: []
    };

    const result = resolveVisualPresentation({
      field: bodyField,
      manifests: { 'body.silhouette.female': manifest },
      gender
    });

    expect(result?.size).toBe('large');
    expect(result?.items[0]?.option.id).toBe('body.female_silhouette_01');
  });
});

function createManifest({
  fieldId,
  optionId,
  imageUrl,
  attributeId
}: {
  fieldId: string;
  optionId: string;
  imageUrl: string;
  attributeId?: string;
}): VisualManifest {
  return {
    schemaVersion: 1,
    manifestId: `test.${fieldId}`,
    fieldId,
    items: [{
      assetId: `visual.${optionId}`,
      optionId,
      attributeId,
      slug: optionId,
      alt: { en: optionId },
      assets: { preview: imageUrl }
    }]
  };
}
