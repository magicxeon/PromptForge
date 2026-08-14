import type { AttributeSelection } from '../studio/attributes/attributeModel';

export function resolveCharacterPresentationGender(source: unknown) {
  const record = asRecord(source);
  if (!record) return undefined;
  const compatibleAttributes = asRecord(record.compatibleAttributeSnapshot);
  const selections = asRecord(record.selections);
  const structuredSnapshot = asRecord(record.structuredCharacterSnapshot);
  const structuredSelections = asRecord(structuredSnapshot?.selections);
  const candidate = compatibleAttributes?.Gender
    || selections?.Gender
    || structuredSelections?.Gender;
  return normalizeGenderSelection(candidate);
}

function normalizeGenderSelection(value: unknown): AttributeSelection | undefined {
  const selection = asRecord(value);
  if (!selection) return undefined;
  const evidence = [
    selection.id,
    selection.value,
    selection.label,
    ...(Array.isArray(selection.tags) ? selection.tags : [])
  ].filter(item => typeof item === 'string').join(' ').toLowerCase();
  const gender = /\b(female|woman|women)\b/.test(evidence)
    ? 'female'
    : /\b(male|man|men)\b/.test(evidence)
      ? 'male'
      : null;
  if (!gender) return undefined;
  return {
    id: typeof selection.id === 'string' ? selection.id : `character.${gender}`,
    value: typeof selection.value === 'string' ? selection.value : gender,
    label: typeof selection.label === 'string' ? selection.label : gender,
    isCustom: false,
    group: 'Character',
    category: 'character',
    tags: Array.isArray(selection.tags)
      ? selection.tags.filter((tag): tag is string => typeof tag === 'string')
      : [gender],
    gptPositiveWords: []
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
