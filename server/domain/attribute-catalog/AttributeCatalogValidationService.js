import { assertBundleShape, catalogFingerprint } from './attributeCatalogContracts.js';

const LEGACY_DUPLICATE_IDS = new Set([
  'clothing.casual_05',
  'clothing.casual_06',
  'clothing.casual_07',
  'clothing.casual_08',
  'clothing.casual_09'
]);

export class AttributeCatalogValidationService {
  validateBundle(bundle, { allowKnownLegacyDuplicates = true } = {}) {
    const errors = [];
    const warnings = [];
    try {
      assertBundleShape(bundle);
    } catch (error) {
      errors.push(issue('error', error.code || 'attribute_catalog_bundle_invalid', error.message));
      return result(errors, warnings, bundle);
    }

    const ids = new Map();
    for (const [index, option] of bundle.library.entries()) {
      if (!option || typeof option !== 'object') {
        errors.push(issue('error', 'attribute_catalog_option_invalid', `Option at index ${index} is invalid.`, String(index)));
        continue;
      }
      const id = String(option.id || '').trim();
      if (!id) {
        errors.push(issue('error', 'attribute_catalog_option_id_required', `Option at index ${index} requires an ID.`, String(index)));
        continue;
      }
      if (!option.category || !option.subcategory) {
        warnings.push(issue(
          'warning',
          'attribute_catalog_legacy_placement_incomplete',
          `Legacy option ${id} does not declare both category and subcategory.`,
          id
        ));
      }
      if (!labelText(option.label)) {
        errors.push(issue('error', 'attribute_catalog_option_label_required', `Option ${id} requires a label.`, id));
      }
      if (option.enabled !== false && !hasPrompt(option.prompt)) {
        errors.push(issue(
          'error',
          'attribute_catalog_option_prompt_required',
          `Enabled option ${id} requires a prompt contribution.`,
          id
        ));
      }
      const count = (ids.get(id) || 0) + 1;
      ids.set(id, count);
    }

    for (const [id, count] of ids) {
      if (count < 2) continue;
      const duplicateIssue = issue(
        'warning',
        'attribute_catalog_duplicate_option_id',
        `Option ID ${id} appears ${count} times.`,
        id
      );
      if (allowKnownLegacyDuplicates && LEGACY_DUPLICATE_IDS.has(id) && count === 2) {
        warnings.push({ ...duplicateIssue, acknowledgedLegacyDebt: true });
      } else {
        errors.push({ ...duplicateIssue, severity: 'error' });
      }
    }

    return result(errors, warnings, bundle);
  }
}

function hasPrompt(prompt) {
  if (typeof prompt === 'string') return Boolean(prompt.trim());
  if (!prompt || typeof prompt !== 'object') return false;
  return Object.values(prompt).some(value => typeof value === 'string' && value.trim());
}

function labelText(label) {
  if (typeof label === 'string') return label.trim();
  return typeof label?.en === 'string' ? label.en.trim() : '';
}

function issue(severity, code, message, entityId = null) {
  return { severity, code, message, entityId };
}

function result(errors, warnings, bundle) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fingerprint: bundle && typeof bundle === 'object' ? catalogFingerprint(bundle) : null,
    validatedAt: new Date().toISOString()
  };
}

export const attributeCatalogValidationService = new AttributeCatalogValidationService();
