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

test('Canon review batches saved manuscripts and rejects a changed source before approval', async t => {
  const {service,project,repository}=await fixture(t);
  const write = story => repository.mutateForActor(project.id,actor,p=>{p.chapterStory=story;return p;});
  const review = version => service.proposeFullStory(project.id,{expectedVersion:version,purpose:'sync_canon'},actor);
  await write('First edit');
  await write('Latest saved edit');
  const first=await review(project.version);
  await write('Changed during review');
  const apply = proposal => service.saveFullStoryRevision(project.id,{expectedVersion:project.version,
    canonSourceKey:proposal.sourceKey,content:proposal.fullStory,source:'ai'},actor);
  await assert.rejects(apply(first),{code:'cinematic_canon_review_stale'});
  const approved=await apply(await review(project.version));
  assert.equal(approved.confirmedFullStoryVersionId,approved.activeFullStoryVersionId);
  assert.ok(approved.syncedEpisodeDigests[project.id]);
  await assert.rejects(review(approved.version),{code:'cinematic_canon_no_changes'});
});

test('shot art stays in review until accepted and updates just its shot in single and merged prompts', async t => {
  const {default:catalog}=await import('../server/config/cinematic/story-direction.v1.json',{with:{type:'json'}});
  const {service,project}=await fixture(t,{fullStoryService:{
    proposeShotArt:async ({shot,language,writingSettings})=>{
      assert.equal(shot.artDirection,'Dark silhouette'); assert.equal(language,'Thai');
      assert.equal(writingSettings.direction.visualStyle,'korean');
      return {artDirection:'Rim light on the glass.'};
    },
    translateStoryPrompt:async text=>({text})
  }});
  const configured=await service.updateWritingSettings(project.id,{expectedVersion:project.version,modelId:null,skillIds:[],
    direction:{...catalog.defaults,country:'thailand',spokenLanguage:'Thai',visualStyle:'korean'}},actor);
  assert.equal(configured.writingSettings.direction.country,'thailand');
  const created=await service.createManualScene(project.id,{expectedVersion:configured.version,idempotencyKey:'art-scene'},actor);
  const sceneId=created.scene.id;
  const first=await service.createManualShot(project.id,sceneId,{expectedVersion:created.project.version,idempotencyKey:'art-1'},actor);
  const second=await service.createManualShot(project.id,sceneId,{expectedVersion:first.project.version,idempotencyKey:'art-2'},actor);
  const ids=[project.id,sceneId,first.shot.id];
  const packet=async template=>(await service.prepareShotWriter(...ids,actor,{storyPrompt:true,template})).storyPacket;
  const original=await packet('still');
  const saved=await service.updateShotDocument(...ids,{expectedVersion:second.project.version,expectedShotVersion:first.shot.version,
    promptOnly:true,storyTemplate:'still',storyPrompt:{sourceFingerprint:original.sourceFingerprint,text:'Earlier accepted prompt.'}},actor);
  const draft=await service.proposeShots(project.id,sceneId,{expectedVersion:saved.project.version,purpose:'shot_art_direction',
    targetShotId:first.shot.id,language:'th',draft:'Dark silhouette'},actor);
  assert.equal((await service.getProject(project.id,actor)).version,saved.project.version);
  const accepted=await service.updateShotDocument(...ids,{expectedVersion:saved.project.version,expectedShotVersion:saved.shot.version,
    artDirection:draft.artDirection},actor);
  assert.equal(accepted.shot.shotDocument,first.shot.shotDocument);
  assert.equal(accepted.shot.durationMs,first.shot.durationMs);
  assert.equal(accepted.shot.storyPromptVariants.still.text,'Earlier accepted prompt.');
  assert.deepEqual(await service.storyPromptStatus(project.id,sceneId,actor),{outdated:[{shotId:first.shot.id,templates:['still']}]});
  for(const format of ['flow','still','seedance']){
    const revised=await packet(format);
    assert.ok(revised.text.includes(catalog.visualStyles.korean.instruction));
    assert.ok(revised.text.includes(draft.artDirection));
  }
  const merged=await service.proposeShots(project.id,sceneId,{expectedVersion:accepted.project.version,purpose:'merge_shot_prompt',
    template:'seedance',shotIds:[first.shot.id,second.shot.id]},actor);
  assert.ok(merged.text.includes(draft.artDirection));
  assert.equal(merged.text.split(draft.artDirection).length,2);
  assert.ok(merged.text.includes(catalog.visualStyles.korean.instruction));
});

