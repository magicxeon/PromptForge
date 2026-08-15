import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStructuredReferenceBrief
} from '../server/domain/reference-processing/StructuredReferenceBrief.js';

test('Fashion structured brief keeps Template expression as non-identity performance', () => {
  const brief = buildStructuredReferenceBrief({
    orderedReferences: [
      { roles: ['template_baseline'] },
      { roles: ['character_reference'] },
      { roles: ['outfit_front'] }
    ],
    config: {
      id: 'fashion_test',
      generationSurfaces: ['fashion'],
      requiredRoles: ['template_baseline', 'character_reference', 'outfit_front'],
      task: 'Generate one image.',
      templateDirection: section(),
      characterIdentity: section(),
      outfitTransfer: section(),
      output: {
        subjectCount: 1,
        singleFullFramePhoto: true,
        fullBodyVisible: true,
        prohibit: []
      }
    },
    context: {
      generationSurface: 'fashion',
      aspectRatio: '6:8',
      selections: {
        Expression: { value: 'sharing a genuine candid laugh' }
      }
    }
  });

  assert.equal(
    brief.template_performance_direction.expression,
    'sharing a genuine candid laugh'
  );
  assert.match(
    brief.template_performance_direction.instruction,
    /selected Character identity/i
  );
  assert.match(
    brief.template_performance_direction.instruction,
    /never copy Template facial anatomy/i
  );
});

function section() {
  return {
    authority: [],
    preserve: [],
    ignore: []
  };
}
