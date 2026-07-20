import assert from 'node:assert/strict';
import test from 'node:test';

// Replicate the client carry selections logic for server validation
function carrySelectionsForHandoff(sourceSelections, keepBodyClothing) {
  const carried = {};
  const dropped = [];

  const ALLOWED_GROUPS = new Set(["Character", "Face", "Hair", "Skin"]);
  if (keepBodyClothing) {
    ALLOWED_GROUPS.add("Body");
    ALLOWED_GROUPS.add("Clothing");
  }

  Object.keys(sourceSelections || {}).forEach(fieldName => {
    const selection = sourceSelections[fieldName];
    if (selection && ALLOWED_GROUPS.has(selection.group)) {
      carried[fieldName] = { ...selection };
    } else {
      dropped.push(fieldName);
    }
  });

  return { carriedSelections: carried, droppedFields: dropped };
}

function cleanReferenceImageSrc(src) {
  if (!src) return "";
  const outputIndex = src.indexOf("/outputs/");
  return outputIndex !== -1 ? src.substring(outputIndex) : src;
}

function applyHeadshotToCharacterSheetForTest(state, context, options) {
  state.mode = "character-sheet";

  if (options.carryAttrs) {
    const { carriedSelections } = carrySelectionsForHandoff(context.sourceSelections, !options.freshBodyClothing);
    state.selections = carriedSelections;
  } else {
    state.selections = {};
  }

  if (options.useAsFaceMatch) {
    state.imageReferences.faceMatch = true;
    state.faceReferenceImageA = cleanReferenceImageSrc(context.sourceImageUrl);
    state.faceReferenceImageB = null;
    state.faceReferenceJobIds = context.sourceJobId ? [context.sourceJobId] : [];
  } else {
    state.imageReferences.faceMatch = false;
    state.faceReferenceImageA = null;
    state.faceReferenceImageB = null;
    state.faceReferenceJobIds = [];
  }
}

function resolveSourceSelectionsForTest(result, state) {
  if (result.selections && Object.keys(result.selections).length > 0) {
    return JSON.parse(JSON.stringify(result.selections));
  }
  if (result.mode && result.mode === state.mode && state.selections && Object.keys(state.selections).length > 0) {
    return JSON.parse(JSON.stringify(state.selections));
  }
  return {};
}

test('Headshot to Character Sheet carries only identity and appearance features', () => {
  const selections = {
    Gender: { value: 'female', group: 'Character' },
    'Face Shape': { value: 'oval', group: 'Face' },
    'Hair Color': { value: 'brown', group: 'Hair' },
    'Skin Texture': { value: 'smooth', group: 'Skin' },
    'Body Shape': { value: 'athletic', group: 'Body' },
    Clothing: { value: 't-shirt', group: 'Clothing' },
    Pose: { value: 'standing', group: 'Pose' },
    Location: { value: 'studio', group: 'Environment' },
    Lighting: { value: 'soft', group: 'Lighting' }
  };

  const { carriedSelections, droppedFields } = carrySelectionsForHandoff(selections, false);

  assert.ok(carriedSelections.Gender);
  assert.ok(carriedSelections['Face Shape']);
  assert.ok(carriedSelections['Hair Color']);
  assert.ok(carriedSelections['Skin Texture']);

  assert.ok(!carriedSelections['Body Shape']);
  assert.ok(!carriedSelections.Clothing);
  assert.ok(!carriedSelections.Pose);
  assert.ok(!carriedSelections.Location);
  assert.ok(!carriedSelections.Lighting);

  assert.ok(droppedFields.includes('Pose'));
  assert.ok(droppedFields.includes('Location'));
  assert.ok(droppedFields.includes('Body Shape'));
});

test('Headshot to Character Sheet with keepBodyClothing keeps Body and Clothing', () => {
  const selections = {
    Gender: { value: 'female', group: 'Character' },
    'Body Shape': { value: 'athletic', group: 'Body' },
    Clothing: { value: 't-shirt', group: 'Clothing' },
    Pose: { value: 'standing', group: 'Pose' }
  };

  const { carriedSelections } = carrySelectionsForHandoff(selections, true);

  assert.ok(carriedSelections.Gender);
  assert.ok(carriedSelections['Body Shape']);
  assert.ok(carriedSelections.Clothing);
  assert.ok(!carriedSelections.Pose);
});

test('Headshot to Character Sheet attaches generated image when user selects Face Match', () => {
  const state = {
    mode: 'headshot',
    selections: {},
    imageReferences: { faceMatch: false },
    faceReferenceImageA: null,
    faceReferenceImageB: null,
    faceReferenceJobIds: []
  };
  const context = {
    sourceJobId: 'job-123',
    sourceImageUrl: 'http://localhost:3000/outputs/headshot-123.png',
    sourceSelections: {
      Gender: { value: 'female', group: 'Character' },
      'Face Shape': { value: 'oval', group: 'Face' },
      'Body Shape': { value: 'hourglass', group: 'Body' }
    },
    canAttachImageReference: false
  };

  applyHeadshotToCharacterSheetForTest(state, context, {
    useAsFaceMatch: true,
    carryAttrs: true,
    freshBodyClothing: true
  });

  assert.equal(state.mode, 'character-sheet');
  assert.equal(state.imageReferences.faceMatch, true);
  assert.equal(state.faceReferenceImageA, '/outputs/headshot-123.png');
  assert.deepEqual(state.faceReferenceJobIds, ['job-123']);
  assert.ok(state.selections.Gender);
  assert.ok(state.selections['Face Shape']);
  assert.ok(!state.selections['Body Shape']);
});

test('Headshot to Character Sheet clears Face Match when user skips generated image reference', () => {
  const state = {
    mode: 'headshot',
    selections: {},
    imageReferences: { faceMatch: true },
    faceReferenceImageA: '/outputs/old.png',
    faceReferenceImageB: '/outputs/old-b.png',
    faceReferenceJobIds: ['old-a', 'old-b']
  };

  applyHeadshotToCharacterSheetForTest(state, {
    sourceJobId: 'job-123',
    sourceImageUrl: '/outputs/headshot-123.png',
    sourceSelections: {}
  }, {
    useAsFaceMatch: false,
    carryAttrs: false,
    freshBodyClothing: true
  });

  assert.equal(state.imageReferences.faceMatch, false);
  assert.equal(state.faceReferenceImageA, null);
  assert.equal(state.faceReferenceImageB, null);
  assert.deepEqual(state.faceReferenceJobIds, []);
});

test('Handoff falls back to current mode selections when result metadata has no selections', () => {
  const state = {
    mode: 'headshot',
    selections: {
      Gender: { value: 'female', group: 'Character' },
      'Hair Color': { value: 'jet black hair', group: 'Hair' }
    }
  };

  const resolved = resolveSourceSelectionsForTest({ mode: 'headshot', selections: {} }, state);

  assert.ok(resolved.Gender);
  assert.ok(resolved['Hair Color']);
});
