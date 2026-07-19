import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

// Setup browser window mock environment for testing client resolver
global.window = { state: { library: [] } };

const resolverPath = path.resolve(process.cwd(), 'client/scene-builder/sceneVariableResolver.js');
const validatorPath = path.resolve(process.cwd(), 'client/scene-builder/sceneTemplateValidation.js');

eval(fs.readFileSync(resolverPath, 'utf8'));
eval(fs.readFileSync(validatorPath, 'utf8'));

const resolver = global.window.ModelPromptForgeSceneVariableResolver;
const validator = global.window.ModelPromptForgeSceneTemplateValidation;

test('createSceneVariablesFromSelections builds variables list with correct policies', () => {
  const selections = {
    Gender: { id: 'gender.female', group: 'Character' }, // Identity -> locked by default
    Outfit: { id: 'outfit.blazer', group: 'Clothing' },   // Non-identity -> replaceable
    CustomField: { value: 'some prompt detail', isCustom: true, group: 'Style' }
  };

  const referenceSlots = {
    character_reference: { required: true }
  };

  const customColors = {
    ColorA: { enabled: true, color: '#ff0000' }
  };

  const variables = resolver.createSceneVariablesFromSelections(selections, referenceSlots, customColors);

  // Identity locked
  const genderVar = variables.find(v => v.id === 'gender');
  assert.ok(genderVar);
  assert.equal(genderVar.replacementPolicy, 'locked');

  // Clothing replaceable
  const outfitVar = variables.find(v => v.id === 'outfit');
  assert.ok(outfitVar);
  assert.equal(outfitVar.replacementPolicy, 'replaceable');

  // Custom colors
  const colorVar = variables.find(v => v.id === 'custom_color_colora');
  assert.ok(colorVar);
  assert.equal(colorVar.type, 'color');

  // Reference slot
  const refVar = variables.find(v => v.id === 'character_reference');
  assert.ok(refVar);
  assert.equal(refVar.type, 'reference_image');
  assert.equal(refVar.required, true);
});

test('resolveTemplateVariables returns correct patches and warnings', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'gender', type: 'select_option', sourceFieldName: 'Gender', sourceGroup: 'Character', replacementPolicy: 'locked', defaultValue: 'gender.male' },
      { id: 'outfit', type: 'select_option', sourceFieldName: 'Outfit', sourceGroup: 'Clothing', replacementPolicy: 'replaceable' },
      { id: 'custom_color_colora', type: 'color', sourceFieldName: 'ColorA', replacementPolicy: 'replaceable' },
      { id: 'character_reference', type: 'reference_image', sourceFieldName: 'character_reference', required: true }
    ]
  };

  const library = [
    { id: 'outfit.blazer', enabled: true },
    { id: 'gender.male', enabled: true }
  ];

  // Try to replace a locked variable -> warning, does not resolve
  const result1 = resolver.resolveTemplateVariables(snapshot, { gender: 'gender.female', outfit: 'outfit.blazer' }, library);
  assert.ok(!result1.success);
  assert.equal(result1.warnings.length, 2); // 1 for locked gender, 1 for missing required character_reference
  assert.ok(!result1.patch.selections.Gender);
  assert.equal(result1.patch.selections.Outfit.id, 'outfit.blazer');

  // Successful resolution
  const result2 = resolver.resolveTemplateVariables(
    snapshot,
    { outfit: 'outfit.blazer', custom_color_colora: '#00ff00', character_reference: 'data:image/png;base64,...' },
    library
  );
  assert.ok(result2.success);
  assert.equal(result2.warnings.length, 0);
  assert.equal(result2.patch.selections.Outfit.id, 'outfit.blazer');
  assert.equal(result2.patch.customColors.ColorA.color, '#00ff00');
  assert.equal(result2.patch.references.character_reference, 'data:image/png;base64,...');
});

test('validateTemplateVariable and validateReplacementInput constraints', () => {
  const variable = { id: 'color_var', type: 'color', sourceFieldName: 'Color' };
  const res1 = validator.validateTemplateVariable(variable);
  assert.ok(res1.success);

  // Invalid hex color format
  const res2 = validator.validateReplacementInput(variable, 'red');
  assert.ok(!res2.success);
  assert.equal(res2.errors.length, 1);

  // Valid hex color
  const res3 = validator.validateReplacementInput(variable, '#aabbcc');
  assert.ok(res3.success);
});

test('getMissingRequiredVariables returns list of unprovided fields', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'req_field', type: 'select_option', required: true, sourceFieldName: 'Req' },
      { id: 'opt_field', type: 'select_option', required: false, sourceFieldName: 'Opt' }
    ]
  };

  const missing = validator.getMissingRequiredVariables(snapshot, {});
  assert.equal(missing.length, 1);
  assert.equal(missing[0].id, 'req_field');
});
