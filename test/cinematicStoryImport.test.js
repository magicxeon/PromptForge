import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicFullStoryService } from '../server/domain/generation/CinematicFullStoryService.js';
import { normalizeStoryImport } from '../server/domain/cinematic/CinematicStoryImport.js';
import { OpenAITextProvider } from '../server/providers/OpenAITextProvider.js';

const actor = { userId: 'import-owner', username: 'writer' };
const setup = { title: 'Imported story', format: 'mini-series', storyBrief: '', durationSeconds: 60, platform: 'tiktok', creationIntent: 'draft' };
async function fixture(t, fullStoryService) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mpf-story-import-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(root, 'projects.json') });
  return { repository, service: new CinematicApplicationService({ repository, ...(fullStoryService ? { fullStoryService } : {}) }) };
}

test('import creates a Project and complete manual story together without a brief or provider request', async t => {
  const { repository, service } = await fixture(t);
  const content = '# Rain\n\n' + 'The florist returns home. '.repeat(50);
  for (const format of ['mini-series', 'short-film']) {
    const project = await service.createProject({ ...setup, format, storyImport: { fileName: 'rain.MD', content } }, actor);
    const saved = await repository.findForActor(project.id, actor);
    assert.equal(saved.activeStage, 'cast');
    assert.equal(saved.setup.storyBrief, '');
    assert.equal(saved.fullStoryVersions[0].content, content.trim());
    assert.equal(saved.fullStoryVersions[0].source, 'manual');
    assert.equal(saved.fullStoryVersions[0].importFileName, 'rain.MD');
    assert.equal(saved.confirmedFullStoryVersionId, null);
    assert.equal(saved.setup.initialFullStory, undefined);
    assert.equal(saved.setup.storyImport, undefined);
  }
});

test('import rejects unsupported, binary, empty and oversized input before saving', async t => {
  const { repository, service } = await fixture(t);
  for (const storyImport of [
    { fileName: 'story.pdf', content: 'Story' }, { fileName: '../story.txt', content: 'Story' },
    { fileName: 'story.txt', content: '\u0000binary' }, { fileName: 'story.md', content: '  ' },
    { fileName: 'story.txt', content: 'x'.repeat(50001) }
  ]) assert.throws(() => service.createProject({ ...setup, storyImport }, actor));
  assert.equal((await repository.listForActor(actor)).items.length, 0);
  assert.deepEqual(normalizeStoryImport({ fileName: 'story.txt', content: '\uFEFFStart\r\nEnd\n' }), { fileName: 'story.txt', content: 'Start\nEnd' });
});

test('brief import origin survives persistence and legacy edits without changing Full Story or cast', async t => {
  const { service, repository } = await fixture(t);
  const project = await service.createProject({ ...setup, storyBrief: 'An imported idea.',
    storyBriefImport: { fileName: 'brief.md', edited: false },
    storyImport: { fileName: 'novel.md', content: 'Complete novel.' } }, actor);
  const saved = await service.updateSetup(project.id, { ...project.setup, expectedVersion: project.version,
    storyBrief: 'Edited idea.', storyBriefImport: undefined }, actor);
  const loaded = await repository.findForActor(project.id, actor);
  assert.deepEqual(loaded.setup.storyBriefImport, { fileName: 'brief.md', edited: true });
  assert.deepEqual(loaded.fullStoryVersions, project.fullStoryVersions);
  assert.deepEqual(loaded.castAssignments, project.castAssignments);
  const cleared = await service.updateSetup(project.id, { ...saved.setup, expectedVersion: saved.version, storyBrief: '' }, actor);
  assert.equal(cleared.setup.storyBriefImport.edited, true);
  assert.throws(() => service.updateSetup(project.id, { ...cleared.setup, storyBriefImport: { fileName: '../secret.txt' } }, actor),
    { code: 'cinematic_story_import_type_invalid' });
});

test('manual and AI revisions retain edited file origin; replacement and restore preserve correct origin', async t => {
  const { service } = await fixture(t);
  let project = await service.createProject({ ...setup, storyImport: { fileName: 'original.md', content: 'Original.' } }, actor);
  const original = project.fullStoryVersions[0];
  for (const source of ['manual', 'ai']) {
    project = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: source + ' edited.', source }, actor);
    const revision = project.fullStoryVersions.at(-1);
    assert.equal(revision.importFileName, 'original.md');
    assert.equal(revision.importEdited, true);
  }
  project = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: 'ai edited.', importFileName: 'replacement.txt' }, actor);
  assert.equal(project.fullStoryVersions.at(-1).importFileName, 'replacement.txt');
  assert.equal(project.fullStoryVersions.at(-1).importEdited, false);
  project = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: original.content, source: 'restore' }, actor);
  assert.equal(project.fullStoryVersions.at(-1).importFileName, original.importFileName);
  assert.equal(project.fullStoryVersions.at(-1).importEdited, false);
});

