import assert from 'node:assert/strict';
import test from 'node:test';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';

const actor = { userId: 'full-story-owner', username: 'writer', role: 'user' };
const setup = {
  title: 'Rain Letters',
  format: 'mini-series',
  storyBrief: 'A florist and a stranger meet during a dangerous rainstorm.',
  creativeDirection: '',
  durationSeconds: 60,
  chapterCount: 2,
  seasonEnabled: true,
  seasonCount: 2,
  chaptersPerSeason: [1, 1],
  seasonEnabled: true,
  seasonCount: 2,
  chaptersPerSeason: [1, 1],
  platform: 'tiktok',
  castPlanningMode: 'ai-recommended',
  creationIntent: 'draft'
};

async function fixture(t, serviceOverrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-full-story-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repository = new CinematicProjectRepository({ projectsFile: path.join(root, 'projects.json') });
  const fullStoryService = {
    propose: async () => ({
      proposalId: 'full-proposal-1', fullStory: 'A complete generated story.', warnings: [],
      characters: [{
        existingCharacterId: null, displayName: 'Lalin', storyRole: 'Lead florist', storyImportance: 'protagonist',
        objective: 'Protect the shop.', motivation: 'Family duty.', pressure: 'A storm.', personalityTraits: ['careful'],
        emotionalBaseline: 'Reserved', dialogueStyle: 'Gentle', performanceDirection: 'Underplay emotion.'
      }],
      provenance: { provider: 'test', model: 'story-model', responseId: 'response-1' }, billingStatus: 'qualification_no_charge'
    }),
    proposeChapters: async () => ({
      proposalId: 'chapter-proposal-1',
      chapters: [
        { title: 'The Storm', story: 'The flowerpot falls during the storm.' },
        { title: 'The Promise', story: 'They meet again and make a promise.' }
      ],
      warnings: [], provenance: { provider: 'test', model: 'story-model', responseId: 'response-2' },
      billingStatus: 'qualification_no_charge'
    }),
    proposeScenes: async () => ({
      proposalId: 'scene-proposal-1',
      scenes: [{
        title: 'Flower shop exterior', synopsis: 'A flowerpot falls into the rain.', purpose: 'dramatic',
        objective: 'Start the encounter.', location: 'Flower shop pavement', time: 'Night', weather: 'Heavy rain',
        environment: 'Warm shop light and wet asphalt.', entryState: 'Lalin closes the shop.',
        exitState: 'Kin notices her.', emotionalStart: 'Focused', emotionalEnd: 'Alarmed',
        transitionIntent: 'Continue at the curb.', targetDurationSeconds: 60, dialogueTargetPercent: 0,
        characterIds: []
      }], warnings: [], provenance: { provider: 'test', model: 'story-model', responseId: 'scene-response' },
      billingStatus: 'qualification_no_charge'
    }),
    proposeShots: async () => ({
      proposalId: 'shot-proposal-1', shots: [{
        title: 'Reach for the pot', purpose: 'Begin the encounter', durationMs: 4000,
        shotDocument: 'SHOT DURATION\n4 seconds\n\nPERFORMANCE AND TIMELINE\n[0.0-4.0 sec]\nLalin reaches down.',
        characterIds: []
      }], warnings: [], provenance: { provider: 'test', model: 'story-model', responseId: 'shot-response' },
      billingStatus: 'qualification_no_charge'
    })
  };
  const service = new CinematicApplicationService({ repository, fullStoryService, ...serviceOverrides });
  const project = await service.createProject(setup, actor);
  return { service, project, repository };
}

