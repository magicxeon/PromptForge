import assert from 'node:assert/strict';
import test from 'node:test';
import { applySceneProposal, createSceneProposal, scenePlanningProjection, updateSceneOutline } from '../server/domain/cinematic/CinematicSceneAuthoring.js';

test('scene direction can be corrected manually and survives a later AI outline',()=>{
  const project={activeChapterVersionId:'rev',sceneProposals:[],scenes:[]};
  const propose=()=>{
    const p=createSceneProposal({sourceChapterRevisionId:'rev',scenes:[{
      title:'Doorway',lighting:'Side light',audioIntent:'Wind',blockingMap:'Door to the east',sceneEvents:['dialogue','fight','unknown','fight']
    }]});
    project.sceneProposals.push(p);
    applySceneProposal(project,p.id);
    return project.scenes[0];
  };
  const first=propose();
  assert.deepEqual(first.sceneEvents,['dialogue','fight']);
  assert.equal(first.audioIntent,'Wind');
  assert.equal(first.blockingMap,'Door to the east');
  assert.throws(()=>updateSceneOutline(project,first.id,{expectedSceneVersion:1,title:'Doorway',blockingMap:'x'.repeat(2001)}),
    {code:'cinematic_blocking_map_invalid'});
  updateSceneOutline(project,first.id,{expectedSceneVersion:1,title:'At the doorway',lighting:'Lantern',
    sceneEvents:['dialogue'],audioIntent:'',blockingMap:'West window. Door to the north.'});
  const second=propose();
  assert.equal(second.lighting,'Lantern');
  assert.equal(second.audioIntent,'');
  assert.equal(second.blockingMap,'West window. Door to the north.');
  assert.deepEqual(second.sceneEvents,['dialogue']);
});

test('paragraph review splits and merges in the saved revision and protects existing scene media', () => {
  const proposal = createSceneProposal({sourceChapterRevisionId:'rev',paragraphCount:4,
    scenes:[{title:'One',sourceStartParagraph:1},{title:'Two',sourceStartParagraph:3}]});
  const project = {activeChapterVersionId:'rev',chapterVersions:[{id:'rev',story:'A\n\nB\nC\nD'}],
    scenes:[{id:'one',orderKey:1,shots:[]},{id:'two',orderKey:2,approvedEnvironmentSource:{assetId:'keep'}}],
    sceneProposals:[proposal]};
  assert.throws(()=>applySceneProposal(project,proposal.id,undefined,[{start:1,origins:[0,1]}]),{code:'cinematic_scene_range_in_use'});
  assert.throws(()=>applySceneProposal(project,proposal.id,undefined,[{start:1,origins:[1]}]),{code:'cinematic_scene_range_invalid'});
  assert.equal(proposal.status,'pending_review');
  applySceneProposal(project,proposal.id,undefined,[{start:1,origins:[0]},{start:2,origins:[0]},{start:3,origins:[1]}]);
  assert.deepEqual(project.scenes.map(row=>[row.sourceStartParagraph,row.sourceEndParagraph]),[[1,1],[2,2],[3,4]]);
  assert.equal(project.scenes[1].synopsis,'B');
  assert.equal(project.scenes[2].id,'two');
  const merged=createSceneProposal({sourceChapterRevisionId:'rev',paragraphCount:4,
    scenes:[{title:'First',sourceStartParagraph:1},{title:'Next',sourceStartParagraph:3}]});
  project.sceneProposals.push(merged);
  applySceneProposal(project,merged.id,undefined,[{start:1,origins:[0,1]}]);
  assert.equal(project.scenes[0].synopsis,'A\nB\nC\nD');
  assert.equal(project.scenes[1].approvedEnvironmentSource.assetId,'keep');
});

test('Scene regeneration preserves stable Scene and Shot production evidence', () => {
  const project = {
    activeChapterVersionId: 'chapter-rev-2',
    sceneProposals: [],
    scenes: [{
      id: 'scene-1', version: 3, orderKey: 1, title: 'Old title', purpose: 'dramatic',
      shots: [{ id: 'shot-1', generationAttempts: ['take-1'] }], shotOrder: ['shot-1'], durationMs: 4000
    }]
  };
  const proposal = createSceneProposal({
    sourceChapterRevisionId: 'chapter-rev-2', baseProjectVersion: 7, allowedCharacterIds: [],
    scenes: [{ title: 'New title', synopsis: 'Revised situation.', purpose: 'dialogue', objective: '', location: 'Cafe',
      time: 'Morning', weather: 'Clear', environment: 'Warm interior.', entryState: 'They sit apart.', exitState: 'They agree.',
      emotionalStart: 'Guarded', emotionalEnd: 'Open', transitionIntent: 'Cut to the street.', targetDurationSeconds: 30,
      dialogueTargetPercent: 60, characterIds: [] }]
  });
  project.sceneProposals.push(proposal);

  applySceneProposal(project, proposal.id);

  assert.equal(project.scenes[0].id, 'scene-1');
  assert.equal(project.scenes[0].shots[0].id, 'shot-1');
  assert.deepEqual(project.scenes[0].shots[0].generationAttempts, ['take-1']);
  assert.equal(project.scenes[0].planningStatus, 'review_required');
  assert.deepEqual(scenePlanningProjection(project), {
    sceneCount: 1, shotCount: 1, scenePlanningStatus: 'ready', pendingSceneProposalId: null
  });
});

test('Scene proposal cannot apply after the Chapter revision changes', () => {
  const proposal = createSceneProposal({
    sourceChapterRevisionId: 'chapter-rev-1', baseProjectVersion: 2, allowedCharacterIds: [],
    scenes: [{ title: 'Scene 1', synopsis: '', purpose: 'dramatic', targetDurationSeconds: 10, characterIds: [] }]
  });
  const project = { activeChapterVersionId: 'chapter-rev-2', scenes: [], sceneProposals: [proposal] };
  assert.equal(scenePlanningProjection(project).scenePlanningStatus, 'source_changed');
  assert.throws(() => applySceneProposal(project, proposal.id), { code: 'cinematic_scene_proposal_stale' });
  assert.equal(project.scenes.length, 0);
});

test('Scene outline rejects an empty title without changing the saved Scene', () => {
  const scene = { id: 'scene-1', version: 2, orderKey: 1, title: 'Saved Scene', shots: [], castAssignmentIds: [] };
  const project = { activeChapterVersionId: 'chapter-rev-1', scenes: [scene], sceneProposals: [], castAssignments: [] };
  assert.throws(() => updateSceneOutline(project, scene.id, { expectedSceneVersion: 2, title: '  ' }), {
    code: 'cinematic_scene_title_required'
  });
  assert.equal(scene.title, 'Saved Scene');
  assert.equal(scene.version, 2);
});
