import assert from 'node:assert/strict';
import test from 'node:test';
import { createStructuredPromptProposal } from '../server/domain/prompt-composer/PromptComposerMapper.js';

const bundle = {
  library: [
    { id: 'character.001', category: 'character', subcategory: 'Gender', label: { en: 'Female' }, ui: { group: 'Character' }, prompt: { default: 'female woman' }, tags: ['character'], enabled: true },
    { id: 'clothing.100', category: 'clothing', subcategory: 'Dress', label: { en: 'Simple Dress' }, ui: { group: 'Clothing' }, prompt: { default: 'simple dress' }, tags: ['clothing', 'dress'], enabled: true },
    { id: 'environment.100', category: 'environment', subcategory: 'Location', label: { en: 'Cafe' }, ui: { group: 'Environment' }, prompt: { default: 'inside a cafe' }, tags: ['environment', 'cafe'], enabled: true }
  ]
};

test('Prompt Composer maps only enabled existing entries', () => {
  const proposal = createStructuredPromptProposal({ freeTextIdea: 'female model in a cafe wearing a dress' }, bundle);
  assert.deepEqual(proposal.fieldSelections.map(item => item.valueId).sort(), ['character.001', 'clothing.100', 'environment.100']);
  assert.equal(proposal.contentType, 'fashion');
  assert.ok(proposal.classificationSignals.includes('cafe'));
  assert.ok(proposal.fieldSelections.every(selection => bundle.library.some(entry => entry.id === selection.valueId)));
});

test('Prompt Composer accepts Thai intent aliases without creating new options', () => {
  const proposal = createStructuredPromptProposal({ freeTextIdea: 'นางแบบผู้หญิงในคาเฟ่ใส่เดรส' }, bundle);
  assert.deepEqual(proposal.fieldSelections.map(item => item.valueId).sort(), ['character.001', 'clothing.100', 'environment.100']);
  assert.ok(proposal.fieldSelections.every(selection => bundle.library.some(entry => entry.id === selection.valueId)));
});

test('Prompt Composer preserves unknown intent without inventing a selection', () => {
  const proposal = createStructuredPromptProposal({ freeTextIdea: 'an impossible floating glass city at dawn' }, bundle);
  assert.deepEqual(proposal.fieldSelections, []);
  assert.equal(proposal.customPromptParts.intent, 'an impossible floating glass city at dawn');
  assert.equal(proposal.finalPromptDraft, 'an impossible floating glass city at dawn');
});
