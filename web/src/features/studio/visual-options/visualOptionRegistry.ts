import type {
  AttributeField,
  AttributeOption,
  AttributeSelection
} from '../attributes/attributeModel';
import type {
  VisualManifest,
  VisualManifestItem
} from '../schemas/visualManifestSchemas';
import { isSafeVisualAssetUrl } from '../api/visualManifestApi';

type VisualFieldConfig = {
  kind: 'image' | 'swatch';
  fieldId?: string;
  variants?: Record<string, string>;
  combineVariantsWhenUnspecified?: boolean;
  optionMap?: Record<string, string>;
  presentationOptionIds?: Partial<Record<
    'female' | 'male',
    ReadonlySet<string>
  >>;
  size?: 'compact' | 'large';
};

export type ResolvedVisualOption = {
  option: AttributeOption;
  assetId: string;
  imageUrl?: string;
  focalPoint?: string;
  alt?: Record<string, string>;
  colors?: string[];
  pattern?: string;
};

export type VisualFieldPresentation = {
  kind: 'image' | 'swatch';
  size: 'compact' | 'large';
  items: ResolvedVisualOption[];
};

const visualFields: Record<string, VisualFieldConfig> = {
  'Face::Face Shape': image('face.shape', {
    'face.shape.oval': 'face.002',
    'face.shape.square': 'face.005',
    'face.shape.round': 'face.003',
    'face.shape.diamond': 'face.006',
    'face.shape.rectangular': 'face.018',
    'face.shape.heart': 'face.004',
    'face.shape.inverted_triangular': 'face.019',
    'face.shape.long': 'face.020'
  }),
  'Face::Eyes': image('eyes.shape', {
    'eyes.shape.almond': 'eyes.001',
    'eyes.shape.monolid': 'eyes.002',
    'eyes.shape.double_eyelids': 'eyes.003',
    'eyes.shape.round': 'eyes.004',
    'eyes.shape.phoenix': 'eyes.005',
    'eyes.shape.doe': 'eyes.006',
    'eyes.shape.puppy': 'eyes.007',
    'eyes.shape.hooded': 'eyes.008'
  }),
  'Face::Eyebrows': image('eyebrows.shape', {
    'eyebrows.shape.straight': 'eyebrows.001',
    'eyebrows.shape.soft_arched': 'eyebrows.002',
    'eyebrows.shape.natural_thick': 'eyebrows.003',
    'eyebrows.shape.thin': 'eyebrows.004',
    'eyebrows.shape.defined': 'eyebrows.005',
    'eyebrows.shape.well_groomed': 'eyebrows.006',
    'eyebrows.shape.natural': 'eyebrows.007'
  }),
  'Face::Nose': image('nose.shape', {
    'nose.shape.small_button': 'nose.001',
    'nose.shape.high_bridge': 'nose.002',
    'nose.shape.delicate_narrow': 'nose.003',
    'nose.shape.soft_rounded_tip': 'nose.004',
    'nose.shape.straight': 'nose.005',
    'nose.shape.natural': 'nose.006'
  }),
  'Face::Lips': image('lips.shape', {
    'lips.shape.natural': 'lips.001',
    'lips.shape.cherry': 'lips.002',
    'lips.shape.cupids_bow': 'lips.003',
    'lips.shape.plump': 'lips.004',
    'lips.shape.thin': 'lips.005',
    'lips.shape.heart_shaped': 'lips.010',
    'lips.shape.heavy_upper': 'lips.011',
    'lips.shape.wide': 'lips.012'
  }),
  'Face::Facial Hair': image('facial_hair.style', {}),
  'Face::Expression': image('expression.face', {
    'expression.face.subtle_micro': 'expression.001',
    'expression.face.thoughtful': 'expression.002',
    'expression.face.friendly_smile': 'expression.004',
    'expression.face.gentle_laugh': 'expression.003',
    'expression.face.playful_smirk': 'expression.008',
    'expression.face.reflective_mood': 'expression.010'
  }),
  'Hair::Length': image('hair.length', {
    'hair.length.buzz_cut': 'hair_001',
    'hair.length.short': 'hair_002',
    'hair.length.long': 'hair_003',
    'hair.length.extra_long': 'hair_004'
  }),
  'Hair::Cut / Style': {
    ...image('hair.cut_style', {
      'hair.cut_style.ponytail': 'hair_008',
      'hair.cut_style.messy_bun': 'hair_009',
      'hair.cut_style.french_braid': 'hair_010',
      'hair.cut_style.layered_hush_cut': 'hair_022',
      'hair.cut_style.long_loose_waves': 'hair_023',
      'hair.cut_style.side_swept': 'hair_024',
      'hair.cut_style.wet_look': 'hair_025',
      'hair.cut_style.wolf_cut': 'hair_026',
      'hair.cut_style.crew_cut': 'hair_029',
      'hair.cut_style.side_part': 'hair_030',
      'hair.cut_style.undercut': 'hair_031',
      'hair.cut_style.pompadour': 'hair_032',
      'hair.cut_style.quiff': 'hair_033',
      'hair.cut_style.textured_crop': 'hair_034',
      'hair.cut_style.caesar_cut': 'hair_035',
      'hair.cut_style.short_curly_crop': 'hair_036'
    }),
    presentationOptionIds: {
      female: new Set([
        'hair_008',
        'hair_009',
        'hair_010',
        'hair_022',
        'hair_023',
        'hair_024',
        'hair_025',
        'hair_026'
      ]),
      male: new Set([
        'hair_029',
        'hair_030',
        'hair_031',
        'hair_032',
        'hair_033',
        'hair_034',
        'hair_035',
        'hair_036'
      ])
    }
  },
  'Hair::Texture': image('hair.texture', {
    'hair.texture.silky_smooth': 'hair.text_01',
    'hair.texture.coarse_thick': 'hair.text_02',
    'hair.texture.soft_glossy_waves': 'hair.text_03',
    'hair.texture.frizzy_voluminous': 'hair.text_04'
  }),
  'Hair::Parting / Fringe': image('hair.parting_fringe', {
    'hair.parting_fringe.center_part': 'hair_037',
    'hair.parting_fringe.side_parting': 'hair_038',
    'hair.parting_fringe.swept_back': 'hair_039',
    'hair.parting_fringe.curtain_bangs': 'hair_011',
    'hair.parting_fringe.blunt_bangs': 'hair_012',
    'hair.parting_fringe.see_through_bangs': 'hair_027'
  }),
  'Hair::Color': { kind: 'swatch' },
  'Skin::Tone': { kind: 'swatch' },
  'Skin::Skin Texture': { kind: 'swatch' },
  'Skin::Makeup': { kind: 'swatch' },
  'Skin::Freckles': { kind: 'swatch' },
  'Body::Body Silhouette': {
    kind: 'image',
    fieldId: 'body.silhouette',
    variants: {
      female: 'body.silhouette.female',
      male: 'body.silhouette.male'
    },
    size: 'large'
  },
  'Clothing::Outfit Base': {
    kind: 'image',
    fieldId: 'clothing.outfit-base',
    variants: {
      female: 'clothing.outfit-base.female',
      male: 'clothing.outfit-base.male'
    },
    combineVariantsWhenUnspecified: true,
    size: 'large'
  },
  'Clothing::Pattern': { kind: 'swatch' },
  'Clothing::Material': { kind: 'swatch' },
  'Clothing::Material / Surface': { kind: 'swatch' }
};

