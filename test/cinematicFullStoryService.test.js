import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicFullStoryService } from '../server/domain/generation/CinematicFullStoryService.js';

test('Full Story AI normalizes revision and Chapter proposals through the configured text provider', async () => {
  const calls = [];
  const provider = {
    generateCinematicFullStory: async input => {
      calls.push(['story', input]);
      return {
        fullStory: 'A complete story with a resolved ending.',
        characters: [{
          existingCharacterId: null, displayName: 'Mina', storyRole: 'Lead', storyImportance: 'protagonist',
          objective: 'Save the shop.', motivation: 'Family duty.', pressure: 'The storm.', personalityTraits: ['patient'],
          emotionalBaseline: 'Reserved', dialogueStyle: 'Concise', performanceDirection: 'Underplay emotion.'
        }],
        warnings: ['Review timing.'], responseId: 'story-response'
      };
    },
    generateCinematicChapters: async input => {
      calls.push(['chapters', input]);
      return { chapters: [
        { title: 'Arrival', story: 'The protagonists meet.' },
        { title: 'Storm', story: 'The storm tests them.' },
        { title: 'Promise', story: 'They make a promise.' }
      ], warnings: [], responseId: 'chapter-response' };
    },
    generateCinematicChapterScenes: async input => {
      calls.push(['scenes', input]);
      return { scenes: [{
        title: 'Flower shop in the rain', synopsis: 'Lalin sees the fallen flowerpot.', purpose: 'dramatic',
        objective: 'Force the first encounter.', location: 'Flower shop pavement', time: 'Night', weather: 'Heavy rain',
        environment: 'Warm shop light against wet blue asphalt.', entryState: 'Lalin closes the shop.',
        exitState: 'Kin notices the danger.', emotionalStart: 'Focused', emotionalEnd: 'Alarmed',
        transitionIntent: 'Continue at the curb.', targetDurationSeconds: 30, dialogueTargetPercent: 0,
        characterIds: ['lalin']
      }], warnings: [], responseId: 'scene-response' };
    },
    generateCinematicSceneShots: async input => {
      calls.push(['shots', input]);
      return { shots: [{ title: 'Reach down', purpose: 'Begin the encounter', durationMs: 4000,
        shotDocument: 'SHOT DURATION\n4 seconds\n\nPERFORMANCE AND TIMELINE\n[0.0-4.0 sec]\nLalin reaches down.',
        characterIds: ['lalin'] }], warnings: [], responseId: 'shot-response' };
    },
    generateCinematicSceneEnvironment: async input => {
      calls.push(['environment', input]);
      return { environmentPrompt: 'An empty rain-soaked flower-shop pavement with warm practical light and wet blue asphalt.',
        warnings: [], responseId: 'environment-response' };
    }
  };
  const service = new CinematicFullStoryService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'story-model', reasoningEffort: 'low', maxOutputTokens: 4000, timeoutMs: 1000, longFormTimeoutMs: 120000, apiKey: 'test' }),
    providerFactory: () => provider,
    availabilityPolicy: { assertAvailable() {} }
  });

  const story = await service.propose({ storyBrief: 'A short synopsis.', revisionInstruction: 'Keep the ending.' });
  const chapters = await service.proposeChapters({ fullStory: story.fullStory, format: 'mini-series', targetDurationSeconds: 60, maxChapters: 3 });
  const scenes = await service.proposeScenes({ chapterTitle: 'Arrival', chapterStory: chapters.chapters[0].story,
    projectTitle: 'Rain Letters', targetDurationSeconds: 60, characters: [{ id: 'lalin', name: 'Lalin', role: 'Lead', dossier: 'A florist.' }] });
  const shots = await service.proposeShots({ projectTitle: 'Rain Letters', chapterTitle: 'Arrival', chapterStory: chapters.chapters[0].story,
    scene: { id: 'scene-1', title: 'Flower shop', synopsis: 'Lalin reaches down.', durationMs: 8000, castAssignmentIds: ['lalin'] },
    characters: [{ id: 'lalin', name: 'Lalin', role: 'Lead', dossier: 'A florist.' }] });
  const environment = await service.proposeSceneEnvironment({ projectTitle: 'Rain Letters', aspectRatio: '9:16',
    storyBrief: 'Two strangers meet in the rain.', chapterTitle: 'Arrival', chapterStory: chapters.chapters[0].story,
    scene: { id: 'scene-1', title: 'Flower shop', synopsis: 'Lalin reaches toward a fallen pot.', location: 'Pavement',
      time: 'Night', weather: 'Heavy rain', shots: [{ title: 'Reach down', durationMs: 4000, shotDocument: 'A fallen pot at the curb.' }] } });

  assert.equal(story.fullStory, 'A complete story with a resolved ending.');
  assert.equal(story.provenance.responseId, 'story-response');
  assert.equal(story.characters[0].displayName, 'Mina');
  assert.equal(chapters.chapters.length, 3);
  assert.equal(calls[0][1].context.revisionInstruction, 'Keep the ending.');
  assert.equal(calls[0][1].timeoutMs, 120000);
  assert.equal(calls[1][1].context.maxChapters, 3);
  assert.equal(calls[1][1].context.expectedChapterCount, 3);
  assert.equal(calls[1][1].timeoutMs, 120000);
  assert.equal(scenes.scenes.length, 1);
  assert.equal(calls[2][1].context.chapter.title, 'Arrival');
  assert.equal(calls[2][1].context.characters[0].id, 'lalin');
  assert.equal(calls[2][1].timeoutMs, 120000);
  assert.equal(shots.shots.length, 1);
  assert.equal(calls[3][1].context.scene.title, 'Flower shop');
  assert.equal(calls[3][1].context.characters[0].id, 'lalin');
  assert.equal(calls[3][1].timeoutMs, 120000);
  assert.match(environment.environmentPrompt, /empty rain-soaked flower-shop/i);
  assert.equal(environment.provenance.responseId, 'environment-response');
  assert.equal(calls[4][1].context.scene.shotContext.length, 1);
  assert.equal(calls[4][1].context.outputContract.people, 'none');
  assert.equal(calls[4][1].maxOutputTokens, 2500);
  assert.equal(calls[4][1].timeoutMs, 1000);
});

test('Full Story AI requires an instruction only when revising an existing story', async () => {
  const service = new CinematicFullStoryService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'story-model', reasoningEffort: 'low', maxOutputTokens: 8000, timeoutMs: 1000, apiKey: 'test' }),
    providerFactory: () => ({ generateCinematicFullStory: async () => ({ fullStory: 'Generated.', characters: [], warnings: [] }) }),
    availabilityPolicy: { assertAvailable() {} }
  });

  await assert.rejects(
    service.propose({ storyBrief: 'Brief.', currentFullStory: 'Existing story.', revisionInstruction: '   ' }),
    { code: 'cinematic_full_story_revision_instruction_required' }
  );
  assert.equal((await service.propose({ storyBrief: 'Brief.', currentFullStory: '' })).fullStory, 'Generated.');
});
