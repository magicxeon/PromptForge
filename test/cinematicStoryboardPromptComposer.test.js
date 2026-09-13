import assert from 'node:assert/strict';
import test from 'node:test';
import { cinematicStoryboardPromptComposer } from '../server/domain/cinematic/CinematicStoryboardPromptComposer.js';

const VISUAL_PROMPT = `STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v2

KEYFRAME MOMENT:
Establishing keyframe. Exact moment: Nara stands alone inside the closed family cafe while rain remains outside the window. One visible action: she holds the CLOSED sign against her side.

SUBJECT AUTHORITY:
Characters: authorized Nara identity. Approved wardrobe: Quiet Resolve - Cafe Close.

VISIBLE PERFORMANCE:
Visible emotion: restrained loneliness. Expression and posture: chin slightly lowered. Observable cue: one shoulder rests lower than the other.

CAMERA AND COMPOSITION:
Aspect ratio 9:16. Camera: eye-level medium-wide. Placement: Nara is frame right and the exit stays frame right.

LIGHTING AND ENVIRONMENT:
Setting: closed family cafe at rainy blue dusk. Motivated light: cool window light falls across one side of her face while the deeper interior stays dim. Required environment: covered tables and a dry interior.

CONTINUITY:
Keep visible continuity: no other person; phone remains on the counter.

PROHIBITIONS:
Do not add subtitles, captions, watermarks or interface text.

AUTHOR DIRECTION:
Restrained live-action drama.`;

function context(overrides = {}) {
  return {
    provider: 'modelark',
    generationSurface: 'cinematic',
    generationMode: 'scene',
    cinematicCaptureProfileId: 'photorealistic-cinematic',
    characterReferenceOutfitBehavior: 'preserve',
    imageReferences: { characterReference: true, outfitReference: true },
    referenceRoleManifest: [
      { index: 1, roles: ['character_reference'] },
      { index: 2, roles: ['face_reference'] },
      { index: 3, roles: ['outfit_front'] }
    ],
    characterProfileContext: {
      purpose: 'character_usage',
      outfitBehavior: 'preserve',
      personalitySummarySnapshot: 'Cheerful, smiling and energetic.',
      identityPack: { ageRange: { minimum: 20, maximum: 23 } }
    },
    ...overrides
  };
}

test('provider-ready Storyboard prompt is Shot-first, role-bounded and generation-ready', () => {
  const prompt = cinematicStoryboardPromptComposer.compose({
    context: context({ cinematicFaceless: true }),
    visualPrompt: VISUAL_PROMPT
  });

  assert.ok(prompt.startsWith('Create ONE full-color photorealistic scene previs with BLANK FACES'));
  assert.match(prompt, /STORYBOARD KEYFRAME CONTRACT/);
  assert.ok(prompt.indexOf('KEYFRAME MOMENT') < prompt.indexOf('REFERENCE AUTHORITY'));
  assert.equal((prompt.match(/Reference image 1/g) || []).length, 1);
  assert.equal((prompt.match(/Reference image 2/g) || []).length, 1);
  assert.equal((prompt.match(/Reference image 3/g) || []).length, 1);
  assert.match(prompt, /character_reference/);
  assert.match(prompt, /face_reference/);
  assert.match(prompt, /outfit_front/);
  assert.match(prompt, /never a sheet, collage, split screen/i);
  assert.match(prompt, /authorized apparent age 20-23/i);
  assert.match(prompt, /Natural body weight, hands and shoulders; no posed portrait/i);
  assert.match(prompt, /BLANK-FACE previs overrides ALL facial detail or expression instructions/i);
  assert.match(prompt, /Authored action, hand\/prop contact, posture, head direction and light outrank incidental reference content/i);
  assert.match(prompt, /Preserve authored exposure and light falloff, without beauty fill/i);
  assert.match(prompt, /holds the CLOSED sign against her side/);
  assert.match(prompt, /deeper interior stays dim/);
  assert.match(prompt, /BLANK faces with faint thin guides ONLY/i);
  assert.doesNotMatch(prompt, /chromatic aberration|camera body|shutter speed|ISO \d/i);
  assert.doesNotMatch(prompt, /Cheerful, smiling and energetic/i);
  assert.ok(prompt.length < 6955);
  assert.ok(prompt.length <= 4700);
});

