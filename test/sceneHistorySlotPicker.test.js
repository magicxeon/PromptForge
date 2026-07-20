import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

// Mock window globals for client checklist coordinator and slot picker
global.window = {
  state: { library: [] },
  ModelPromptForgeSceneReplacementChecklist: {
    userInputValues: {},
    getActiveTemplateSnapshot: () => ({
      replaceableVariables: [
        { id: 'face_reference', type: 'reference_image', required: true, label: 'Face Reference' },
        { id: 'character_reference', type: 'reference_image', required: true, label: 'Character Reference' },
        { id: 'style_reference', type: 'reference_image', required: false, label: 'Style Reference' }
      ]
    }),
    isTemplateWorkflowActive: () => true,
    renderChecklist: () => {},
    updateGenerateButtonState: () => {}
  }
};

const pickerPath = path.resolve(process.cwd(), 'client/scene-builder/sceneHistorySlotPicker.js');
eval(fs.readFileSync(pickerPath, 'utf8'));

const picker = global.window.ModelPromptForgeSceneHistorySlotPicker;

test('getTemplateReferenceVariables extracts reference_image type variables', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'gender', type: 'select_option' },
      { id: 'face_reference', type: 'reference_image' },
      { id: 'custom_detail', type: 'custom_text' },
      { id: 'style_reference', type: 'reference_image' }
    ]
  };

  const refs = picker.getTemplateReferenceVariables(snapshot);
  assert.equal(refs.length, 2);
  assert.equal(refs[0].id, 'face_reference');
  assert.equal(refs[1].id, 'style_reference');
});

test('getMissingRequiredReferenceVariables lists required slots that lack values', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'face_reference', type: 'reference_image', required: true },
      { id: 'character_reference', type: 'reference_image', required: true },
      { id: 'style_reference', type: 'reference_image', required: false }
    ]
  };

  const userInput = {
    face_reference: { source: 'history', jobId: 'job_1' }
  };

  const missing = picker.getMissingRequiredReferenceVariables(snapshot, userInput);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].id, 'character_reference');
});

test('getDefaultHistoryTargetSlot recommends face_reference for headshots', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'face_reference', type: 'reference_image' },
      { id: 'style_reference', type: 'reference_image' }
    ]
  };

  const historyItem = { mode: 'headshot' };
  const target = picker.getDefaultHistoryTargetSlot(snapshot, {}, historyItem);
  assert.equal(target, 'face_reference');
});

test('getDefaultHistoryTargetSlot recommends character_reference for character sheets', () => {
  const snapshot = {
    replaceableVariables: [
      { id: 'character_reference', type: 'reference_image' },
      { id: 'style_reference', type: 'reference_image' }
    ]
  };

  const historyItem = { mode: 'character-sheet' };
  const target = picker.getDefaultHistoryTargetSlot(snapshot, {}, historyItem);
  assert.equal(target, 'character_reference');
});

test('assignHistoryImageToTemplateSlot updates checklist inputs', async () => {
  const historyItem = {
    id: 'job_test123',
    imageUrl: '/outputs/job_test123.png',
    mode: 'headshot',
    provider: 'openai',
    submodel: 'dall-e-3'
  };

  const res = await picker.assignHistoryImageToTemplateSlot('face_reference', historyItem);
  assert.equal(res.success, true);
  assert.equal(res.slotId, 'face_reference');

  const assignedVal = global.window.ModelPromptForgeSceneReplacementChecklist.userInputValues['face_reference'];
  assert.ok(assignedVal);
  assert.equal(assignedVal.source, 'history');
  assert.equal(assignedVal.jobId, 'job_test123');
  assert.equal(assignedVal.imageUrl, '/outputs/job_test123.png');
});

test('openTemplateSlotPicker auto-fills when exactly one missing required slot exists', async () => {
  global.window.ModelPromptForgeSceneReplacementChecklist.userInputValues = {};
  global.window.ModelPromptForgeSceneReplacementChecklist.getActiveTemplateSnapshot = () => ({
    replaceableVariables: [
      { id: 'face_reference', type: 'reference_image', required: true }
    ]
  });

  let confirmCalled = false;
  global.window.AppDialog = {
    confirm: async () => { confirmCalled = true; return true; }
  };

  const historyItem = { id: 'job_456', imageUrl: '/outputs/job_456.png' };
  await picker.openTemplateSlotPicker(historyItem);

  assert.equal(confirmCalled, false);
  const val = global.window.ModelPromptForgeSceneReplacementChecklist.userInputValues['face_reference'];
  assert.ok(val);
  assert.equal(val.jobId, 'job_456');
});

test('openTemplateSlotPicker triggers AppDialog.select when multiple slots exist', async () => {
  global.window.ModelPromptForgeSceneReplacementChecklist.userInputValues = {};
  global.window.ModelPromptForgeSceneReplacementChecklist.getActiveTemplateSnapshot = () => ({
    replaceableVariables: [
      { id: 'face_reference', type: 'reference_image', required: true, label: 'Face' },
      { id: 'style_reference', type: 'reference_image', required: true, label: 'Style' }
    ]
  });

  let selectPromptMsg = '';
  let selectOptions = null;
  global.window.AppDialog = {
    select: async (msg, opts) => {
      selectPromptMsg = msg;
      selectOptions = opts.options;
      return 'style_reference';
    }
  };

  const historyItem = { id: 'job_789', imageUrl: '/outputs/job_789.png', mode: 'headshot' };
  await picker.openTemplateSlotPicker(historyItem);

  assert.equal(selectPromptMsg, 'Select target reference slot:');
  assert.ok(selectOptions);
  
  const faceOpt = selectOptions.find(o => o.value === 'face_reference');
  assert.match(faceOpt.label, /Recommended/);
  assert.match(faceOpt.label, /Required/);

  const val = global.window.ModelPromptForgeSceneReplacementChecklist.userInputValues['style_reference'];
  assert.ok(val);
  assert.equal(val.jobId, 'job_789');
});

test('sceneVariableControls correctly previews reference objects', () => {
  const createdElements = [];
  global.document = {
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        appendChild: (c) => el.children.push(c),
        addEventListener: () => {},
        children: []
      };
      createdElements.push(el);
      return el;
    }
  };

  const controlsPath = path.resolve(process.cwd(), 'client/scene-builder/sceneVariableControls.js');
  eval(fs.readFileSync(controlsPath, 'utf8'));
  const controls = global.window.ModelPromptForgeSceneVariableControls;

  const container = { appendChild: () => {} };
  const variable = { id: 'style_ref', type: 'reference_image', label: 'Style', required: false };
  const refObj = { source: 'history', jobId: 'job_abc', imageUrl: '/outputs/job_abc.png' };

  controls.renderSceneVariableControl(container, variable, refObj, () => {});

  const imgEl = createdElements.find(e => e.tagName === 'IMG');
  assert.ok(imgEl);
  assert.equal(imgEl.src, '/outputs/job_abc.png');
  assert.equal(imgEl.style.display, 'block');

  const spanEl = createdElements.find(e => e.tagName === 'SPAN' && e.className === 'sub-label');
  assert.ok(spanEl);
  assert.match(spanEl.innerText, /Selected from History/);
  assert.match(spanEl.innerText, /abc/);

  delete global.document;
});