test('Authoring continuity revises only the selected Chapter and preserves its Season and production', async t => {
  const { service, project, repository } = await fixture(t);
  const saved = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: 'A complete story of a storm and a promise.', source: 'manual' }, actor);
  const confirmed = await service.confirmFullStoryRevision(project.id, { expectedVersion: saved.version, revisionId: saved.activeFullStoryVersionId }, actor);
  const generated = await service.generateFullStoryChapters(project.id, { expectedVersion: confirmed.version }, actor);
  const childId = generated.workspace.chapters[1].projectId;
  const child = await repository.mutateForActor(childId, actor, current => {
    current.scenes = [{ id: 'preserved-scene', orderKey: 1, version: 1, shots: [] }];
    return current;
  });
  let captured;
  service.fullStoryService.proposeChapters = async input => {
    captured = input;
    return { proposalId: 'continuity-proposal', chapters: [{ title: 'The Promise', story: 'After the storm they meet again.' }], warnings: [] };
  };
  const proposed = await service.proposeChapters(childId, { expectedVersion: child.version, scope: 'selected', intent: 'continuity', instruction: '  ' }, actor);
  assert.equal(proposed.proposal.status, 'pending_review');
  assert.equal(captured.scope, 'selected');
  assert.equal(captured.maxChapters, 1);
  assert.match(captured.instruction, /Chapter only/);
  assert.match(captured.continuity.previous.excerpt, /flowerpot falls/);
  const applied = await service.applyChapterProposal(childId, proposed.proposal.id, { expectedVersion: proposed.project.version }, actor);
  assert.equal(applied.project.chapterStory, 'After the storm they meet again.');
  assert.equal(applied.project.seriesMembership.seasonId, child.seriesMembership.seasonId);
  assert.deepEqual(applied.project.scenes, child.scenes);
  assert.equal((await service.getProject(project.id, actor)).chapterStory, 'The flowerpot falls during the storm.');
});

test('Chapter ordering preserves story ownership, assets and rejects invalid or stale sibling permutations', async t => {
  const { service, project, repository } = await fixture(t);
  const saved = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: 'A complete story.', source: 'manual' }, actor);
  const confirmed = await service.confirmFullStoryRevision(project.id, { expectedVersion: saved.version, revisionId: saved.activeFullStoryVersionId }, actor);
  const generated = await service.generateFullStoryChapters(project.id, { expectedVersion: confirmed.version }, actor);
  const childId = generated.workspace.chapters[1].projectId;
  await repository.mutateForActor(childId, actor, current => { current.seriesMembership.seasonId = generated.project.seriesMembership.seasonId; current.seriesMembership.chapterNumber = 2; });
  const before = await service.getSeriesWorkspace(project.id, actor);
  const input = { expectedProjectVersion: generated.project.version, expectedVersion: before.series.version, seasonId: generated.project.seriesMembership.seasonId, chapterIds: [childId, project.id] };
  await assert.rejects(service.reorderChapters(project.id, { ...input, chapterIds: [childId, childId] }, actor), { code: 'cinematic_order_invalid' });
  const result = await service.reorderChapters(project.id, input, actor);
  assert.deepEqual(result.workspace.chapters.map(item => item.projectId), [childId, project.id]);
  assert.equal(result.workspace.productionProject.storyProjectId, project.id);
  assert.equal(result.project.fullStoryVersions[0].content, 'A complete story.');
  await assert.rejects(service.reorderChapters(project.id, input, actor), { code: 'cinematic_version_conflict' });
});

test('Chapter revision requires an instruction before provider dispatch', async t => {
  let calls = 0;
  const { service, project } = await fixture(t, { fullStoryService: { proposeChapters: async () => { calls++; } } });
  for (const instruction of [undefined, '', ' \n\t ', 42, 'x'.repeat(2001)]) {
    await assert.rejects(service.proposeChapters(project.id, { expectedVersion: project.version, scope: 'selected', instruction }, actor),
      { code: 'cinematic_chapter_instruction_required' });
  }
  assert.equal(calls, 0);
  assert.equal((await service.getProject(project.id, actor)).version, project.version);
});

test('Scene ordering preserves all Shot media and portable handoff stays read-only', async t => {
  const { service, project } = await fixture(t);
  const first = await service.createManualScene(project.id, { expectedVersion: project.version, idempotencyKey: 'order-scene-1' }, actor);
  const shotResult = await service.createManualShot(project.id, first.scene.id, { expectedVersion: first.project.version, idempotencyKey: 'order-shot' }, actor);
  const second = await service.createManualScene(project.id, { expectedVersion: shotResult.project.version, idempotencyKey: 'order-scene-2' }, actor);
  const input = { expectedVersion: second.project.version, sceneIds: [second.scene.id, first.scene.id] };
  await assert.rejects(service.reorderScenes(project.id, { ...input, sceneIds: [second.scene.id, 'foreign'] }, actor), { code: 'cinematic_order_invalid' });
  const moved = await service.reorderScenes(project.id, input, actor);
  assert.deepEqual(moved.project.scenes.map(item => item.id), input.sceneIds);
  assert.deepEqual(moved.project.scenes[1].shots, shotResult.project.scenes[0].shots);
  const exported = await service.exportShotWriter(project.id, first.scene.id, shotResult.shot.id, { expectedVersion: moved.project.version }, actor);
  assert.deepEqual(exported.references, []);
  assert.doesNotMatch(exported.prompt, /@Image|CINEMATIC VIDEO EXECUTION PACKET/);
  assert.equal((await service.getProject(project.id, actor)).version, moved.project.version);
  await assert.rejects(service.exportShotWriter(project.id, first.scene.id, shotResult.shot.id, { expectedVersion: moved.project.version }, { ...actor, userId: 'other' }), { code: 'cinematic_project_not_found' });
});

