import { RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { stripEmbeddedBase64 } from '../../repositories/recordNormalizer.js';
import { sanitizeReferenceSlotsForPublic } from '../scene-templates/sceneTemplateSanitizer.js';

const TEMPLATE_KINDS = new Set(['scene_image', 'fashion', 'product_image', 'video']);
const PROMPT_VISIBILITIES = new Set(['full', 'partial', 'remix_only']);

export function normalizeTemplateKind(value) {
  const requestedKind = String(value || 'scene_image');
  const kind = requestedKind === 'fashion_image' ? 'fashion' : requestedKind;
  if (!TEMPLATE_KINDS.has(kind)) {
    throw new RepositoryContractError('template_kind_invalid', 'Template kind is invalid.');
  }
  return kind;
}

export function normalizeTemplatePromptVisibility(value, snapshot) {
  const visibility = String(value || 'full');
  if (!PROMPT_VISIBILITIES.has(visibility)) {
    throw new RepositoryContractError('template_prompt_visibility_invalid', 'Template prompt visibility is invalid.');
  }
  if (visibility === 'remix_only' && snapshot?.authoringMode === 'manual') {
    throw new RepositoryContractError(
      'manual_remix_only_not_supported',
      'Manual prompts cannot be hidden during template use. Publish the full prompt instead.'
    );
  }
  return visibility;
}

export function normalizeTemplatePricing(value = {}) {
  const accessCredits = Math.max(0, Math.trunc(Number(value.accessCredits) || 0));
  const defaultCreatorShareBps = accessCredits > 0 ? 7500 : 0;
  const creatorShareBps = Math.min(
    10000,
    Math.max(0, Math.trunc(Number(value.creatorShareBps ?? defaultCreatorShareBps) || 0))
  );
  return {
    accessCredits,
    cadence: 'per_output',
    creatorShareBps,
    platformShareBps: 10000 - creatorShareBps,
    currency: 'credits'
  };
}

export function normalizeTemplateInputSchema(value, snapshot = {}) {
  const declaredInputs = Array.isArray(value?.inputs) && value.inputs.length
    ? value.inputs
    : Array.isArray(snapshot.replaceableVariables)
      ? snapshot.replaceableVariables
      : [];
  const sourceInputs = declaredInputs.length
    ? declaredInputs
    : inferLegacyReferenceInputs(snapshot.referenceSlotMapping);
  const seen = new Set();
  const inputs = sourceInputs.map((input, index) => {
    const id = String(input.id || input.sourceFieldName || `input_${index + 1}`).trim();
    const sourceFieldName = String(input.sourceFieldName || id).trim();
    if (!id || !sourceFieldName || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      label: String(input.label || input.labelKey || humanizeField(sourceFieldName)),
      type: normalizeInputType(input.type),
      sourceFieldName,
      required: input.required === true,
      replacementPolicy: input.replacementPolicy === 'locked' ? 'locked' : 'replaceable',
      fashionBindingRole: normalizeFashionBindingRole(input.fashionBindingRole),
      allowedOptionIds: Array.isArray(input.allowedOptionIds)
        ? input.allowedOptionIds.map(String)
        : []
    };
  }).filter(Boolean);
  return { schemaVersion: 1, inputs };
}

function inferLegacyReferenceInputs(referenceSlotMapping) {
  return Object.entries(referenceSlotMapping || {})
    .filter(([, slot]) => {
      const policy = String(slot?.sharePolicy || slot?.policy || '');
      return policy === 'required_user_replacement' || slot?.required === true;
    })
    .map(([slotName, slot]) => ({
      id: slotName,
      label: slot?.label || humanizeField(slotName),
      type: 'reference_image',
      sourceFieldName: slotName,
      required: slot?.required !== false,
      replacementPolicy: 'replaceable'
    }));
}

export function createPublicTemplateProjection(version) {
  const snapshot = sanitizeReferenceSlotsForPublic(
    stripEmbeddedBase64(version.executionSnapshot || {}),
    { userId: 'template_public', username: 'template_public', role: 'user' },
    { userId: version.ownerUserId, username: version.ownerUsername }
  );
  const projection = {
    ...snapshot,
    finalPromptSnapshot: version.promptVisibility === 'full'
      ? String(snapshot.finalPromptSnapshot || '')
      : '',
    manualPromptSnapshot: version.promptVisibility === 'full'
      ? String(snapshot.manualPromptSnapshot || '')
      : '',
    replaceableVariables: structuredClone(version.publicInputSchema?.inputs || [])
  };
  if (version.promptVisibility === 'remix_only') {
    projection.structuredSelectionsSnapshot = redactLockedSelectionValues(
      snapshot.structuredSelectionsSnapshot,
      version.publicInputSchema
    );
  }
  return projection;
}

export function validateTemplateReplacements(replacements, publicInputSchema) {
  const normalized = replacements && typeof replacements === 'object'
    ? stripEmbeddedBase64(replacements)
    : {};
  const allowed = new Map(
    (publicInputSchema?.inputs || [])
      .filter(input => input.replacementPolicy !== 'locked')
      .map(input => [input.id, input])
  );
  const unknown = Object.keys(normalized).filter(key => !allowed.has(key));
  if (unknown.length) {
    throw new RepositoryContractError(
      'template_replacement_not_allowed',
      `Template replacements contain locked or unknown inputs: ${unknown.join(', ')}.`
    );
  }
  const identitySatisfied = [...allowed.values()]
    .filter(isIdentityReferenceInput)
    .some(input => !isEmptyReplacement(normalized[input.id]));
  const missing = [...allowed.values()]
    .filter(input => input.required
      && isEmptyReplacement(normalized[input.id])
      && !(isIdentityReferenceInput(input) && identitySatisfied))
    .map(input => input.id);
  if (missing.length) {
    throw new RepositoryContractError(
      'template_replacement_required',
      `Required template inputs are missing: ${missing.join(', ')}.`
    );
  }
  for (const [id, input] of allowed.entries()) {
    if (input.type !== 'select_option' || !input.allowedOptionIds?.length) continue;
    const replacement = normalized[id];
    if (isEmptyReplacement(replacement)) continue;
    const optionId = String(
      replacement && typeof replacement === 'object'
        ? replacement.id || replacement.value || ''
        : replacement
    );
    if (!input.allowedOptionIds.includes(optionId)) {
      throw new RepositoryContractError(
        'template_replacement_option_invalid',
        `Template replacement "${id}" is not an allowed option.`
      );
    }
  }
  return normalized;
}

function isIdentityReferenceInput(input) {
  if (input?.type !== 'reference_image') return false;
  const field = String(input.sourceFieldName || input.id || '').toLowerCase();
  return field === 'face_reference' || field === 'character_reference';
}

export function applyTemplateReplacements(snapshot, replacements, publicInputSchema) {
  const next = structuredClone(snapshot || {});
  const inputs = new Map((publicInputSchema?.inputs || []).map(input => [input.id, input]));
  Object.entries(replacements || {}).forEach(([id, value]) => {
    const input = inputs.get(id);
    if (!input || input.replacementPolicy === 'locked') return;
    if (input.type === 'reference_image') {
      next.referenceSlotMapping = next.referenceSlotMapping || {};
      next.referenceSlotMapping[input.sourceFieldName] = stripEmbeddedBase64(value);
      return;
    }
    if (input.sourceFieldName === 'manualPromptSnapshot') {
      next.manualPromptSnapshot = String(value || '');
      next.finalPromptSnapshot = String(value || '');
      return;
    }
    next.structuredSelectionsSnapshot = next.structuredSelectionsSnapshot || {};
    next.structuredSelectionsSnapshot[input.sourceFieldName] = normalizeSelectionValue(value);
  });
  return next;
}

function normalizeInputType(value) {
  return ['reference_image', 'select_option', 'custom_text', 'color'].includes(value)
    ? value
    : 'custom_text';
}

function normalizeFashionBindingRole(value) {
  const role = String(value || '');
  return [
    'fashion.character',
    'fashion.outfit_front',
    'fashion.outfit_back',
    'fashion.environment',
    'fashion.pose',
    'fashion.brand_text'
  ].includes(role) ? role : null;
}

function normalizeSelectionValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return structuredClone(value);
  return { value };
}

function redactLockedSelectionValues(selections, schema) {
  const replaceableFields = new Set(
    (schema?.inputs || [])
      .filter(input => input.replacementPolicy !== 'locked')
      .map(input => input.sourceFieldName)
  );
  return Object.fromEntries(
    Object.entries(selections || {}).map(([field, value]) => [
      field,
      replaceableFields.has(field) ? structuredClone(value) : { value: '[Hidden]' }
    ])
  );
}

function isEmptyReplacement(value) {
  return value === undefined || value === null || value === '';
}

function humanizeField(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase());
}