for (const cinematicFaceless of [true, false]) test(`capture profile can be disabled without removing baseline staging, faceless=${cinematicFaceless}`, () => {
  const prompt = cinematicStoryboardPromptComposer.compose({
    context: context({ cinematicFaceless, cinematicCaptureProfileId: null }),
    visualPrompt: VISUAL_PROMPT
  });

  assert.match(prompt, /woven fabric, solid props, contact shadows/i);
  if (cinematicFaceless) assert.match(prompt, /Preserve authored exposure and light falloff, without beauty fill/i);
  else assert.match(prompt, /Real actors, natural skin pores, individual hairs/i);
  assert.doesNotMatch(prompt, /Natural body anatomy and asymmetry|Natural facial anatomy, subtle microtexture/i);
  const withProfile = cinematicStoryboardPromptComposer.compose({ context: context({ cinematicFaceless }), visualPrompt: VISUAL_PROMPT });
  assert.match(withProfile, cinematicFaceless ? /Natural body anatomy and asymmetry/ : /Natural facial anatomy, subtle microtexture/);
});

test('composer truncates optional tail blocks at configured boundaries and stays bounded', () => {
  const longVisualPrompt = `${VISUAL_PROMPT}\n\nAUTHOR NOTES:\n${'Natural observed action in the current frame. '.repeat(120)}`;
  const prompt = cinematicStoryboardPromptComposer.compose({
    context: context({ cinematicFaceless: true }),
    visualPrompt: longVisualPrompt
  });

  assert.ok(prompt.startsWith('Create ONE full-color photorealistic scene previs with BLANK FACES'));
  assert.match(prompt, /STORYBOARD KEYFRAME CONTRACT/);
  assert.match(prompt, /REFERENCE AUTHORITY/);
  assert.match(prompt, /PHOTOGRAPHIC BEHAVIOR/);
  assert.ok(prompt.length <= 4700);
});

for (const cinematicFaceless of [true, false]) test(`composer rejects unowned Reference Processing roles, faceless=${cinematicFaceless}`, () => {
  assert.throws(() => cinematicStoryboardPromptComposer.compose({
    context: context({
      cinematicFaceless,
      referenceRoleManifest: [{ index: 1, roles: ['future_unowned_reference'] }]
    }),
    visualPrompt: VISUAL_PROMPT
  }), /Unsupported Cinematic reference role/i);
});

test('faceless: numbered Looks own only body, hair and wardrobe in the still', () => {
  const prompt = cinematicStoryboardPromptComposer.compose({ context: context({
    cinematicFaceless: true,
    referenceRoleManifest: [
      { index: 1, roles: ['template_baseline'] },
      { index: 2, roles: ['character_reference'], castNames: ['Lalin'] },
      { index: 3, roles: ['character_reference'], castNames: ['Kin'] }
    ]
  }), visualPrompt: 'Rainy night. Her hands hover above the pot rim without touching it; he has not noticed her.' });
  assert.match(prompt, /Reference image 1.*Scene\/blocking only.*NOT facial features/);
  assert.match(prompt, /Reference image 2.*Look Sheet body, hair and wardrobe.*ONLY for "Lalin"/);
  assert.match(prompt, /Reference image 3.*Look Sheet body, hair and wardrobe.*ONLY for "Kin"/);
  assert.match(prompt, /face stays BLANK.*NEVER copy portrait eyes, nose, lips, eyebrows or expression/);
  assert.doesNotMatch(prompt, /PRIMARY facial authority|Reconstruct blank faces|No blank faces/);
  assert.match(prompt, /hover above the pot rim without touching/);
  assert.doesNotMatch(prompt, /Korean|East Asian|monochrome graphite|Graphite storyboard/);
});