test('partial portable packets renumber available references and refuse inconsistent authored image numbers', async t => {
  const { service, project, repository } = await fixture(t);
  const scene = await service.createManualScene(project.id, { expectedVersion: project.version, idempotencyKey: 'partial-scene' }, actor);
  const shot = await service.createManualShot(project.id, scene.scene.id, { expectedVersion: scene.project.version, idempotencyKey: 'partial-shot' }, actor);
  service.videoReferencePlanService = { prepare: async () => ({ references: [
    { characterName: 'Kin', purpose: 'character_look', referenceSource: 'uploaded', referenceImageUrl: '/owned/kin.png' }
  ], issues: [{ slot: 1, name: 'First Frame', code: 'first_frame_unavailable' }] }) };
  const packet = await service.exportShotWriter(project.id, scene.scene.id, shot.shot.id, { expectedVersion: shot.project.version }, actor);
  assert.equal(packet.references[0].number, 1);
  assert.match(packet.prompt, /@Image 1 = Kin/);
  assert.equal(packet.copyReady, true);
  for (const text of ['@Image 2 defines Kin.', 'Reference image 2 defines Kin.', 'Image #2 defines Kin.', 'ภาพที่ 2 คือคิน', 'ภาพอ้างอิงที่ ๒ คือคิน']) {
    await repository.mutateForActor(project.id, actor, current => {
      current.scenes[0].shots[0].videoPromptOverride = { text, sourceFingerprint: 'old' };
      return current;
    });
    const unsafe = await service.exportShotWriter(project.id, scene.scene.id, shot.shot.id, { expectedVersion: shot.project.version }, actor);
    assert.equal(unsafe.prompt, '');
    assert.equal(unsafe.copyReady, false);
    assert.equal(unsafe.references[0].imageUrl, '/owned/kin.png');
    assert.ok(unsafe.warnings.includes('reference_numbers_changed'));
  }
});

test('Project video direction is root-owned, inherited after edits, and preserved by legacy Setup saves', async t => {
  const { service, project } = await fixture(t);
  const saved = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: 'A complete story.', source: 'manual' }, actor);
  const confirmed = await service.confirmFullStoryRevision(project.id, { expectedVersion: saved.version, revisionId: saved.activeFullStoryVersionId }, actor);
  const generated = await service.generateFullStoryChapters(project.id, { expectedVersion: confirmed.version }, actor);
  const childId = generated.workspace.chapters[1].projectId;
  const updated = await service.updateSetup(project.id, { ...generated.project.setup, expectedVersion: generated.project.version, videoDirection: 'No music.' }, actor);
  const child = await service.getProject(childId, actor);
  assert.equal(child.videoDirection, 'No music.');
  await assert.rejects(service.updateSetup(childId, { ...child.setup, expectedVersion: child.version, videoDirection: 'Different direction.' }, actor), { code: 'cinematic_video_direction_root_required' });
  const legacyInput = { ...updated.setup, expectedVersion: updated.version }; delete legacyInput.videoDirection;
  assert.equal((await service.updateSetup(project.id, legacyInput, actor)).setup.videoDirection, 'No music.');
});

