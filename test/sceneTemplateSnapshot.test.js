import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createSceneTemplateSnapshot as createServerSnapshot, sanitizeSceneTemplateSnapshot } from '../server/sceneTemplates/sceneTemplateSnapshot.js';
import { validateSceneTemplateSnapshot } from '../server/sceneTemplates/SceneTemplateValidator.js';

// Setup browser window mock environment for client serializer
global.window = { state: {} };
const scriptPath = path.resolve(process.cwd(), 'client/scene-builder/sceneTemplateSerializer.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');
eval(scriptContent);

const clientSerializer = global.window.ModelPromptForgeSceneTemplateSerializer;

test('client createSceneTemplateSnapshot produces enriched metadata and slots pure output', () => {
  const input = {
    authoringMode: 'guided',
    finalPrompt: 'A highly photorealistic scene',
    selections: {
      Gender: { id: 'gender.female', group: 'Character' }
    },
    imageReferences: {
      faceMatch: true
    },
    customColors: {
      Color: { enabled: true }
    },
    providerId: 'google',
    providerDisplayName: 'Google Gemini',
    modelId: 'gemini-3-pro-image',
    modelDisplayName: 'Nano Banana Pro',
    resolutionAspectRatios: ['1:1', '16:9', '6:8'],
    referenceSupportSummary: 'up to 2 references',
    estimatedCreditCost: 2,
    aspectRatio: '6:8',
    width: '768',
    height: '1024'
  };

  const snapshot = clientSerializer.createSceneTemplateSnapshot(input);

  assert.equal(snapshot.sceneTemplateVersion, 1);
  assert.equal(snapshot.authoringMode, 'guided');
  assert.equal(snapshot.finalPromptSnapshot, 'A highly photorealistic scene');
  assert.equal(snapshot.structuredSelectionsSnapshot.Gender.id, 'gender.female');
  
  // Reference slots
  assert.ok(snapshot.referenceSlotMapping.face_reference);
  assert.equal(snapshot.referenceSlotMapping.face_reference.policy, 'required_user_replacement');
  
  // Rich provider metadata
  assert.equal(snapshot.providerModelSnapshot.providerId, 'google');
  assert.equal(snapshot.providerModelSnapshot.providerDisplayName, 'Google Gemini');
  assert.equal(snapshot.providerModelSnapshot.modelId, 'gemini-3-pro-image');
  assert.equal(snapshot.providerModelSnapshot.modelDisplayName, 'Nano Banana Pro');
  assert.equal(snapshot.providerModelSnapshot.estimatedCreditCost, 2);
  assert.deepEqual(snapshot.providerModelSnapshot.resolutionAspectRatios, ['1:1', '16:9', '6:8']);

  // Settings
  assert.equal(snapshot.generationSettingsSnapshot.aspectRatio, '6:8');
  assert.equal(snapshot.generationSettingsSnapshot.width, '768');
  assert.equal(snapshot.generationSettingsSnapshot.height, '1024');
});

test('createServerSnapshot produces correctly structured snapshot object', () => {
  const input = {
    authoringMode: 'guided',
    finalPrompt: 'A beautiful beach scene',
    selections: {
      Gender: { id: 'gender.female', group: 'Character' }
    },
    replaceableVariables: [
      { id: 'gender', type: 'select_option', required: true }
    ],
    provider: 'openai',
    providerDisplayName: 'OpenAI Display Name',
    submodel: 'gpt-image-2',
    modelDisplayName: 'GPT-2 Model Name',
    resolutionAspectRatios: ['1:1', '16:9'],
    referenceSupportSummary: 'up to 1 reference',
    estimatedCreditCost: 1,
    aspectRatio: '16:9',
    width: '1920',
    height: '1080'
  };

  const snapshot = createServerSnapshot(input);

  assert.equal(snapshot.sceneTemplateVersion, 1);
  assert.equal(snapshot.authoringMode, 'guided');
  assert.equal(snapshot.finalPromptSnapshot, 'A beautiful beach scene');
  assert.equal(snapshot.structuredSelectionsSnapshot.Gender.id, 'gender.female');
  assert.equal(snapshot.replaceableVariables[0].id, 'gender');
  assert.equal(snapshot.providerModelSnapshot.providerId, 'openai');
  assert.equal(snapshot.providerModelSnapshot.providerDisplayName, 'OpenAI Display Name');
  assert.equal(snapshot.providerModelSnapshot.modelId, 'gpt-image-2');
  assert.equal(snapshot.providerModelSnapshot.modelDisplayName, 'GPT-2 Model Name');
  assert.equal(snapshot.providerModelSnapshot.estimatedCreditCost, 1);
  assert.deepEqual(snapshot.providerModelSnapshot.resolutionAspectRatios, ['1:1', '16:9']);
  assert.equal(snapshot.generationSettingsSnapshot.aspectRatio, '16:9');
  assert.equal(snapshot.generationSettingsSnapshot.width, '1920');
  assert.equal(snapshot.generationSettingsSnapshot.height, '1080');
});

test('validateSceneTemplateSnapshot validates snapshot structure correctly', () => {
  const invalid = {};
  const res1 = validateSceneTemplateSnapshot(invalid);
  assert.ok(!res1.success);
  assert.ok(res1.errors.length > 0);

  const valid = {
    sceneTemplateVersion: 1,
    authoringMode: 'guided',
    finalPromptSnapshot: 'A prompt',
    replaceableVariables: [],
    providerModelSnapshot: { providerId: 'gemini', modelId: 'nano' },
    generationSettingsSnapshot: { aspectRatio: '6:8', width: '768', height: '1024' }
  };
  const res2 = validateSceneTemplateSnapshot(valid);
  assert.ok(res2.success);
  assert.equal(res2.errors.length, 0);
});

test('sanitizeSceneTemplateSnapshot applies visibility policy correctly', () => {
  const snapshot = {
    sceneTemplateVersion: 1,
    authoringMode: 'guided',
    finalPromptSnapshot: 'Sensitive raw prompt text',
    structuredSelectionsSnapshot: {
      Gender: { id: 'gender.female', value: 'female model', group: 'Character' }
    },
    referenceSlotMapping: {
      face_reference: { required: true, sourceAssetId: 'asset_123', sourceJobId: 'job_456' }
    },
    replaceableVariables: [],
    providerModelSnapshot: { providerId: 'gemini', modelId: 'nano' },
    generationSettingsSnapshot: { aspectRatio: '6:8', width: '768', height: '1024' }
  };

  // Remix Only policy: redacts prompt and values, strips sensitive details
  const remixOnly = sanitizeSceneTemplateSnapshot(snapshot, 'remix_only');
  assert.equal(remixOnly.finalPromptSnapshot, '');
  assert.equal(remixOnly.structuredSelectionsSnapshot.Gender.value, '[Hidden]');
  assert.ok(!remixOnly.referenceSlotMapping.face_reference.sourceAssetId);

  // Partial policy: redacts full prompt, keeps structured values
  const partial = sanitizeSceneTemplateSnapshot(snapshot, 'partial');
  assert.equal(partial.finalPromptSnapshot, '');
  assert.equal(partial.structuredSelectionsSnapshot.Gender.value, 'female model');
});
