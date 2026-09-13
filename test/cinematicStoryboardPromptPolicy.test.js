import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compilePromptFromGenerationContext,
  createQueueOptions,
  normalizeGenerationContext
} from '../server/domain/generation/generationRequestService.js';

function context(overrides = {}) {
  return {
    mode: 'normal',
    generationMode: 'scene',
    generationSurface: 'cinematic',
    selections: {},
    aspectRatio: '9:16',
    imageReferences: {},
    sceneBuilder: {
      authoringMode: 'manual',
      manualPromptText: [
        'STORYBOARD STILL CONTRACT',
        'Selected Shot emotional target: Tense and watchful.',
        'Do not smile unless this Shot explicitly requests it.'
      ].join('\n')
    },
    characterProfileContext: {
      purpose: 'character_usage',
      personalitySummarySnapshot: 'cute, beautiful smile, sparkling eyes'
    },
    ...overrides
  };
}

for (const cinematicFaceless of [true, false]) test(`Cinematic Storyboard gives Shot emotion authority over personality, faceless=${cinematicFaceless}`, () => {
  const prompt = compilePromptFromGenerationContext(context({ cinematicFaceless }));
  assert.match(prompt, /STORYBOARD STILL CONTRACT/);
  assert.match(prompt, /Selected Shot emotional target: Tense and watchful/);
  assert.match(prompt, /Do not smile unless this Shot explicitly requests it/);
  assert.doesNotMatch(prompt, /cute, beautiful smile|Character personality baseline/i);
  if (cinematicFaceless) {
    assert.ok(prompt.startsWith('Create ONE full-color photorealistic scene previs with BLANK FACES'));
    assert.match(prompt, /Natural body weight, hands and shoulders; no posed portrait/i);
    assert.match(prompt, /Rest of scene photographic, not sketch, anime or CGI/i);
    assert.match(prompt, /BLANK faces with faint thin guides ONLY/i);
    assert.match(prompt, /Head angle conveys attention, never facial expression/i);
    assert.match(prompt, /The opening moment controls body pose and head direction/i);
    assert.match(prompt, /Keep authored hand\/prop contact and placement/i);
    assert.match(prompt, /Preserve authored exposure and light falloff, without beauty fill/i);
  } else {
    assert.ok(prompt.startsWith('Create ONE full-color photorealistic live-action opening frame with complete natural faces'));
    assert.match(prompt, /EACH person's own Look Sheet portrait for their exact facial identity/);
    assert.match(prompt, /perform the authored emotion and attention without posing for a portrait/);
    assert.match(prompt, /Authored opening moment controls pose and head direction/);
    assert.match(prompt, /No blank or unfinished faces, construction guides/);
    assert.doesNotMatch(prompt, /with BLANK FACES|face stays BLANK|faces stay blank|BLANK faces with faint thin guides ONLY|BLANK-FACE previs overrides|ZERO eyes/i);
  }
  assert.doesNotMatch(prompt, /Draw a monochrome|Graphite storyboard|No photorealistic rendering/i);
  assert.ok(prompt.length <= 4700);
});

test('Cinematic Storyboard realism policy does not affect non-Cinematic Scene generation', () => {
  const prompt = compilePromptFromGenerationContext(context({ generationSurface: 'studio' }));
  assert.doesNotMatch(prompt, /cinematic-storyboard-still/i);
  assert.doesNotMatch(prompt, /Character personality baseline/i);
  assert.match(prompt, /Portray the character personality as/i);
});

for (const cinematicFaceless of [true, false]) test(`Cinematic Storyboard can disable only the optional natural camera profile, faceless=${cinematicFaceless}`, () => {
  const prompt = compilePromptFromGenerationContext(context({ cinematicFaceless, cinematicCaptureProfileId: null }));
  assert.match(prompt, /woven fabric, solid props, contact shadows/i);
  if (cinematicFaceless) assert.match(prompt, /Preserve authored exposure and light falloff, without beauty fill/i);
  else assert.match(prompt, /Real actors, natural skin pores, individual hairs/i);
  assert.doesNotMatch(prompt, /Natural body anatomy and asymmetry|Natural facial anatomy, subtle microtexture/i);
  assert.match(prompt, /Selected Shot emotional target: Tense and watchful/i);
});

test('Cinematic Storyboard defaults and validates the capture profile before estimate or submit', () => {
  const normalized = normalizeGenerationContext(context({ promptRefinement: { enabled: true } }));
  assert.equal(normalized.cinematicCaptureProfileId, 'photorealistic-cinematic');
  assert.equal(normalized.promptRefinement.enabled, false);
  assert.throws(
    () => normalizeGenerationContext(context({ cinematicCaptureProfileId: 'unknown-profile' })),
    error => error.code === 'cinematic_capture_profile_invalid' && error.statusCode === 400
  );
});

test('queue metadata follows normalized default/OFF/ON rather than a caller-supplied Storyboard style', () => {
  for (const cinematicFaceless of [undefined, false, true]) {
    const request = context({ storyboardRenderStyle: 'concept_sketch_v1' });
    if (cinematicFaceless !== undefined) request.cinematicFaceless = cinematicFaceless;
    const normalized = normalizeGenerationContext(request);
    assert.equal(normalized.cinematicFaceless, cinematicFaceless === true);
    const style = cinematicFaceless === true ? 'faceless_previs_v1' : 'photorealistic_storyboard_v1';
    assert.equal(createQueueOptions(normalized, { modelConfig: { defaults: {} } }).storyboardRenderStyle, style);
    const prompt = compilePromptFromGenerationContext(normalized);
    assert.match(prompt, cinematicFaceless === true ? /^Create ONE.*with BLANK FACES/ : /^Create ONE.*with complete natural faces/);
  }
  assert.equal(createQueueOptions(normalizeGenerationContext(context({ generationSurface: 'studio', storyboardRenderStyle: 'concept_sketch_v1' })), { modelConfig: { defaults: {} } }).storyboardRenderStyle, null);
});