test('Scene and Shot proposals reject stale continuity after order or neighbor changes', async t => {
  const { service, project, repository } = await fixture(t);
  const saved = await service.saveFullStoryRevision(project.id, { expectedVersion: project.version, content: 'A complete story.', source: 'manual' }, actor);
  const confirmed = await service.confirmFullStoryRevision(project.id, { expectedVersion: saved.version, revisionId: saved.activeFullStoryVersionId }, actor);
  const generated = await service.generateFullStoryChapters(project.id, { expectedVersion: confirmed.version }, actor);
  const first = await service.createManualScene(project.id, { expectedVersion: generated.project.version, idempotencyKey: 'stale-scene-1' }, actor);
  const second = await service.createManualScene(project.id, { expectedVersion: first.project.version, idempotencyKey: 'stale-scene-2' }, actor);
  const proposal = await service.proposeScenes(project.id, { expectedVersion: second.project.version }, actor);
  const moved = await service.reorderScenes(project.id, { expectedVersion: proposal.project.version, sceneIds: [second.scene.id, first.scene.id] }, actor);
  await assert.rejects(service.applySceneProposal(project.id, proposal.proposal.id, { expectedVersion: moved.project.version }, actor), { code: 'cinematic_scene_proposal_stale' });
  const shots = await service.proposeShots(project.id, first.scene.id, { expectedVersion: moved.project.version }, actor);
  const changed = await repository.mutateForActor(project.id, actor, current => {
    current.scenes.find(item => item.id === second.scene.id).version += 1;
    current.version += 1;
    return current;
  });
  await assert.rejects(service.applyShotProposal(project.id, first.scene.id, shots.proposal.id, { expectedVersion: changed.version }, actor), { code: 'cinematic_shot_proposal_stale' });
});

test('Full Story stays separate from Project Brief and generates Chapters only after confirmation', async t => {
  const { service, project } = await fixture(t);
  const proposal = await service.proposeFullStory(project.id, { expectedVersion: project.version, revisionInstruction: '' }, actor);
  assert.equal(proposal.fullStory, 'A complete generated story.');

  const saved = await service.saveFullStoryRevision(project.id, {
    expectedVersion: project.version,
    content: proposal.fullStory,
    source: 'ai',
    provenance: proposal.provenance,
    characters: proposal.characters
  }, actor);
  assert.equal(saved.setup.storyBrief, setup.storyBrief);
  assert.equal(saved.fullStoryVersions.length, 1);
  assert.equal(saved.fullStoryVersions[0].content, proposal.fullStory);
  assert.equal(saved.castAssignments[0].displayName, 'Lalin');
  assert.deepEqual(saved.fullStoryVersions[0].characterIds, [saved.castAssignments[0].id]);

  await assert.rejects(
    service.generateFullStoryChapters(project.id, { expectedVersion: saved.version }, actor),
    { code: 'cinematic_full_story_confirmation_required' }
  );

  const confirmed = await service.confirmFullStoryRevision(project.id, {
    expectedVersion: saved.version,
    revisionId: saved.activeFullStoryVersionId
  }, actor);
  const generated = await service.generateFullStoryChapters(project.id, { expectedVersion: confirmed.version }, actor);
  assert.equal(generated.project.setup.storyBrief, setup.storyBrief);
  assert.equal(generated.proposal.status, 'applied');
  assert.equal(generated.workspace.chapters.length, 2);
  assert.equal(generated.workspace.productionProject.chapterWorkStarted, true);

  const applied = generated;
  assert.equal(applied.workspace.chapters.length, 2);
  assert.equal(applied.workspace.series.seasons.length, 2);
  assert.notEqual(applied.workspace.chapters[0].seasonId, applied.workspace.chapters[1].seasonId);
  assert.equal(applied.workspace.series.seasons.length, 2);
  assert.notEqual(applied.workspace.chapters[0].seasonId, applied.workspace.chapters[1].seasonId);
  assert.equal(applied.workspace.productionProject.chapterWorkStarted, true);
  assert.deepEqual(applied.workspace.chapters.map(item => item.title), ['The Storm', 'The Promise']);
  assert.deepEqual(applied.workspace.chapters.map(item => item.storyBrief), [
    'The flowerpot falls during the storm.',
    'They meet again and make a promise.'
  ]);
  assert.equal(applied.project.chapterVersions.length, 1);
  const retried = await service.applyChapterProposal(project.id, generated.proposal.id, {}, actor);
  assert.equal(retried.workspace.chapters.length, 2);
  assert.equal(retried.project.chapterVersions.length, 1);
});

