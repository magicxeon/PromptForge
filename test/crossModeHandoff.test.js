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
