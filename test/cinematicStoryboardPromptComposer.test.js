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
    context: context(),
    visualPrompt: VISUAL_PROMPT
  });

  assert.ok(prompt.startsWith('STORYBOARD KEYFRAME CONTRACT'));
  assert.ok(prompt.indexOf('KEYFRAME MOMENT') < prompt.indexOf('REFERENCE AUTHORITY'));
  assert.equal((prompt.match(/Reference image 1/g) || []).length, 1);
  assert.equal((prompt.match(/Reference image 2/g) || []).length, 1);
  assert.equal((prompt.match(/Reference image 3/g) || []).length, 1);
  assert.match(prompt, /character_reference/);
  assert.match(prompt, /face_reference/);
  assert.match(prompt, /outfit_front/);
  assert.match(prompt, /never a sheet, collage, split screen/i);
  assert.match(prompt, /authorized apparent age 20-23/i);
  assert.match(prompt, /observed narrative moment, not a posed portrait/i);
  assert.match(prompt, /do not add a friendly micro-smile or direct camera gaze/i);
  assert.match(prompt, /do not raise, center or turn it toward camera/i);
  assert.match(prompt, /do not add beauty fill, lift the face or activate an unrequested fixture/i);
  assert.match(prompt, /subtle sensor noise/i);
  assert.doesNotMatch(prompt, /chromatic aberration|camera body|shutter speed|ISO \d/i);
  assert.doesNotMatch(prompt, /Cheerful, smiling and energetic/i);
  assert.ok(prompt.length < 6955);
  assert.ok(prompt.length <= 4700);
});

test('capture profile can be disabled without removing baseline Scene realism', () => {
  const prompt = cinematicStoryboardPromptComposer.compose({
    context: context({ cinematicCaptureProfileId: null }),
    visualPrompt: VISUAL_PROMPT
  });

  assert.match(prompt, /physically plausible live-action frame/i);
  assert.match(prompt, /motivated available or practical light/i);
  assert.doesNotMatch(prompt, /subtle sensor noise|source-consistent unretouched skin/i);
});

test('composer truncates optional tail blocks at configured boundaries and stays bounded', () => {
  const longVisualPrompt = `${VISUAL_PROMPT}\n\nAUTHOR NOTES:\n${'Natural observed action in the current frame. '.repeat(120)}`;
  const prompt = cinematicStoryboardPromptComposer.compose({
    context: context(),
    visualPrompt: longVisualPrompt
  });

  assert.ok(prompt.startsWith('STORYBOARD KEYFRAME CONTRACT'));
  assert.match(prompt, /REFERENCE AUTHORITY/);
  assert.match(prompt, /PHOTOGRAPHIC BEHAVIOR/);
  assert.ok(prompt.length <= 4700);
});

test('composer rejects a new Reference Processing role until its authority is configured', () => {
  assert.throws(() => cinematicStoryboardPromptComposer.compose({
    context: context({
      referenceRoleManifest: [{ index: 1, roles: ['future_unowned_reference'] }]
    }),
    visualPrompt: VISUAL_PROMPT
  }), /Unsupported Cinematic reference role/i);
});