test('Full Story keeps one active head plus ten previous revisions and preserves confirmed history', async t => {
  const { service, project } = await fixture(t);
  let current = project;
  current = await service.saveFullStoryRevision(project.id, {
    expectedVersion: current.version, content: 'Confirmed baseline.', source: 'manual'
  }, actor);
  current = await service.confirmFullStoryRevision(project.id, {
    expectedVersion: current.version, revisionId: current.activeFullStoryVersionId
  }, actor);
  const confirmedId = current.confirmedFullStoryVersionId;
  for (let index = 1; index <= 12; index += 1) {
    current = await service.saveFullStoryRevision(project.id, {
      expectedVersion: current.version, content: `Revision ${index}.`, source: 'manual'
    }, actor);
  }
  assert.equal(current.fullStoryVersions.length, 11);
  assert.ok(current.fullStoryVersions.some(item => item.id === confirmedId));
  assert.equal(current.fullStoryVersions.find(item => item.id === current.activeFullStoryVersionId)?.content, 'Revision 12.');
});

test('Shot writer saves a custom prompt, preserves it on revision and rejects another actors access', async t => {
  const { service, project } = await fixture(t);
  const manualScene = await service.createManualScene(project.id, { expectedVersion: project.version, idempotencyKey: 'writer-scene' }, actor);
  const manual = await service.createManualShot(project.id, manualScene.scene.id, { expectedVersion: manualScene.project.version, idempotencyKey: 'writer-shot' }, actor);
  const prep = await service.prepareShotWriter(project.id, manual.scene.id, manual.shot.id, actor);
  const saved = await service.updateShotDocument(project.id, manual.scene.id, manual.shot.id, {
    expectedVersion: manual.project.version, expectedShotVersion: manual.shot.version, title: manual.shot.title,
    durationMs: manual.shot.durationMs, shotDocument: manual.shot.shotDocument, speakerBindings: [],
    videoPromptOverride: { text: 'A quiet pause.', sourceFingerprint: prep.sourceFingerprint }
  }, actor);
  const fresh = await service.prepareShotWriter(project.id, manual.scene.id, manual.shot.id, actor);
  assert.equal(fresh.overrideStale, false);
  const revised = await service.updateShotDocument(project.id, manual.scene.id, manual.shot.id, {
    expectedVersion: saved.project.version, expectedShotVersion: saved.shot.version, title: saved.shot.title,
    durationMs: 12000, shotDocument: `${saved.shot.shotDocument}\nNew direction.`
  }, actor);
  assert.equal(revised.shot.videoPromptOverride.text, 'A quiet pause.');
  assert.equal((await service.prepareShotWriter(project.id, manual.scene.id, manual.shot.id, actor)).overrideStale, true);
  await assert.rejects(() => service.prepareShotWriter(project.id, manual.scene.id, manual.shot.id, { userId: 'other', role: 'user' }), /not found/i);
});

test('shared voice edits preserve Character identity and reject stale versions', async t => {
  const { service, project } = await fixture(t);
  const created = await service.upsertSharedCharacterDossier(project.id, {
    expectedProjectVersion: project.version, expectedStoryProjectVersion: project.version,
    displayName: 'Lalin', storyRole: 'Florist', dialogueStyle: 'Warm voice'
  }, actor);
  const voice = await service.updateSharedVoice(project.id, created.characterId, {
    expectedProjectVersion: created.project.version, expectedStoryProjectVersion: created.storyProject.version, dialogueStyle: 'Soft, slow Thai speech'
  }, actor);
  assert.equal(voice.project.castAssignments[0].dialogueStyle, 'Soft, slow Thai speech');
  assert.equal(voice.project.castAssignments[0].id, created.characterId);
  assert.deepEqual(voice.project.castAssignments[0].looks, created.project.castAssignments[0].looks);
  await assert.rejects(() => service.updateSharedVoice(project.id, created.characterId, {
    expectedProjectVersion: created.project.version, expectedStoryProjectVersion: created.storyProject.version, dialogueStyle: 'stale'
  }, actor), /changed|version/i);
});