test('merged prompts are scene-owned and saved separately with stale and concurrent edit checks', async t => {
  let translations = 0;
  const {service, project, repository} = await fixture(t,{fullStoryService:{
    translateStoryPrompt:async (text,_cues,_settings,_findings,_scene,narrative) => {
      translations++;
      assert.equal(narrative.canon?.text,'The innkeeper knows the visitor.');
      assert.equal(narrative.next,null);
      return {text,provenance:{provider:'fixture'}};
    }
  }});
  const {scene,project:initial} = await service.createManualScene(project.id,{expectedVersion:project.version,idempotencyKey:'merge-scene'},actor);
  const first = await service.createManualShot(project.id,scene.id,{expectedVersion:initial.version,idempotencyKey:'merge-first'},actor);
  const second = await service.createManualShot(project.id,scene.id,{expectedVersion:first.project.version,idempotencyKey:'merge-second'},actor);
  const shots = second.scene.shots;
  const input = {purpose:'merge_shot_prompt',template:'seedance',shotIds:[second.shot.id,first.shot.id],expectedVersion:second.project.version};
  await repository.mutateForActor(project.id,actor,p=>{
    p.fullStoryVersions.push({id:'canon',content:'The innkeeper knows the visitor.'});
    p.confirmedFullStoryVersionId='canon';
  });
  const built = await service.proposeShots(project.id,scene.id,input,actor);
  assert.equal(translations,1);
  assert.deepEqual(built.shots.map(s=>s.id),shots.map(s=>s.id));
  const mergedPrompt = {shotIds:input.shotIds,template:input.template,text:built.text+'\nHold the final frame.',sourceFingerprint:built.sourceFingerprint,expectedSavedText:null};
  const command = {expectedVersion:input.expectedVersion,mergedPrompt};
  const saved = await service.updateSceneOutline(project.id,scene.id,command,actor);
  assert.deepEqual(saved.scene.shots,shots);
  assert.deepEqual(saved.scene.mergedPrompts[0].outdatedShotIds,[]);
  await assert.rejects(service.updateSceneOutline(project.id,scene.id,command,actor),{code:'cinematic_version_conflict'});
  const revised = await service.updateSceneOutline(project.id,scene.id,{expectedVersion:saved.project.version,
    mergedPrompt:{...mergedPrompt,expectedSavedText:mergedPrompt.text,text:'Reviewed prompt'}},actor);
  assert.equal(revised.scene.mergedPrompts.length,1);
  await assert.rejects(service.updateSceneOutline(project.id,scene.id,{expectedVersion:revised.project.version,
    mergedPrompt:{...mergedPrompt,expectedSavedText:mergedPrompt.text,text:'From another tab'}},actor),{code:'cinematic_merged_prompt_changed'});
  await repository.mutateForActor(project.id,actor,p=>{
    const changed = p.scenes.find(s=>s.id===scene.id).shots[1];
    changed.title='A new ending'; changed.shotDocument+='\nA lantern goes dark.'; changed.version++; p.version++;
  });
  const reloaded=await service.getProject(project.id,actor);
  const stored=reloaded.scenes.find(s=>s.id===scene.id).mergedPrompts[0];
  assert.equal(stored.text,'Reviewed prompt');
  assert.deepEqual(stored.outdatedShotIds,[second.shot.id]);
  await repository.mutateForActor(project.id,actor,p=>{
    const record = p.scenes.find(item=>item.id===scene.id);
    record.mergedPrompts[0].text='[PRESERVE EXACTLY]\nReference 1 — Wi: face and hair.\nHold the flashlight.\n\n[SCENE]\nNight.';
    record.mergedPrompts.push({...record.mergedPrompts[0],template:'flow'});
    p.version++;
  });
  const current=await service.getProject(project.id,actor);
  const currentScene=current.scenes.find(item=>item.id===scene.id);
  assert.match(currentScene.mergedPrompts[0].text,/\[REFERENCE MAPPING\][\s\S]+Reference 1 — Wi: face and hair\.[\s\S]+\[CONTINUITY\]\nHold the flashlight\./);
  assert.doesNotMatch(currentScene.mergedPrompts[0].text,/PRESERVE EXACTLY/);
  const removeMergedPrompt={shotIds:input.shotIds,template:'seedance'};
  await assert.rejects(service.updateSceneOutline(project.id,scene.id,{expectedVersion:current.version,removeMergedPrompt},
    {...actor,userId:'another-writer'}),{code:'cinematic_project_not_found'});
  await assert.rejects(service.updateSceneOutline(project.id,scene.id,{expectedVersion:reloaded.version,removeMergedPrompt},actor),
    {code:'cinematic_version_conflict'});
  const removed=await service.updateSceneOutline(project.id,scene.id,{expectedVersion:current.version,removeMergedPrompt},actor);
  assert.deepEqual(removed.scene.mergedPrompts.map(item=>item.template),['flow']);
  assert.deepEqual(removed.scene.shots,currentScene.shots);
  await assert.rejects(service.updateSceneOutline(project.id,scene.id,{expectedVersion:removed.project.version,mergedPrompt},actor),
    {code:'cinematic_video_prompt_source_changed'});
  assert.equal(translations,1,'opening or saving a merged text never dispatches writing');
});

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
  assert.equal(applied.workspace.chapters.find(chapter=>chapter.projectId===project.id).continuityReviewRequired,true);
  assert.equal(applied.workspace.chapters.find(chapter=>chapter.projectId===childId).continuityReviewRequired,false);
  assert.equal((await service.getProject(project.id, actor)).chapterStory, 'The flowerpot falls during the storm.');
});

