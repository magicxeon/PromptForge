import type { GenerationReferenceRole } from '../generation/api/generationApi';
import type { StudioCustomColors } from '../studio/attributes/customColorModel';
import type { AttributeSelection } from '../studio/attributes/attributeModel';
import type { SceneTemplateSnapshot } from '../scene-builder/schemas/sceneTemplateSchemas';

const referenceFieldByRole: Record<GenerationReferenceRole, string> = {
  face_reference: 'face_reference',
  character_reference: 'character_reference',
  style_reference: 'style_reference',
  pose_reference: 'pose_reference',
  outfit_front: 'outfit_front_reference',
  outfit_back: 'outfit_back_reference'
};

type FashionBindingRole = NonNullable<
  SceneTemplateSnapshot['replaceableVariables'][number]['fashionBindingRole']
>;

export function buildSceneTemplateSnapshot(input: {
  authoringMode: 'guided' | 'manual';
  finalPrompt: string;
  selections: Record<string, AttributeSelection>;
  customColors: StudioCustomColors;
  references: Partial<Record<GenerationReferenceRole, string>>;
  additionalDirection?: string;
}): SceneTemplateSnapshot {
  const variables = input.authoringMode === 'guided'
    ? Object.entries(input.selections).map(([fieldName, selection]) => ({
      id: stableInputId(fieldName),
      label: fieldName,
      type: fieldName.toLocaleLowerCase().includes('color') ? 'color' : 'select_option',
      sourceFieldName: fieldName,
      fashionBindingRole: inferSelectionFashionBinding(fieldName),
      required: false,
      replacementPolicy: 'replaceable' as const,
      defaultValue: selection.id || selection.value,
      allowedOptionIds: []
    }))
    : [{
      id: 'manual_prompt',
      label: 'Prompt',
      type: 'custom_text',
      sourceFieldName: 'manualPromptSnapshot',
      required: true,
      replacementPolicy: 'replaceable' as const,
      defaultValue: input.finalPrompt,
      allowedOptionIds: []
    }];
  const referenceSlotMapping = Object.fromEntries(
    Object.entries(referenceFieldByRole).map(([role, field]) => [
      field,
      {
        role,
        required: false,
        replacementPolicy: 'replaceable',
        sharePolicy: 'required_user_replacement',
        value: input.references[role as GenerationReferenceRole] || null
      }
    ])
  );
  const referenceVariables = Object.entries(referenceFieldByRole).map(([role, field]) => ({
    id: field,
    label: humanize(field),
    type: 'reference_image',
    sourceFieldName: field,
    fashionBindingRole: referenceFashionBinding(role as GenerationReferenceRole),
    required: false,
    replacementPolicy: 'replaceable' as const,
    defaultValue: input.references[role as GenerationReferenceRole] || null,
    allowedOptionIds: []
  }));
  return {
    sceneTemplateVersion: 1,
    authoringMode: input.authoringMode,
    finalPromptSnapshot: input.finalPrompt,
    structuredSelectionsSnapshot: input.authoringMode === 'guided' ? input.selections : {},
    manualPromptSnapshot: input.authoringMode === 'manual' ? input.finalPrompt : '',
    referenceSlotMapping,
    replaceableVariables: [...variables, ...referenceVariables],
    providerModelSnapshot: {},
    generationSettingsSnapshot: {},
    customColorsSnapshot: input.customColors,
    additionalDirectionSnapshot: input.authoringMode === 'guided'
      ? String(input.additionalDirection || '').trim()
      : ''
  };
}

export function buildTemplateReplacements(input: {
  publicInputSchema: { inputs: Array<{
    id: string;
    type: string;
    sourceFieldName: string;
    replacementPolicy?: string;
  }> };
  selections: Record<string, AttributeSelection>;
  references: Partial<Record<GenerationReferenceRole, string>>;
  manualPrompt: string;
}) {
  const roleByField = Object.fromEntries(
    Object.entries(referenceFieldByRole).map(([role, field]) => [field, role])
  ) as Record<string, GenerationReferenceRole>;
  const entries: Array<[string, unknown]> = [];
  input.publicInputSchema.inputs.forEach(definition => {
    if (definition.replacementPolicy === 'locked') return;
    if (definition.type === 'reference_image') {
      const role = roleByField[definition.sourceFieldName];
      const value = role ? input.references[role] : null;
      if (value) entries.push([definition.id, value]);
      return;
    }
    if (definition.sourceFieldName === 'manualPromptSnapshot') {
      entries.push([definition.id, input.manualPrompt]);
      return;
    }
    const selection = input.selections[definition.sourceFieldName];
    if (selection) entries.push([definition.id, selection]);
  });
  return Object.fromEntries(entries);
}

function stableInputId(value: string) {
  return `field_${value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function referenceFashionBinding(role: GenerationReferenceRole): FashionBindingRole | null {
  const bindings: Partial<Record<GenerationReferenceRole, FashionBindingRole>> = {
    character_reference: 'fashion.character',
    outfit_front: 'fashion.outfit_front',
    outfit_back: 'fashion.outfit_back'
  };
  return bindings[role] || null;
}

function inferSelectionFashionBinding(fieldName: string): FashionBindingRole | null {
  const field = fieldName.toLocaleLowerCase();
  if (field.includes('environment') || field.includes('scene')) return 'fashion.environment';
  if (field.includes('pose')) return 'fashion.pose';
  return null;
}