test('a saved Chapter creates reviewed Scene outlines without hidden Shots', async t => {
  const { service, project } = await fixture(t);
  const saved = await service.updateSeriesChapter(project.id, {
    expectedProjectVersion: project.version,
    title: 'The Storm',
    story: 'A flowerpot falls outside the shop and the protagonists meet.'
  }, actor);
  const proposed = await service.proposeScenes(project.id, { expectedVersion: saved.project.version }, actor);
  assert.equal(proposed.proposal.status, 'pending_review');
  assert.equal(proposed.project.scenes.length, 0);
  assert.equal(proposed.proposal.sourceChapterRevisionId, saved.project.activeChapterVersionId);

  const applied = await service.applySceneProposal(project.id, proposed.proposal.id, {
    expectedVersion: proposed.project.version
  }, actor);
  assert.equal(applied.project.scenes.length, 1);
  assert.equal(applied.project.scenes[0].shots.length, 0);
  assert.equal(applied.project.scenes[0].title, 'Flower shop exterior');

  const shotProposal = await service.proposeShots(project.id, applied.project.scenes[0].id, {
    expectedVersion: applied.project.version
  }, actor);
  assert.equal(shotProposal.project.scenes[0].shots.length, 0);
  assert.equal(shotProposal.proposal.status, 'pending_review');
  const shotsApplied = await service.applyShotProposal(project.id, applied.project.scenes[0].id, shotProposal.proposal.id, {
    expectedVersion: shotProposal.project.version
  }, actor);
  assert.equal(shotsApplied.scene.shots.length, 1);
  assert.equal(shotsApplied.scene.shots[0].shotDocumentVersion, 1);

  const manual = await service.createManualScene(project.id, {
    expectedVersion: shotsApplied.project.version,
    idempotencyKey: 'manual-scene-1'
  }, actor);
  assert.equal(manual.project.scenes.length, 2);
  assert.equal(manual.scene.shots.length, 0);
});

test('Chapter revisions rotate independently and a stale proposal cannot overwrite a newer save', async t => {
  const { service, project } = await fixture(t);
  let root = await service.saveFullStoryRevision(project.id, {
    expectedVersion: project.version, content: 'Confirmed baseline.', source: 'manual'
  }, actor);
  root = await service.confirmFullStoryRevision(project.id, {
    expectedVersion: root.version, revisionId: root.activeFullStoryVersionId
  }, actor);
  const pending = await service.generateFullStoryChapters(root.id, { expectedVersion: root.version }, actor);
  const applied = await service.applyChapterProposal(root.id, pending.proposal.id, {}, actor);
  let chapter = applied.project;
  for (let index = 1; index <= 12; index += 1) {
    const saved = await service.updateSeriesChapter(chapter.id, {
      expectedProjectVersion: chapter.version,
      title: 'The Storm',
      story: `Chapter revision ${index}.`
    }, actor);
    chapter = saved.project;
  }
  assert.equal(chapter.chapterVersions.length, 11);
  assert.equal(chapter.chapterVersions.find(item => item.id === chapter.activeChapterVersionId)?.story, 'Chapter revision 12.');

  const nextProposal = await service.proposeChapters(chapter.id, {
    expectedVersion: chapter.version, scope: 'selected', instruction: 'Make it quieter.'
  }, actor);
  await assert.rejects(
    service.proposeChapters(chapter.id, {
      expectedVersion: nextProposal.project.version, scope: 'all', instruction: 'Try another structure.'
    }, actor),
    { code: 'cinematic_chapter_proposal_pending' }
  );
  const newer = await service.updateSeriesChapter(chapter.id, {
    expectedProjectVersion: nextProposal.project.version,
    title: 'The Storm',
    story: 'A newer manual edit.'
  }, actor);
  await assert.rejects(
    service.applyChapterProposal(chapter.id, nextProposal.proposal.id, {}, actor),
    { code: 'cinematic_chapter_proposal_stale' }
  );
  assert.equal((await service.getProject(chapter.id, actor)).chapterStory, newer.project.chapterStory);
});

test('a Character added from a Chapter is stored once on the story Project and linked by stable ID', async t => {
  const { service, project } = await fixture(t);
  let root = await service.saveFullStoryRevision(project.id, {
    expectedVersion: project.version, content: 'Confirmed baseline.', source: 'manual'
  }, actor);
  root = await service.confirmFullStoryRevision(project.id, {
    expectedVersion: root.version, revisionId: root.activeFullStoryVersionId
  }, actor);
  const pending = await service.generateFullStoryChapters(root.id, { expectedVersion: root.version }, actor);
  const applied = await service.applyChapterProposal(root.id, pending.proposal.id, {}, actor);
  const childId = applied.workspace.chapters[1].projectId;
  const storyProject = await service.getProject(root.id, actor);
  const child = await service.getProject(childId, actor);
  const result = await service.upsertSharedCharacterDossier(child.id, {
    expectedProjectVersion: child.version,
    expectedStoryProjectVersion: storyProject.version,
    displayName: 'Mina',
    storyRole: 'A witness who returns in Chapter 2'
  }, actor);
  assert.equal(result.storyProject.castAssignments.length, 1);
  assert.equal(result.storyProject.castAssignments[0].id, result.characterId);
  assert.deepEqual(result.project.chapterCharacterIds, [result.characterId]);
  assert.equal(result.project.castAssignments[0].displayName, 'Mina');
  assert.equal((await service.getProject(root.id, actor)).castAssignments[0].displayName, 'Mina');
});

