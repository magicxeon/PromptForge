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

export function normalizeAttributeGroups(bundle: Bundle): AttributeGroup[] {
  const schema = Array.isArray(bundle.schema) ? bundle.schema : [];
  const options = bundle.library.flatMap(item => normalizeOption(item));
  return schema.flatMap(rawGroup => {
    if (!isRecord(rawGroup) || typeof rawGroup.group !== 'string' || !Array.isArray(rawGroup.fields)) return [];
    const groupName = rawGroup.group;
    const fields = rawGroup.fields.flatMap(rawField => {
      if (!isRecord(rawField) || typeof rawField.name !== 'string') return [];
      const fieldOptions = options.filter(option => option.subcategory === rawField.name);
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
  mode: 'headshot' | 'character-sheet',
  characterType: 'reusable_model' | 'styled_character'
) {
  const phrases = Object.values(selections).map(selection => selection.value).filter(Boolean);
  const prefix = mode === 'headshot'
    ? 'headshot portrait'
    : characterType === 'reusable_model'
      ? 'professional full-body three-view character casting sheet'
      : 'professional full-body character sheet';
  return [prefix, ...phrases, 'photorealistic photography, clean anatomy, clear realistic details']
    .join(', ')
    .replace(/,\s*,/g, ',')
    .trim();
}

export function localized(value: string | Record<string, string>) {
  return typeof value === 'string' ? value : value.en || value.th || Object.values(value)[0] || '';
}

function normalizeOption(item: Record<string, unknown>): AttributeOption[] {
  if (item.enabled === false || typeof item.id !== 'string' || typeof item.subcategory !== 'string') return [];
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
    category: typeof item.category === 'string' ? item.category : '',
    subcategory: item.subcategory,
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