const swatches: Record<string, string[]> = {
  'hair_013': ['#050505', '#242424'],
  'hair_014': ['#2a1710', '#5a3323'],
  'hair_015': ['#f5efd8', '#d8c99c'],
  'hair_016': ['#a94718', '#d87a2c'],
  'hair_021': ['#b72d1a', '#f26a2e'],
  'hair_040': ['#6b2d20', '#b75a3a'],
  'hair_041': ['#5b4327', '#9b7442'],
  'hair_042': ['#4b1820', '#8c3c45'],
  'hair_043': ['#321021', '#6f2147'],
  'hair_044': ['#5e0710', '#b31325'],
  'hair_045': ['#e8b95e', '#ffe2a0'],
  'hair_046': ['#765329', '#bd8a43'],
  'hair_047': ['#3b2115', '#74432c'],
  'hair_048': ['#a68f69', '#dfd3b9'],
  'hair_049': ['#8c9298', '#d7dce0'],
  'hair_050': ['#56604a', '#a9ad77'],
  'hair_051': ['#07153f', '#284b9d'],
  'skin.tone_01': ['#f0c7ad', '#f8dcc9'],
  'skin.tone_02': ['#f7d8c8', '#fff0e7'],
  'skin.tone_03': ['#b97945', '#dca66e'],
  'skin.tone_04': ['#9b6d4c', '#c1956b'],
  'skin.tone_05': ['#edbba9', '#ffd5cc'],
  'skin.tone_06': ['#f5cbbb', '#fff6ee'],
  'skin.tone_07': ['#f1d1bd', '#fff0df'],
  'skin.tone_08': ['#e7c5a9', '#f8e6d1'],
  'skin.tone_09': ['#f3c9b8', '#fff8f1'],
  'skin.text_01': ['#dca383', '#f1c7ad'],
  'skin.text_02': ['#e4aa8f', '#ffe0cf'],
  'skin.text_03': ['#d59072', '#f3bca2'],
  'skin.text_04': ['#d9a184', '#f0c7ad'],
  'skin.text_05': ['#e2ad96', '#fad7c8'],
  'skin.text_06': ['#ebb59d', '#fff1e7'],
  'skin.makeup_01': ['#d7a088', '#f3c8b8'],
  'skin.makeup_02': ['#e7a28f', '#ffd2c8'],
  'skin.makeup_03': ['#c93b35', '#f0b7a5'],
  'skin.makeup_04': ['#b9822f', '#ffe0a3'],
  'skin.freckles_01': ['#dea58b', '#f5cab4'],
  'skin.freckles_02': ['#dda185', '#f4c5ad'],
  'skin.freckles_03': ['#d89a7d', '#efb99e'],
  'outfit.pattern.solid': ['#d4d4d8', '#d4d4d8'],
  'outfit.pattern.subtle_stripe': ['#111827', '#e5e7eb'],
  'outfit.pattern.plaid': ['#27272a', '#d4d4d8'],
  'outfit.pattern.floral': ['#3f3f46', '#e4e4e7'],
  'outfit.pattern.geometric': ['#18181b', '#a1a1aa'],
  'outfit.pattern.color_block': ['#111827', '#f4f4f5'],
  'outfit.material.cotton': ['#d4d4d8', '#f4f4f5'],
  'outfit.material.denim': ['#3f3f46', '#71717a'],
  'outfit.material.knit': ['#a1a1aa', '#52525b'],
  'outfit.material.satin': ['#ffffff', '#d4d4d8'],
  'outfit.material.wool': ['#d6d3d1', '#78716c'],
  'outfit.material.leather_like': ['#18181b', '#52525b'],
  'clothing.material.cotton': ['#d4d4d8', '#f4f4f5'],
  'clothing.material.linen': ['#d6d3d1', '#fafaf9'],
  'clothing.material.denim': ['#334155', '#64748b'],
  'clothing.material.knit': ['#a1a1aa', '#52525b'],
  'clothing.material.satin': ['#ffffff', '#d4d4d8'],
  'clothing.material.leather': ['#18181b', '#57534e'],
  'clothing.material.sequin': ['#71717a', '#f4f4f5']
};

