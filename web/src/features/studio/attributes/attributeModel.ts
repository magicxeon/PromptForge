import type { z } from 'zod';
import type { attributesBundleSchema } from '../../generation/schemas/generationSchemas';
import {
  compileCustomColorPhrases,
  createStudioCustomColors,
  isCustomHairColorActive,
  type StudioCustomColors
} from './customColorModel';

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

export type CustomAttributeInputLimits = {
  maxCharactersPerField: number;
  maxCharactersTotal: number;
};

export const DEFAULT_CUSTOM_ATTRIBUTE_INPUT_LIMITS: CustomAttributeInputLimits = {
  maxCharactersPerField: 1000,
  maxCharactersTotal: 2000
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

const subcategoryAliasesByField: Record<string, readonly string[]> = {
  'Hair::Cut / Style': ['Cut / Style', 'Style'],
  'Hair::Texture': ['Texture', 'Hair Texture'],
  'Hair::Parting / Fringe': ['Parting / Fringe', 'Bangs']
};

const nativeControlOnlyFields = new Set([
  'Clothing::Primary Color',
  'Clothing::Secondary Color'
]);

export function normalizeAttributeGroups(bundle: Bundle): AttributeGroup[] {
  const schema = Array.isArray(bundle.schema) ? bundle.schema : [];
  const options = bundle.library.flatMap(item => normalizeOption(item));
  return schema.flatMap(rawGroup => {
    if (!isRecord(rawGroup) || typeof rawGroup.group !== 'string' || !Array.isArray(rawGroup.fields)) return [];
    const groupName = rawGroup.group;
    const fields = rawGroup.fields.flatMap(rawField => {
      if (!isRecord(rawField) || typeof rawField.name !== 'string') return [];
      const subcategoryAliases = subcategoryAliasesByField[
        `${groupName}::${rawField.name}`
      ] || [rawField.name];
      const fieldOptions = options
        .filter(option => subcategoryAliases.includes(option.subcategory))
        .map(option => ({ ...option, group: groupName }));
      if (
        !fieldOptions.length
        && !nativeControlOnlyFields.has(`${groupName}::${rawField.name}`)
      ) {
        return [];
      }
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

export function countCharacters(value: string) {
  return Array.from(value).length;
}

export function countCustomSelectionCharacters(
  selections: Record<string, AttributeSelection>
) {
  return Object.values(selections).reduce(
    (total, selection) => total + (selection.isCustom
      ? countCharacters(selection.value.trim())
      : 0),
    0
  );
}

export function reconcileSelectionsWithCatalog(
  selections: Record<string, AttributeSelection>,
  groups: AttributeGroup[]
) {
  const optionsById = new Map(groups.flatMap(group =>
    group.fields.flatMap(field => field.options.map(option => [option.id, option] as const))
  ));
  let changed = false;
  const reconciled = Object.fromEntries(Object.entries(selections).map(([fieldName, selection]) => {
    if (selection.isCustom || selection.id.startsWith('custom.')) {
      return [fieldName, selection];
    }
    const option = optionsById.get(selection.id);
    if (!option) return [fieldName, selection];
    const current = createSelection(option);
    if (
      selection.value === current.value
      && selection.label === current.label
      && selection.group === current.group
      && selection.category === current.category
      && arraysEqual(selection.tags, current.tags)
    ) {
      return [fieldName, selection];
    }
    changed = true;
    return [fieldName, current];
  }));
  return changed
    ? reconciled as Record<string, AttributeSelection>
    : selections;
}

export function compileSelectionPreview(
  selections: Record<string, AttributeSelection>,
  mode: 'headshot' | 'character-sheet' | 'scene',
  characterType: 'reusable_model' | 'styled_character',
  customColors?: StudioCustomColors
) {
  const normalizedColors = createStudioCustomColors(customColors);
  const colorPhrases = compileCustomColorPhrases(normalizedColors);
  const valuesForGroups = (groups: ReadonlySet<string>) =>
    [...new Set(Object.entries(selections)
      .filter(([fieldName, selection]) => (
        groups.has(selection.group)
        && !(fieldName === 'Color'
          && selection.group === 'Hair'
          && isCustomHairColorActive(normalizedColors))
        && !(selection.group === 'Clothing'
          && (fieldName === 'Primary Color' || fieldName === 'Secondary Color')
          && colorPhrases.garment.length)
      ))
      .map(([, selection]) => selection)
      .map(selection => selection.value)
      .filter(Boolean))];

  if (mode === 'scene') {
    return [
      ...valuesForGroups(new Set([
        'Character',
        'Face',
        'Hair',
        'Skin',
        'Body',
        'Clothing',
        'Fashion Direction',
        'Scene Story',
        'Photographic Context',
        'Pose',
        'Environment',
        'Lighting',
        'Camera',
        'Quality'
      ])),
      ...colorPhrases.hair,
      ...colorPhrases.garment,
      'photorealistic scene photography, natural composition, clear realistic details'
    ].join(', ').replace(/,\s*,/g, ',').trim();
  }

  if (mode === 'headshot') {
    return [
      'headshot portrait',
      ...valuesForGroups(new Set(['Character', 'Face', 'Hair', 'Skin'])),
      ...colorPhrases.hair,
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
  const castingPresentation = resolveCastingPresentation(selections);
  const reusableCastingUniform = castingPresentation === 'female'
    ? 'wearing an opaque matte medium-gray unbranded silhouette-reading casting outfit with a fitted short-sleeve athletic top with a deep rounded scoop neckline ending securely above the cleavage line, the top ending cleanly at the natural waist, and matching fitted high-rise short upper-thigh athletic shorts with a short inseam and complete seat and groin coverage'
    : castingPresentation === 'male'
      ? 'wearing an opaque matte medium-gray unbranded silhouette-reading casting outfit with a fitted short-sleeve high crew-neck athletic T-shirt ending at the natural waist and matching fitted mid-thigh athletic shorts'
      : 'wearing an opaque matte medium-gray unbranded silhouette-reading casting outfit with a fitted short-sleeve high crew-neck athletic top ending at the natural waist and matching fitted mid-thigh athletic shorts';
  const clothing = characterType === 'reusable_model'
    ? [
      reusableCastingUniform,
      'a subtle white contour grid of thin evenly spaced horizontal and vertical lines follows the gray fabric surface and curves naturally over the body, with no numbers, labels, symbols, or measurement marks',
      'maintain clear tonal separation between the medium-gray outfit, its white grid, the character skin, and the light warm-gray background',
      'the close contoured fit follows the exact natural anatomy without compression, padding, lifting, reshaping, concealment, or flattening of the upper torso, waist, hips, or seat',
      'never underwear, lingerie, swimwear, transparent fabric, or sexualized styling'
    ]
    : valuesForGroups(new Set(['Clothing']));
  const styledClothing = characterType === 'styled_character' && !clothing.length
    ? ['wearing modest neutral character reference clothing']
    : clothing;

  return [
    'professional photorealistic full-body character casting reference showing exactly three clearly separated views side by side in one horizontal row at the same scale, ordered left to right: front view, exact side profile facing toward the viewer right, and back view',
    'in the side profile, the face, nose, chest, hips, knees, and toes all point toward the viewer right; keep the head aligned with the torso and never turn it toward the camera or opposite the body',
    'complete head-to-feet figure in every view at the same scale with generous clear margins, neutral upright standing pose',
    'realistic adult fashion-model proportions with a naturally proportioned head-to-body relationship of approximately 1:7.5 to 1:8, a full-length torso, and naturally long legs; never an oversized head, shortened torso, compressed legs, childlike anatomy, doll-like anatomy, chibi, or caricature',
    ...identityAndBody,
    ...colorPhrases.hair,
    ...styledClothing,
    ...(characterType === 'styled_character' ? colorPhrases.garment : []),
    characterType === 'reusable_model'
      ? 'on a seamless matte light warm-gray studio background'
      : 'on a solid pure white background',
    'unlabeled image only, no text, captions, words, letters, panel titles, arrows, numbers, measurement lines, rulers, diagrams, borders, dividers, logos, watermark, or isolated foot close-up',
    'real high-resolution studio photography of a real adult person using a level eye-height camera and an 85 to 105mm full-frame-equivalent perspective',
    'natural skin texture, realistic fabric tension, physically plausible shadows, and subtle photographic grain; never AI art, CGI, 3D rendering, illustration, or a mannequin',
    ...cameraAndQuality
  ]
    .join(', ')
    .replace(/,\s*,/g, ',')
    .trim();
}

function resolveCastingPresentation(selections: Record<string, AttributeSelection>) {
  const evidence = Object.values(selections)
    .flatMap(selection => [selection.id, selection.value, selection.label, ...selection.tags])
    .join(' ')
    .toLowerCase();
  if (/\b(female|woman|women|girl)\b/.test(evidence)) return 'female';
  if (/\b(male|man|men|boy)\b/.test(evidence)) return 'male';
  return 'neutral';
}

export function localized(value: string | Record<string, string>) {
  return typeof value === 'string' ? value : value.en || value.th || Object.values(value)[0] || '';
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
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
