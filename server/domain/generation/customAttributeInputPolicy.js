import { GENERATION_INPUT_POLICY } from '../../config/generationInputPolicy.js';

export function normalizeCustomAttributeSelections(value) {
  const selections = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
  const limits = GENERATION_INPUT_POLICY.customAttribute;
  let totalCharacters = 0;
  let changed = false;

  const normalized = Object.fromEntries(Object.entries(selections).map(([fieldName, selection]) => {
    if (!selection || typeof selection !== 'object' || selection.isCustom !== true) {
      return [fieldName, selection];
    }

    const customValue = typeof selection.value === 'string' ? selection.value.trim() : '';
    const characterCount = countCharacters(customValue);
    if (characterCount > limits.maxCharactersPerField) {
      throw createInputError(
        'custom_attribute_too_long',
        `Custom ${fieldName} cannot exceed ${limits.maxCharactersPerField} characters.`,
        {
          fieldName,
          characterCount,
          maxCharacters: limits.maxCharactersPerField
        }
      );
    }
    totalCharacters += characterCount;
    if (customValue !== selection.value) changed = true;
    return [fieldName, customValue === selection.value
      ? selection
      : { ...selection, value: customValue }];
  }));

  if (totalCharacters > limits.maxCharactersTotal) {
    throw createInputError(
      'custom_attribute_total_too_long',
      `Custom attribute directions cannot exceed ${limits.maxCharactersTotal} characters in total.`,
      {
        characterCount: totalCharacters,
        maxCharacters: limits.maxCharactersTotal
      }
    );
  }

  return changed ? normalized : selections;
}

function countCharacters(value) {
  return Array.from(value).length;
}

function createInputError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  error.details = details;
  return error;
}