const swatchPatterns: Record<string, string> = {
  'outfit.pattern.subtle_stripe': 'stripe',
  'outfit.pattern.plaid': 'plaid',
  'outfit.pattern.floral': 'floral',
  'outfit.pattern.geometric': 'geometric',
  'outfit.pattern.color_block': 'color-block',
  'outfit.material.cotton': 'cotton',
  'outfit.material.denim': 'denim',
  'outfit.material.knit': 'knit',
  'outfit.material.satin': 'satin',
  'outfit.material.wool': 'wool',
  'outfit.material.leather_like': 'leather',
  'clothing.material.cotton': 'cotton',
  'clothing.material.linen': 'linen',
  'clothing.material.denim': 'denim',
  'clothing.material.knit': 'knit',
  'clothing.material.satin': 'satin',
  'clothing.material.leather': 'leather',
  'clothing.material.sequin': 'sequin'
};

export function resolveVisualPresentation({
  field,
  manifests,
  gender
}: {
  field: AttributeField;
  manifests: Record<string, VisualManifest>;
  gender?: AttributeSelection;
}): VisualFieldPresentation | null {
  const config = visualFields[`${field.group}::${field.name}`];
  if (!config) return null;

  if (config.kind === 'swatch') {
    const items = field.options.flatMap(option => {
      const colors = swatches[option.id];
      return colors ? [{
        option,
        assetId: `swatch.${option.id}`,
        colors,
        pattern: swatchPatterns[option.id]
      }] : [];
    });
    return items.length ? { kind: 'swatch', size: 'compact', items } : null;
  }

  const variant = normalizeGender(gender);
  const fieldIds = variant && config.variants?.[variant]
    ? [config.variants[variant]]
    : config.combineVariantsWhenUnspecified && config.variants
      ? Object.values(config.variants)
      : config.fieldId
        ? [config.fieldId]
        : [];
  const fieldManifests = fieldIds.flatMap(fieldId => {
    const manifest = manifests[fieldId];
    return manifest ? [manifest] : [];
  });
  if (!fieldManifests.length) return null;

  const optionsById = new Map(field.options.map(option => [option.id, option]));
  const seenAttributeIds = new Set<string>();
  const items = fieldManifests.flatMap(manifest => manifest.items).flatMap(item => {
    const attributeId = item.attributeId
      || config.optionMap?.[item.optionId]
      || item.optionId;
    const presentationOptionIds = variant
      ? config.presentationOptionIds?.[variant]
      : undefined;
    if (presentationOptionIds && !presentationOptionIds.has(attributeId)) {
      return [];
    }
    const option = optionsById.get(attributeId);
    const imageUrl = preferredImage(item);
    if (!option || !imageUrl || seenAttributeIds.has(attributeId)) return [];
    seenAttributeIds.add(attributeId);
    return [{
      option,
      assetId: item.assetId,
      imageUrl,
      focalPoint: item.focalPoint,
      alt: item.alt,
      colors: item.swatch?.colors,
      pattern: item.swatch?.pattern
    }];
  });
  return items.length
    ? { kind: 'image', size: config.size || 'compact', items }
    : null;
}

function image(
  fieldId: string,
  optionMap: Record<string, string>
): VisualFieldConfig {
  return { kind: 'image', fieldId, optionMap };
}

function normalizeGender(selection?: AttributeSelection) {
  const source = `${selection?.id || ''} ${selection?.label || ''} ${selection?.value || ''}`.toLowerCase();
  if (source.includes('female') || source.includes('woman')) return 'female';
  if (source.includes('male') || source.includes('man')) return 'male';
  return null;
}

function preferredImage(item: VisualManifestItem) {
  const candidate = item.assets.preview || item.assets.thumb || item.assets.master;
  return candidate && isSafeVisualAssetUrl(candidate) ? candidate : undefined;
}