test('shared Character library selection pins an authorized profile without duplicating the Chapter record', async t => {
  const characterAuthorizationService = {
    validateGenerationContext: async context => ({
      ...context,
      authorizedCharacterFaceReferenceUrl: '/media/mali-face.jpg',
      authorizedCharacterFrontReferenceUrl: '/media/mali-front.jpg',
      displayNameSnapshot: 'Mali',
      identityPack: {
        characterProfileId: 'character_mali',
        characterProfileVersionId: 'character_version_mali_2',
        status: 'identity_pack_ready',
        ageRange: { minimum: 24, maximum: 29 },
        presentationGender: 'woman',
        characterType: 'reusable_model',
        outfitBehavior: 'replaceable',
        identityPolicyVersion: 'character-identity-pack-v2'
      },
      attribution: { ownerUserId: actor.userId, ownerUsername: actor.username }
    })
  };
  const { service, project } = await fixture(t, { characterAuthorizationService });
  const result = await service.upsertSharedCharacterDossier(project.id, {
    expectedProjectVersion: project.version,
    expectedStoryProjectVersion: project.version,
    sourceType: 'character',
    characterProfileId: 'character_mali',
    characterProfileVersionId: 'character_version_mali_2',
    displayName: 'Mali',
    storyRole: 'Lead'
  }, actor);
  assert.equal(result.storyProject.castAssignments.length, 1);
  assert.equal(result.storyProject.castAssignments[0].sourceType, 'character');
  assert.equal(result.storyProject.castAssignments[0].characterProfileVersionId, 'character_version_mali_2');
  assert.equal(result.storyProject.castAssignments[0].identityReady, true);
  assert.equal(result.storyProject.castAssignments[0].portraitUrl, '/media/mali-face.jpg');
  assert.deepEqual(result.project.chapterCharacterIds, [result.characterId]);
});

test('shared Character source can be detached and the Project Character can be removed without deleting evidence', async t => {
  const characterAuthorizationService = {
    validateGenerationContext: async context => ({
      ...context, authorizedCharacterFaceReferenceUrl: '/media/mali-face.jpg', displayNameSnapshot: 'Mali',
      identityPack: { characterProfileId: 'character_mali', characterProfileVersionId: 'character_version_mali_2', status: 'identity_pack_ready', characterType: 'reusable_model', outfitBehavior: 'replaceable', identityPolicyVersion: 'character-identity-pack-v2' },
      attribution: { ownerUserId: actor.userId, ownerUsername: actor.username }
    })
  };
  const { service, project } = await fixture(t, { characterAuthorizationService });
  const selected = await service.upsertSharedCharacterDossier(project.id, {
    expectedProjectVersion: project.version, expectedStoryProjectVersion: project.version,
    sourceType: 'character', characterProfileId: 'character_mali', characterProfileVersionId: 'character_version_mali_2',
    displayName: 'Narrative Mali', storyRole: 'Lead'
  }, actor);
  const detached = await service.detachSharedCharacter(project.id, selected.characterId, {
    expectedProjectVersion: selected.project.version, expectedStoryProjectVersion: selected.storyProject.version
  }, actor);
  assert.equal(detached.storyProject.castAssignments[0].displayName, 'Narrative Mali');
  assert.equal(detached.storyProject.castAssignments[0].sourceType, 'dossier');
  assert.equal(detached.storyProject.castAssignments[0].characterProfileId, null);
  const removed = await service.removeSharedCharacter(project.id, selected.characterId, {
    expectedProjectVersion: detached.project.version, expectedStoryProjectVersion: detached.storyProject.version
  }, actor);
  assert.equal(removed.storyProject.castAssignments[0].active, false);
  assert.deepEqual(removed.project.chapterCharacterIds, []);
});