test('continuity review uses saved episode text while canon is unconfirmed', async t => {
  const {service, project} = await fixture(t);
  const saved = await service.updateSeriesChapter(project.id, {
    expectedProjectVersion:project.version, title:'Arrival', story:'An inn opens at dawn.'
  }, actor);
  service.fullStoryService.proposeChapters = async input => {
    assert.equal(input.fullStory, '');
    assert.equal(input.continuity.confirmedCanonAvailable, false);
    assert.equal(input.currentChapter.story, 'An inn opens at dawn.');
    return {proposalId:'saved-episode-review', chapters:[{title:'Arrival', story:'At dawn the inn opens.'}], warnings:[]};
  };
  const review = await service.proposeChapters(project.id, {
    expectedVersion:saved.project.version, scope:'selected', intent:'continuity'
  }, actor);
  assert.equal(review.proposal.sourceFullStoryRevisionId, null);
  const applied = await service.applyChapterProposal(project.id, review.proposal.id, {}, actor);
  assert.equal(applied.project.chapterStory, 'At dawn the inn opens.');
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

test('changed confirmed canon queues only unfinished episodes and persists the queue after reopening', async t => {
  const {service,project,repository}=await fixture(t);
  const first=await service.saveFullStoryRevision(project.id,{expectedVersion:project.version,content:'A storm and a promise.'},actor);
  const confirmed=await service.confirmFullStoryRevision(project.id,{expectedVersion:first.version,revisionId:first.activeFullStoryVersionId},actor);
  const generated=await service.generateFullStoryChapters(project.id,{expectedVersion:confirmed.version},actor);
  const child=generated.workspace.chapters[1];
  await repository.mutateForActor(child.projectId,actor,current=>{
    current.scenes=[{id:'locked-scene',shots:[{id:'locked-shot',completed:true}]}];
    return current;
  });
  const revised=await service.saveFullStoryRevision(project.id,{expectedVersion:generated.project.version,content:'The same storm now leaves the road impassable.'},actor);
  await service.confirmFullStoryRevision(project.id,{expectedVersion:revised.version,revisionId:revised.activeFullStoryVersionId},actor);
  const workspace=await service.getSeriesWorkspace(child.projectId,actor);
  assert.equal(workspace.chapters.find(ch=>ch.projectId===project.id).continuityReviewRequired,true);
  assert.equal(workspace.chapters.find(ch=>ch.projectId===child.projectId).continuityReviewRequired,false);
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

test('saving only a Story prompt preserves legacy shot duration, storyboard and source revision', async t => {
  const { service, project, repository } = await fixture(t);
  const scene = await service.createManualScene(project.id, { expectedVersion: project.version, idempotencyKey: 'legacy-scene' }, actor);
  const manual = await service.createManualShot(project.id, scene.scene.id, { expectedVersion: scene.project.version, idempotencyKey: 'legacy-shot' }, actor);
  const legacy = await repository.mutateForActor(project.id, actor, record => {
    const shot = record.scenes[0].shots[0];
    delete shot.shotDocument;
    shot.durationMs = 27000;
    shot.manualStoryboard = true;
    return record;
  });
  const prepared = await service.prepareShotWriter(project.id, scene.scene.id, manual.shot.id, actor, { storyPrompt: true });
  assert.match(prepared.storyPrompt, /27-second/);
  assert.doesNotMatch(prepared.storyPrompt, /WRITING DIRECTION/);
  const input = { expectedVersion: legacy.version, expectedShotVersion: manual.shot.version, promptOnly: true,
    videoPromptOverride: { text: prepared.storyPrompt, sourceFingerprint: prepared.sourceFingerprint } };
  const saved = await service.updateShotDocument(project.id, scene.scene.id, manual.shot.id, input, actor);
  assert.equal(saved.shot.durationMs, 27000);
  assert.equal(saved.shot.manualStoryboard, true);
  assert.equal(saved.shot.shotDocument, legacy.scenes[0].shots[0].shotDocument);
  assert.equal(saved.scene.version, legacy.scenes[0].version);
  assert.equal((await service.prepareShotWriter(project.id, scene.scene.id, manual.shot.id, actor)).overrideStale, false);
  await assert.rejects(() => service.updateShotDocument(project.id, scene.scene.id, manual.shot.id, {
    ...input, expectedVersion: saved.project.version
  }, actor), /changed/i);
});

test('Story prompt variants survive a reload independently and only save against matching sources', async t => {
  const { service, project, repository } = await fixture(t);
  const scene = await service.createManualScene(project.id, { expectedVersion: project.version, idempotencyKey: 'template-scene' }, actor);
  const manual = await service.createManualShot(project.id, scene.scene.id, { expectedVersion: scene.project.version, idempotencyKey: 'template-shot' }, actor);
  const ids = [project.id, scene.scene.id, manual.shot.id];
  const packet = async template => (await service.prepareShotWriter(...ids, actor, {storyPrompt:true, template})).storyPacket;
  const still = await packet('still');
  const seedance = await packet('seedance');
  const flow = await packet('flow');
  assert.equal(still.ready, true);
  assert.equal(seedance.ready, true);
  assert.equal(flow.ready, false);
  assert.match(still.text, /photographic first frame/);
  assert.doesNotMatch(still.text, /ACTION TIMELINE/);
  assert.match(seedance.text, /\[ACTION TIMELINE\]/);
  const save = (result, source, text) => service.updateShotDocument(...ids, {
    expectedVersion:result.project.version, expectedShotVersion:result.shot.version, promptOnly:true,
    storyTemplate:source.kind, storyPrompt:{text, sourceFingerprint:source.sourceFingerprint}
  }, actor);
  await assert.rejects(() => save(manual, flow, 'missing frame'), {code:'cinematic_video_prompt_source_changed'});
  const first = await save(manual, still, 'Keep the paper grain.');
  const second = await save(first, seedance, 'Follow the actor.');
  const reloaded = (await service.getProject(project.id, actor)).scenes[0].shots[0];
  assert.equal(reloaded.storyPromptVariants.still.text, 'Keep the paper grain.');
  assert.equal(reloaded.storyPromptVariants.seedance.text, 'Follow the actor.');
  assert.deepEqual(reloaded.storyPromptVariants.seedance.references, []);
  assert.ok(!reloaded.videoPromptOverride);
  assert.deepEqual(await service.storyPromptStatus(project.id, scene.scene.id, actor), {outdated:[]});
  await repository.mutateForActor(project.id, actor, record => {
    record.scenes[0].location = 'Harbour';
    return record;
  });
  await assert.rejects(() => save(second, still, 'Obsolete draft.'), {code:'cinematic_video_prompt_source_changed'});
  assert.deepEqual(await service.storyPromptStatus(project.id, scene.scene.id, actor), {
    outdated:[{shotId:manual.shot.id, templates:['still', 'seedance']}]
  });
  await repository.mutateForActor(project.id, actor, record => {
    record.scenes[0].approvedEnvironmentSource = {assetId:'harbour-image', imageUrl:'/example/harbour.png'};
    record.scenes[0].shots[0].shotDocument += '\nCONTINUITY AND CONSTRAINTS\nHold the flashlight in the right hand.';
    return record;
  });
  const locationOnly = await packet('seedance');
  assert.deepEqual(locationOnly.references.map(ref=>ref.role), ['location']);
  assert.match(locationOnly.text, /Compose a new opening view from the starting state/);
  assert.match(locationOnly.text, /Compose the closing frame from the final action and end state/);
  assert.match(locationOnly.text, /\[REFERENCE MAPPING\]\n[^\n]+\nReference 1 — Harbour: set geometry, materials and light direction\./);
  assert.match(locationOnly.text, /\[CONTINUITY\]\n[^\n]+\nHold the flashlight in the right hand/);
  assert.doesNotMatch(locationOnly.text, /exact opening frame|\[PRESERVE EXACTLY\]/i);
  await repository.mutateForActor(project.id, actor, record => {
    record.scenes[0].shots[0].approvedStoryboardSource = {assetId:'opening-image', imageUrl:'/example/opening.png'};
    return record;
  });
  const framed = await packet('flow');
  assert.equal(framed.ready,true);
  assert.deepEqual(framed.references.map(({number,role,assetId})=>[number,role,assetId]),
    [[1,'location','harbour-image'], [2,'opening','opening-image']]);
  assert.equal((framed.text.match(/^\[(?!(?:WRITING DIRECTION|REFERENCE NOTE)\])[A-Z ]+\]$/gm)||[]).length,13);
  assert.match(framed.text, /\[VISUAL TARGET\]\nPhotorealistic live-action feature-film imagery/);
  assert.match(framed.text, /Reinterpret illustrated or stylized references as photographed live action/);
  assert.equal((framed.text.match(/^\[REFERENCE NOTE\]$/gm)||[]).length,2);
  assert.match(framed.text, /Use the supplied image as the EXACT opening frame/);
  assert.match(framed.text, /Reference 2 — [^\n]+: opening frame, pose and framing\./);
  const stillWithReference = await packet('still');
  assert.deepEqual(stillWithReference.references.map(ref=>ref.role),['location']);
  assert.match(stillWithReference.text, /\[PRESERVE\]/);
  const stored = await save(second, framed, 'Start from Reference 2.');
  assert.deepEqual(stored.shot.storyPromptVariants.flow.references,
    framed.references.map(({number,name,role,assetId})=>({number,name,role,assetId})));
});

test('Shot proposal uses only the enabled saved scene looksheet and resolves it before dispatch', async t => {
  const {service,project,repository} = await fixture(t);
  const created = await service.createManualScene(project.id,{expectedVersion:project.version,idempotencyKey:'visual-scene'},actor);
  const binding = {assetId:'fixture',contentHash:'f'.repeat(64)};
  const image = {mimeType:'image/jpeg',data:'cGhvdG8='};
  const inputs=[];
  let resolves=0,dispatches=0;
  const original = service.fullStoryService.proposeShots;
  service.fullStoryService.proposeShots=async input=>{ inputs.push(input.sceneImage); return original(input); };
  service.storyboardAssetService={async sceneImageForShotPlanning(source, requester){
    assert.deepEqual(source,binding);
    assert.equal(requester,actor);
    resolves++;
    return image;
  }};
  for(const [source,enabled] of [[null,true],[binding,false],[binding,true]]) {
    const updated = await repository.mutateForActor(project.id,actor,current=>{
      current.scenes[0].approvedEnvironmentSource=source;
      current.scenes[0].environmentReferenceEnabled=enabled;
      current.shotProposals=[];
      return current;
    });
    await service.proposeShots(project.id,created.scene.id,{
      expectedVersion:updated.version,sceneImage:{data:'client-supplied'}},actor,{beforeDispatch:()=>dispatches++});
  }
  assert.deepEqual(inputs,[undefined,undefined,image]);
  assert.equal(resolves,1);
  const toggled = await repository.mutateForActor(project.id,actor,current=>{
    current.scenes[0].environmentReferenceEnabled=false;
    return current;
  });
  await assert.rejects(service.applyShotProposal(project.id,created.scene.id,toggled.shotProposals[0].id,
    {expectedVersion:toggled.version},actor),{code:'cinematic_shot_proposal_stale'});
  const current = await repository.mutateForActor(project.id,actor,value=>{value.shotProposals=[];return value;});
  await repository.mutateForActor(project.id,actor,value=>{value.scenes[0].environmentReferenceEnabled=true;return value;});
  service.storyboardAssetService.sceneImageForShotPlanning = async()=>{throw new Error('content changed');};
  await assert.rejects(service.proposeShots(project.id,created.scene.id,{expectedVersion:current.version},actor,
    {beforeDispatch:()=>dispatches++}),/content changed/);
  assert.equal(dispatches,3);
});

test('Story dossier accepts only owner assets uploaded from its Character form', async t => {
  const baseAsset = { status: 'active', assetType: 'generation_reference', publicUrl: '/outputs/references/writer/photo.png' };
  const assetRepository = {
    async findByIdForOwner(id, owner) {
      if (owner !== actor.userId || !['story-photo', 'playground-photo'].includes(id)) return null;
      return { ...baseAsset, id, metadata: { role: 'character_reference', sourceMode: id === 'story-photo' ? 'story-character' : 'upload' } };
    }
  };
  const { service, project, repository } = await fixture(t, { assetRepository });
  const input = { expectedProjectVersion: project.version, expectedStoryProjectVersion: project.version,
    displayName: 'Lalin', storyRole: 'Florist' };
  await assert.rejects(() => service.upsertSharedCharacterDossier(project.id, {
    ...input, storyReferenceAssetId: 'playground-photo'
  }, actor), { code: 'cinematic_story_reference_unavailable' });
  const saved = await service.upsertSharedCharacterDossier(project.id, {
    ...input, storyReferenceAssetId: 'story-photo'
  }, actor);
  assert.deepEqual(saved.project.castAssignments[0].storyReference, { assetId: 'story-photo', imageUrl: baseAsset.publicUrl });
  const outfitCommand = {assignmentId:saved.characterId, expectedProjectVersion:saved.project.version,
    expectedStoryProjectVersion:saved.storyProject.version};
  for (const assetId of ['other-owner-photo','playground-photo']) {
    await assert.rejects(service.upsertSharedCharacterDossier(project.id, {
      ...outfitCommand,storyOutfit:{name:'Winter coat',assetId}
    },actor),{code:'cinematic_story_reference_unavailable'});
  }
  const clothed = await service.upsertSharedCharacterDossier(project.id, {
    ...outfitCommand,storyOutfit:{name:'Winter coat',assetId:'story-photo',imageUrl:'/untrusted/photo'}
  },actor);
  const [outfit] = clothed.project.castAssignments[0].storyOutfits;
  assert.equal(outfit.imageUrl,baseAsset.publicUrl);
  const created = await service.createManualScene(project.id,{expectedVersion:clothed.project.version,idempotencyKey:'winter-scene'},actor);
  const scope = {expectedVersion:created.project.version,expectedSceneVersion:created.scene.version};
  await assert.rejects(service.updateSceneOutline(project.id,created.scene.id,
    {...scope,storyOutfitIds:{[saved.characterId]:'unknown'}},actor),{code:'cinematic_story_outfit_invalid'});
  const selected = await service.updateSceneOutline(project.id,created.scene.id,
    {...scope,storyOutfitIds:{[saved.characterId]:outfit.id}},actor);
  assert.deepEqual(selected.scene.storyOutfitIds,{[saved.characterId]:outfit.id});
  await assert.rejects(service.updateSceneOutline(project.id,created.scene.id,
    {...scope,storyOutfitIds:{}},actor),{code:'cinematic_version_conflict'});
  const first = await service.createManualShot(project.id,created.scene.id,
    {expectedVersion:selected.project.version,idempotencyKey:'coat-shot'},actor);
  const second = await service.createManualShot(project.id,created.scene.id,
    {expectedVersion:first.project.version,idempotencyKey:'default-shot'},actor);
  await service.updateShotDocument(project.id,created.scene.id,second.shot.id,{
    expectedVersion:second.project.version,expectedShotVersion:second.shot.version,storyOutfitIds:{[saved.characterId]:''}
  },actor);
  const reloaded = await service.getProject(project.id,actor);
  const reloadedScene = reloaded.scenes.find(scene=>scene.id===created.scene.id);
  assert.deepEqual(reloadedScene.storyOutfitIds,{[saved.characterId]:outfit.id});
  assert.equal(reloadedScene.shots.find(shot=>shot.id===first.shot.id).storyOutfitIds,undefined);
  assert.deepEqual(reloadedScene.shots.find(shot=>shot.id===second.shot.id).storyOutfitIds,{[saved.characterId]:''});
  await repository.mutateForActor(project.id,actor,current=>{current.status='completed';});
  await assert.rejects(service.upsertSharedCharacterDossier(project.id,{
    assignmentId:saved.characterId,expectedProjectVersion:reloaded.version,expectedStoryProjectVersion:reloaded.version,
    storyOutfit:{id:outfit.id,name:'Renamed after completion'}
  },actor),{code:'cinematic_project_not_editable'});
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
