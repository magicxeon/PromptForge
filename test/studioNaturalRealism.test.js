import assert from 'node:assert/strict';
import test from 'node:test';
import { applyStudioNaturalRealism, studioRealismProfile } from '../server/domain/generation/studioNaturalRealism.js';
import { compileGenerationContext } from '../server/domain/generation/generationRequestService.js';
import { PromptRefinementService } from '../server/domain/generation/PromptRefinementService.js';

test('Studio realism remains present after optional AI refinement', async () => {
  const context = { generationSurface: 'studio', generationMode: 'headshot' };
  const service = new PromptRefinementService({
    policyLoader: () => ({ enabled: true, provider: 'mock', model: 'mock' }),
    availabilityPolicy: { assertAvailable() {} }, logger: { info() {} },
    providerFactory: () => ({ async refinePrompt() { return { refinedPrompt: 'A natural portrait.', warnings: [], changeSummary: [], preservedAuthorities: [] }; } }),
  });
  const result = await service.refine({ prompt: applyStudioNaturalRealism('A portrait.', context), context, requested: true });
  assert.equal(result.metadata.applied, true);
  assert.match(result.prompt, /Do not invent wrinkles/);
});

for (const generationMode of ['headshot', 'character-sheet', 'scene']) {
  test(`Studio ${generationMode} uses versioned realism without replacing direction`, () => {
    const context = { generationSurface: 'studio', generationMode };
    const prompt = applyStudioNaturalRealism('Keep the approved outfit and layout.', context);
    assert.ok(prompt.startsWith('Keep the approved outfit and layout.'));
    assert.match(prompt, /apparent age/);
    assert.match(prompt, /Do not invent wrinkles/);
    assert.match(prompt, /do not convert illustration/);
    assert.match(prompt, generationMode === 'headshot' ? /portrait distance/ : /actual viewing distance/);
    assert.equal(studioRealismProfile(context).version, 1);
    assert.equal(applyStudioNaturalRealism(prompt, context), prompt);
    const compiled = compileGenerationContext({ ...context, mode: generationMode === 'scene' ? 'normal' : generationMode, selections: {} });
    assert.match(compiled.compiledPrompt, /restrained natural realism/);
    if (generationMode === 'scene') assert.match(compiled.compiledPrompt, /one continuous photograph/);
  });
}
test('Other surfaces and unsupported Studio modes are unchanged even with spoofed profile', () => {
  for (const generationSurface of ['playground', 'cinematic', 'fashion', undefined]) {
    for (const generationMode of ['headshot', 'character-sheet', 'scene']) {
      const context = { generationSurface, generationMode, studioRealismProfile: { version: 1 } };
      assert.equal(applyStudioNaturalRealism('exact prompt', context), 'exact prompt');
      assert.equal(studioRealismProfile(context), null);
    }
  }
  assert.equal(applyStudioNaturalRealism('exact prompt', { generationSurface: 'studio', generationMode: 'video' }), 'exact prompt');
});
