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
  it('resolves canonical Facial Hair assets without a compatibility option map', () => {
    const field: AttributeField = {
      name: 'Facial Hair',
      control: 'select',
      group: 'Face',
      options: [{
        id: 'facial_hair.designer_stubble',
        category: 'facial_hair',
        subcategory: 'Facial Hair',
        label: 'Designer Stubble',
        group: 'Face',
        prompt: 'designer stubble',
        tags: ['adult-male']
      }]
    };
    const manifest = createManifest({
      fieldId: 'facial_hair.style',
      optionId: 'facial_hair.designer_stubble',
      imageUrl: '/assets/visual-character-builder/headshot-v1/facial-features/facial-hair/preview/designer-stubble-r1.png'
    });
    manifest.items[0]!.attributeId = 'facial_hair.designer_stubble';

    expect(resolveVisualPresentation({
      field,
      manifests: { 'facial_hair.style': manifest },
      gender: selection('character.002', 'Male')
    })?.items.map(item => item.option.id)).toEqual(['facial_hair.designer_stubble']);
  });
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

  it('shows Character Sheet outfit visuals in Scene Builder before presentation is known', () => {
    const field: AttributeField = {
      name: 'Outfit Base',
      control: 'select',
      group: 'Clothing',
      options: [
        outfitOption('outfit.base.female.square_neck_knit_tailored_trousers'),
        outfitOption('outfit.base.male.chore_jacket_chinos')
      ]
    };
    const female = createManifest({
      fieldId: 'clothing.outfit-base.female',
      optionId: 'outfit.base.female.square_neck_knit_tailored_trousers',
      imageUrl: '/assets/visual-character-builder/character-sheet-v1/clothing/outfit-base-female/preview/female-square-neck-knit-tailored-trousers-r1.png'
    });
    const male = createManifest({
      fieldId: 'clothing.outfit-base.male',
      optionId: 'outfit.base.male.chore_jacket_chinos',
      imageUrl: '/assets/visual-character-builder/character-sheet-v1/clothing/outfit-base-male/preview/male-chore-jacket-chinos-r1.png'
    });

    const result = resolveVisualPresentation({
      field,
      manifests: {
        'clothing.outfit-base.female': female,
        'clothing.outfit-base.male': male
      }
    });

    expect(result?.kind).toBe('image');
    expect(result?.items.map(item => item.option.id)).toEqual([
      'outfit.base.female.square_neck_knit_tailored_trousers',
      'outfit.base.male.chore_jacket_chinos'
    ]);
    expect(resolveVisualPresentation({
      field,
      manifests: {
        'clothing.outfit-base.female': female,
        'clothing.outfit-base.male': male
      },
      gender: selection('gender.male', 'Male')
    })?.items.map(item => item.option.id)).toEqual([
      'outfit.base.male.chore_jacket_chinos'
    ]);
  });

  it('renders Clothing Pattern and Material fields as semantic swatches', () => {
    const patternResult = resolveVisualPresentation({
      field: clothingField('Pattern', 'outfit.pattern.plaid'),
      manifests: {}
    });
    const materialResult = resolveVisualPresentation({
      field: clothingField('Material', 'outfit.material.denim'),
      manifests: {}
    });
    const surfaceResult = resolveVisualPresentation({
      field: clothingField('Material / Surface', 'clothing.material.satin'),
      manifests: {}
    });

    expect(patternResult).toMatchObject({
      kind: 'swatch',
      items: [{ pattern: 'plaid' }]
    });
    expect(materialResult).toMatchObject({
      kind: 'swatch',
      items: [{ pattern: 'denim' }]
    });
    expect(surfaceResult).toMatchObject({
      kind: 'swatch',
      items: [{ pattern: 'satin' }]
    });
  });

  it('keeps Hair Cut / Style visuals presentation-aware like Vanilla', () => {
    const field: AttributeField = {
      name: 'Cut / Style',
      control: 'visual-select',
      group: 'Hair',
      options: [
        hairOption('hair_008', 'Ponytail'),
        hairOption('hair_029', 'Crew Cut')
      ]
    };
    const manifest = createManifest({
      fieldId: 'hair.cut_style',
      optionId: 'hair.cut_style.ponytail',
      imageUrl: '/assets/visual-character-builder/headshot-v1/hair/ponytail.png'
    });
    manifest.items.push({
      assetId: 'visual.hair.cut-style.crew-cut',
      optionId: 'hair.cut_style.crew_cut',
      slug: 'crew-cut',
      alt: { en: 'Crew Cut' },
      assets: {
        preview: '/assets/visual-character-builder/headshot-v1/hair/crew-cut.png'
      }
    });

    const female = resolveVisualPresentation({
      field,
      manifests: { 'hair.cut_style': manifest },
      gender: selection('gender.female', 'Female')
    });
    const male = resolveVisualPresentation({
      field,
      manifests: { 'hair.cut_style': manifest },
      gender: selection('gender.male', 'Male')
    });

    expect(female?.items.map(item => item.option.id)).toEqual(['hair_008']);
    expect(male?.items.map(item => item.option.id)).toEqual(['hair_029']);
  });
});

function hairOption(id: string, label: string): AttributeField['options'][number] {
  return {
    id,
    category: 'hair',
    subcategory: 'Style',
    label,
    group: 'Hair',
    prompt: label.toLowerCase(),
    tags: ['style']
  };
}

function selection(id: string, label: string): AttributeSelection {
  return {
    id,
    value: label.toLowerCase(),
    label,
    isCustom: false,
    group: 'Character',
    category: 'character',
    tags: [],
    gptPositiveWords: []
  };
}

function clothingField(name: string, optionId: string): AttributeField {
  return {
    name,
    control: 'select',
    group: 'Clothing',
    options: [{
      id: optionId,
      category: 'clothing',
      subcategory: name,
      label: optionId,
      group: 'Clothing',
      prompt: optionId,
      tags: ['clothing']
    }]
  };
}

function outfitOption(id: string): AttributeField['options'][number] {
  return {
    id,
    category: 'clothing',
    subcategory: 'Outfit Base',
    label: id,
    group: 'Clothing',
    prompt: id,
    tags: ['clothing', 'outfit-base']
  };
}

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