test('faceless OFF: scene, face and wardrobe roles stay exclusive with each person using their own Look', () => {
  const prompt = cinematicStoryboardPromptComposer.compose({ context: context({
    cinematicFaceless: false,
    referenceRoleManifest: [
      { index: 1, roles: ['template_baseline'] },
      { index: 2, roles: ['character_reference'], castNames: ['Lalin'] },
      { index: 3, roles: ['character_reference'], castNames: ['Kin'] },
      { index: 4, roles: ['face_reference'] },
      { index: 5, roles: ['outfit_front'] }
    ]
  }), visualPrompt: VISUAL_PROMPT });
  assert.match(prompt, /^Create ONE full-color photorealistic live-action opening frame with complete natural faces/);
  assert.match(prompt, /Reference image 1.*Scene\/blocking only.*NOT facial features/);
  assert.match(prompt, /Reference image 2.*Look Sheet facial identity and wardrobe ONLY for "Lalin"/);
  assert.match(prompt, /Reference image 3.*Look Sheet facial identity and wardrobe ONLY for "Kin"/);
  assert.match(prompt, /Reference image 4.*Exact facial identity.*matching the authored head angle/);
  assert.match(prompt, /Reference image 5.*only the approved front garment.*never copy the model pose/);
  assert.match(prompt, /their own assigned Look Sheet portrait is the exclusive facial identity authority/);
  assert.match(prompt, /Scene references control framing, geometry, body pose and head direction, never facial identity/);
  assert.match(prompt, /Never swap or blend faces or outfits/);
  assert.match(prompt, /never a sheet, collage, split screen/);
  assert.match(prompt, /authorized apparent age 20-23/);
  assert.match(prompt, /Visible emotion: restrained loneliness/);
  assert.doesNotMatch(prompt, /with BLANK FACES|face stays BLANK|faces stay blank|Leave the face BLANK|Suppress ALL facial features|ZERO eyes|BLANK-FACE previs overrides/i);
  assert.doesNotMatch(prompt, /Cheerful, smiling and energetic/);
  assert.ok(prompt.length <= 4700);
});

for (const cinematicFaceless of [true, false]) test(`all six Look bindings survive long prose without invented scene references, faceless=${cinematicFaceless}`, () => {
  const castNames = Array.from({ length: 6 }, (_, index) => `Character ${index} ${'n'.repeat(80)}`);
  const prompt = cinematicStoryboardPromptComposer.compose({ context: context({
    cinematicFaceless,
    referenceRoleManifest: castNames.map((name, index) => ({ index: index + 1, roles: ['character_reference'], castNames: [name] }))
  }), visualPrompt: `Opening moment: everyone stands still. ${'Optional scenic detail. '.repeat(200)}` });
  for (const [index, name] of castNames.entries()) {
    const label = cinematicFaceless ? 'Look Sheet body, hair and wardrobe' : 'Look Sheet facial identity and wardrobe';
    assert.ok(prompt.includes(`Reference image ${index + 1} (character_reference): ${label} ONLY for ${JSON.stringify(name)}.`));
  }
  if (cinematicFaceless) {
    assert.match(prompt, /Their face stays BLANK/);
    assert.match(prompt, /never reproduce sheet panels or labels/);
  } else {
    assert.match(prompt, /their own assigned Look Sheet portrait is the exclusive facial identity authority/);
    assert.match(prompt, /Do not copy sheet panels, labels, pose or background/);
    assert.doesNotMatch(prompt, /with BLANK FACES|Their face stays BLANK/);
  }
  assert.doesNotMatch(prompt, /Reference image 7|Reference image 1.*Scene\/blocking only/);
  assert.ok(prompt.length <= 4700);
});

for (const cinematicFaceless of [true, false]) test(`mandatory reference authority fails explicitly instead of truncating, faceless=${cinematicFaceless}`, () => {
  assert.throws(() => cinematicStoryboardPromptComposer.compose({ context: context({
    cinematicFaceless,
    referenceRoleManifest: Array.from({ length: 20 }, (_, index) => ({ index: index + 1, roles: ['character_reference'], castNames: ['n'.repeat(120)] }))
  }), visualPrompt: 'Opening moment.' }), /reference authority exceeds/);
});