test('existing import preserves revision history and rejects stale or foreign writes', async t => {
  const { service } = await fixture(t);
  const project = await service.createProject({ ...setup, storyImport: { fileName: 'first.md', content: 'Original story.' } }, actor);
  const input = { expectedVersion: project.version, content: 'New full story.', source: 'manual', importFileName: 'second.txt' };
  const saved = await service.saveFullStoryRevision(project.id, input, actor);
  assert.equal(saved.fullStoryVersions.length, 2);
  assert.equal(saved.fullStoryVersions[0].content, 'Original story.');
  assert.equal(saved.fullStoryVersions[1].content, input.content);
  await assert.rejects(service.saveFullStoryRevision(project.id, { ...input, content: 'Stale' }, actor), { code: 'cinematic_version_conflict' });
  await assert.rejects(service.saveFullStoryRevision(project.id, { ...input, expectedVersion: saved.version }, { userId: 'other', username: 'other' }));
});

test('character-only proposal preserves source text and allows imported story to continue to Chapters', async t => {
  const characters = [{ existingCharacterId: null, displayName: 'Mina', storyRole: 'Florist', storyImportance: 'protagonist' }];
  const { service } = await fixture(t, {
    proposeCharacters: async input => ({ fullStory: input.currentFullStory, characters }),
    proposeChapters: async input => ({ proposalId: 'chapter-import', chapters: [{ title: 'Return', story: input.fullStory }], warnings: [], provenance: null })
  });
  const project = await service.createProject({ ...setup, storyImport: { fileName: 'story.txt', content: 'Mina returns home and opens her flower shop.' } }, actor);
  const proposal = await service.proposeFullStory(project.id, { expectedVersion: project.version, purpose: 'characters' }, actor);
  assert.equal(proposal.fullStory, project.fullStoryVersions[0].content);
  const saved = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: proposal.fullStory, source: 'manual', characters }, actor);
  assert.equal(saved.castAssignments[0].displayName, 'Mina');
  const confirmed = await service.confirmFullStoryRevision(project.id, { expectedVersion: saved.version, revisionId: saved.activeFullStoryVersionId }, actor);
  const chapters = await service.generateFullStoryChapters(project.id, { expectedVersion: confirmed.version }, actor);
  assert.equal(chapters.proposal.status, 'applied');
  assert.equal(chapters.workspace.chapters.length, 1);
});

test('extraction ignores any provider story rewrite and rejects invented existing Character IDs', async () => {
  const service = new CinematicFullStoryService({
    policyLoader: () => ({ enabled: true, provider: 'openai', model: 'test', maxOutputTokens: 1000, timeoutMs: 1000 }),
    availabilityPolicy: { assertAvailable() {} },
    providerFactory: () => ({ extractCinematicStoryCharacters: async () => ({
      fullStory: 'Unwanted rewrite', characters: [{ existingCharacterId: 'unknown', displayName: 'Mina' }], warnings: []
    }) })
  });
  const result = await service.proposeCharacters({ currentFullStory: '# Original\nMina returns home.' });
  assert.equal(result.fullStory, '# Original\nMina returns home.');
  assert.equal(result.characters[0].existingCharacterId, null);
});

test('character extraction uses the bounded non-stored Responses contract without asking for a story rewrite', async () => {
  let body;
  const provider = new OpenAITextProvider('fixture', { fetchImpl: async (_url, request) => {
    body = JSON.parse(request.body);
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ characters: [], warnings: [] }) }) };
  } });
  await provider.extractCinematicStoryCharacters({ context: { fullStory: 'A storm.' }, model: 'gpt-6-sol', reasoningEffort: 'low', maxOutputTokens: 1000, timeoutMs: 1000 });
  assert.equal(body.store, false);
  assert.equal(body.model, 'gpt-6-sol');
  assert.equal(body.text.format.schema.properties.fullStory, undefined);
  assert.deepEqual(body.text.format.schema.required, ['characters', 'warnings']);
});
