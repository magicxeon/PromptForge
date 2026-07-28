import type { z } from 'zod';
import type { attributesBundleSchema } from '../../generation/schemas/generationSchemas';

export type AttributeOption = {
  id: string;
  category: string;
  subcategory: string;
  label: string | Record<string, string>;
  group: string;
  prompt: string;
  tags: string[];
};

export type AttributeField = {
  name: string;
  control: string;
  group: string;
  options: AttributeOption[];
};

export type AttributeGroup = {
  group: string;
  fields: AttributeField[];
};

export type AttributeSelection = {
  id: string;
  value: string;
  label: string;
  isCustom: boolean;
  group: string;
  category: string;
  tags: string[];
  gptPositiveWords: string[];
};

type Bundle = z.infer<typeof attributesBundleSchema>;

const legacySubcategoryByCategory: Record<string, string> = {
  face: 'Face Shape',
  eyes: 'Eyes',
  eyebrows: 'Eyebrows',
  nose: 'Nose',
  lips: 'Lips',
  expression: 'Expression',
  photo_context: 'Fashion Photography Context',
  scene_story: 'Fashion Story'
};

export function normalizeAttributeGroups(bundle: Bundle): AttributeGroup[] {
  const schema = Array.isArray(bundle.schema) ? bundle.schema : [];
  const options = bundle.library.flatMap(item => normalizeOption(item));
  return schema.flatMap(rawGroup => {
    if (!isRecord(rawGroup) || typeof rawGroup.group !== 'string' || !Array.isArray(rawGroup.fields)) return [];
    const groupName = rawGroup.group;
    const fields = rawGroup.fields.flatMap(rawField => {
      if (!isRecord(rawField) || typeof rawField.name !== 'string') return [];
      const fieldOptions = options
        .filter(option => option.subcategory === rawField.name)
        .map(option => ({ ...option, group: groupName }));
      if (!fieldOptions.length) return [];
      return [{
        name: rawField.name,
        control: typeof rawField.control === 'string' ? rawField.control : 'select',
        group: groupName,
        options: fieldOptions
      }];
    });
    return fields.length ? [{ group: groupName, fields }] : [];
  });
}

export function createSelection(option: AttributeOption): AttributeSelection {
  return {
    id: option.id,
    value: option.prompt,
    label: localized(option.label),
    isCustom: false,
    group: option.group,
    category: option.category,
    tags: option.tags,
    gptPositiveWords: []
  };
}

export function createCustomSelection(field: AttributeField, value: string): AttributeSelection {
  return {
    id: `custom.${slug(field.name)}`,
    value: value.trim(),
    label: value.trim(),
    isCustom: true,
    group: field.group,
    category: slug(field.group),
    tags: [slug(field.group)],
    gptPositiveWords: []
  };
}

export function compileSelectionPreview(
  selections: Record<string, AttributeSelection>,
  mode: 'headshot' | 'character-sheet' | 'scene',
  characterType: 'reusable_model' | 'styled_character'
) {
  const valuesForGroups = (groups: ReadonlySet<string>) =>
    [...new Set(Object.values(selections)
      .filter(selection => groups.has(selection.group))
      .map(selection => selection.value)
      .filter(Boolean))];

  if (mode === 'scene') {
    return [
      ...valuesForGroups(new Set([
        'Character',
        'Fashion Direction',
        'Scene Story',
        'Photographic Context',
        'Pose',
        'Environment',
        'Lighting',
        'Camera',
        'Quality'
      ])),
      'photorealistic scene photography, natural composition, clear realistic details'
    ].join(', ').replace(/,\s*,/g, ',').trim();
  }

  if (mode === 'headshot') {
    return [
      'headshot portrait',
      ...valuesForGroups(new Set(['Character', 'Face', 'Hair', 'Skin'])),
      'showing head to shoulders, straight front-facing portrait, looking directly into the camera with zero head tilting, perfectly level head',
      'on a solid pure white background',
      'photorealistic photography',
      'realistic camera imperfections',
      ...valuesForGroups(new Set(['Camera', 'Quality']))
    ].join(', ').replace(/,\s*,/g, ',').trim();
  }

  const identityAndBody = valuesForGroups(new Set([
    'Character',
    'Face',
    'Hair',
    'Skin',
    'Body'
  ]));
  const cameraAndQuality = valuesForGroups(new Set(['Camera', 'Quality']));
  const clothing = characterType === 'reusable_model'
    ? [
      'wearing an opaque modest fitted white casting uniform with a fitted white short-sleeve top and fitted white mid-thigh shorts',
      'never underwear, lingerie, swimwear, transparent fabric, or sexualized styling'
    ]
    : valuesForGroups(new Set(['Clothing']));
  const styledClothing = characterType === 'styled_character' && !clothing.length
    ? ['wearing modest neutral character reference clothing']
    : clothing;

  return [
    'professional full-body character model sheet showing exactly three clearly separated views side by side: front view, exact side profile, and back view',
    'complete head-to-feet figure in every view with clear margins, neutral upright standing pose',
    ...identityAndBody,
    ...styledClothing,
    'on a solid pure white background',
    'photorealistic photography',
    'realistic camera imperfections',
    ...cameraAndQuality
  ]
    .join(', ')
    .replace(/,\s*,/g, ',')
    .trim();
}

export function localized(value: string | Record<string, string>) {
  return typeof value === 'string' ? value : value.en || value.th || Object.values(value)[0] || '';
}

function normalizeOption(item: Record<string, unknown>): AttributeOption[] {
  if (item.enabled === false || typeof item.id !== 'string') return [];
  const category = typeof item.category === 'string' ? item.category : '';
  const subcategory = typeof item.subcategory === 'string'
    ? item.subcategory
    : legacySubcategoryByCategory[category];
  if (!subcategory) return [];
  const ui = isRecord(item.ui) ? item.ui : {};
  const prompt = isRecord(item.prompt) ? item.prompt : {};
  const phrase = typeof prompt.default === 'string'
    ? prompt.default
    : typeof prompt['gpt-image'] === 'string'
      ? prompt['gpt-image']
      : '';
  if (!phrase) return [];
  return [{
    id: item.id,
    category,
    subcategory,
    label: typeof item.label === 'string' || isStringRecord(item.label) ? item.label : item.id,
    group: typeof ui.group === 'string' ? ui.group : '',
    prompt: phrase,
    tags: Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === 'string') : []
  }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(item => typeof item === 'string');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
