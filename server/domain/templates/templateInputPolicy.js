import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

export const TEMPLATE_INPUT_POLICY = 'character-outfit-v1';
const definitions = [
  { id: 'outfit_front_reference', role: 'outfit_front', label: 'Outfit front', required: true, binding: 'fashion.outfit_front' },
  { id: 'character_reference', role: 'character_reference', label: 'Character', option: 'characterEnabled', binding: 'fashion.character' },
  { id: 'outfit_back_reference', role: 'outfit_back', label: 'Outfit back', option: 'outfitBackEnabled', binding: 'fashion.outfit_back' }
];

function sourceField(snapshot, definition) {
  const fields = snapshot?.replaceableVariables || [];
  const input = fields.find(item => item.type === 'reference_image'
    && [definition.id, definition.role].includes(item.sourceFieldName || item.id));
  if (input) return input.sourceFieldName || input.id;
  const slots = snapshot?.referenceSlotMapping || {};
  return [definition.id, definition.role].find(field => Object.hasOwn(slots, field)) || null;
}

export function getTemplateInputPolicy(snapshot, publishedSchema = null) {
  const available = definition => Boolean(sourceField(snapshot, definition));
  const enabled = definition => available(definition) && (publishedSchema === null
    || publishedSchema.inputs?.some(input => input.replacementPolicy !== 'locked'
      && [definition.id, definition.role].includes(input.sourceFieldName || input.id)));
  const allowed = new Set(definitions.flatMap(item => [item.id, item.role]));
  return {
    policyId: TEMPLATE_INPUT_POLICY,
    supported: available(definitions[0]),
    characterAvailable: available(definitions[1]),
    outfitBackAvailable: available(definitions[2]),
    characterEnabled: Boolean(enabled(definitions[1])),
    outfitBackEnabled: Boolean(enabled(definitions[2])),
    removedFields: (publishedSchema?.inputs || [])
      .filter(item => item.replacementPolicy !== 'locked' && !allowed.has(item.sourceFieldName || item.id))
      .map(item => String(item.sourceFieldName || item.id))
  };
}

export function buildTemplateInputPolicy(snapshot, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || Object.keys(options).some(key => !['characterEnabled', 'outfitBackEnabled'].includes(key))
    || Object.values(options).some(value => typeof value !== 'boolean')) {
    throw new RepositoryContractError('template_input_policy_invalid', 'Template input options are invalid.');
  }
  const capabilities = getTemplateInputPolicy(snapshot);
  if (!capabilities.supported) {
    throw new RepositoryContractError('template_outfit_source_required', 'This source does not support outfit replacement. Share it as an image instead.', 409);
  }
  const inputs = definitions.flatMap(definition => {
    const field = sourceField(snapshot, definition);
    const selected = !definition.option || (options[definition.option] ?? Boolean(field));
    if (selected && !field) {
      throw new RepositoryContractError('template_input_unsupported', 'This source does not support the selected Template input.');
    }
    return selected ? [{ id: definition.id, sourceFieldName: field, label: definition.label,
      type: 'reference_image', required: definition.required === true,
      replacementPolicy: 'replaceable', fashionBindingRole: definition.binding,
      allowedOptionIds: [] }] : [];
  });
  return { schemaVersion: 1, inputs };
}
