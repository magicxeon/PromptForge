import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

// Setup browser window mock environment
global.window = { state: { selections: {} } };

const scriptPath = path.resolve(process.cwd(), 'client/scene-builder/sceneTemplateHydrator.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Also need sceneBuilderState mock as the hydrator references it
global.window.ModelPromptForgeSceneBuilderState = {
  applyPatch: (patch) => {
    global.window.state.sceneBuilder = { ...global.window.state.sceneBuilder, ...patch };
  }
};

// Evaluate the production code
eval(scriptContent);

const hydrator = global.window.ModelPromptForgeSceneTemplateHydrator;

test('hydrateSceneTemplate validates options against library and issues warnings for stale ones', () => {
  const snapshot = {
    sceneTemplateVersion: 1,
    authoringMode: 'guided',
    structuredSelectionsSnapshot: {
      Gender: { id: 'gender.female', group: 'Character' },
      Lighting: { id: 'lighting.neon_neon_stale', group: 'Lighting' },
      CustomField: { id: '', value: 'Freestyle text description', isCustom: true }
    },
    generationSettingsSnapshot: {
      aspectRatio: '16:9'
    }
  };

  const library = [
    { id: 'gender.female', enabled: true },
    { id: 'gender.male', enabled: true }
  ];

  const result = hydrator.hydrateSceneTemplate(snapshot, {}, library);

  assert.ok(result.success);
  assert.equal(result.patch.aspectRatio, '16:9');
  assert.equal(result.patch.selections.Gender.id, 'gender.female');
  assert.equal(result.patch.selections.CustomField.value, 'Freestyle text description');
  
  // Stale lighting option must be omitted and returned as a warning
  assert.ok(!result.patch.selections.Lighting);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /stale or unavailable/);
});
