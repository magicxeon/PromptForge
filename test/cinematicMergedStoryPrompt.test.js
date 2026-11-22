import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMergedStoryPrompt} from '../server/domain/cinematic/CinematicMergedStoryPrompt.js';
import {planStoryPromptLanguage} from '../server/domain/cinematic/StoryPromptLanguage.js';

const image = assetId => ({assetId, imageUrl:`/owned/${assetId}`});
const names = ['Approach', 'Answer', 'Departure'];
function fixture() {
  const shots = names.map((title,i) => ({
    id:`s${i+1}`, title, orderKey:i+1, version:2, durationMs:[3000,4000,3000][i],
    approvedStoryboardSource:image(i === 0 ? 'station' : `frame${i}`),
    shotDocument:'OPENING\nThe carriage is still.\nCAMERA\nCut to the window.\nPERFORMANCE AND TIMELINE\n[0.25-1.5s] The hand moves.',
    speakerBindings:[{alias:'Conductor',castAssignmentId:'c',visible:true}]
  }));
  shots[1].speakerBindings[0].visible = false;
  shots[1].shotDocument += '\nDIALOGUE AND FACIAL PERFORMANCE\n[1–2s] Conductor (whisper): รอก่อน\n[2-3s] Pause: hold the silence.\n[3s-4s] Visitor: ลาก่อน';
  const scene = {id:'scene', title:'Station', approvedEnvironmentSource:image('station'), shots:[shots[2],shots[0],shots[1]]};
  return {scene,shots,project:{scenes:[scene],castAssignments:[{id:'c',displayName:'Kai',dialogueStyle:'Quiet',storyReference:image('kai')}]}};
}

test('one ordered 3/4/3 timeline retains cue ranges, timed pauses, cuts, speaking identity and dialogue translation slots', () => {
  const {project,scene} = fixture();
  const before = structuredClone(project);
  for (const template of ['flow','seedance']) {
    const result = compileMergedStoryPrompt(project,scene,['s3','s1','s2'],template);
    assert.equal(result.ready,true);
    assert.deepEqual(result.shots.map(s => [s.id,s.startMs,s.endMs,s.version]), [
      ['s1',0,3000,2],['s2',3000,7000,2],['s3',7000,10000,2]
    ]);
    assert.equal(result.text.match(/Duration:/g).length,1);
    assert.match(result.text,/Duration: 10 seconds/);
    assert.match(result.text,/3\.25–4\.5s — The hand moves/);
    assert.match(result.text,/3–7s — Cut to the window/);
    assert.match(result.text,/\[4–5s\] Kai \(off-screen\): “รอก่อน”/);
    assert.match(result.text,/\[4–5s\] Kai \(off-screen\) — Quiet; whisper/);
    assert.match(result.text,/\[5–6s\] Pause: hold the silence/);
    assert.doesNotMatch(result.text,/One continuous take/i);
    assert.equal(result.cues[0].startOffsetMs,4000);
    assert.equal(result.findings[0].shotId,'s2');
    assert.deepEqual(planStoryPromptLanguage(result.text,result.cues,result.findings).slots
      .filter(s => s.role === 'dialogue').map(s => s.source), ['รอก่อน','ลาก่อน']);
    assert.deepEqual(result.references.map(r => [r.number,r.role,r.assetId]),[
      [1,'opening','station'],[2,'location','station'],[3,'character','kai']
    ]);
  }
  assert.deepEqual(project,before);
});

test('omitting the middle Shot compresses time, and later frames cannot satisfy Flow readiness', () => {
  const {scene,project,shots} = fixture();
  delete shots[0].approvedStoryboardSource;
  const result = compileMergedStoryPrompt(project,scene,['s3','s1'],'flow');
  assert.equal(result.ready,false);
  assert.match(result.text,/Duration: 6 seconds/);
  assert.match(result.text,/3–6s — Departure/);
  assert.doesNotMatch(result.text,/Answer|whisper|รอก่อน/);
  assert.deepEqual(result.cues,[]);
  assert.equal(result.references.some(ref => ref.role === 'opening'),false);
  const seedance = compileMergedStoryPrompt(project,scene,['s1','s3'],'seedance');
  assert.equal(seedance.ready,true);
  assert.match(seedance.text,/Compose a new opening view/);
  assert.equal(compileMergedStoryPrompt(project,scene,['s3','s2'],'flow').references[0].assetId,'frame1');
});

test('legacy structured timelines, fractions, offscreen dialogue and audio retain their source timing', () => {
  const {scene,project,shots} = fixture();
  shots[0].durationMs = 2555;
  delete shots[1].shotDocument;
  Object.assign(shots[1],{
    cameraMovement:'Tilt down.', transitionToNext:'Cut to black.',
    videoActionTimeline:[{startMs:101,endMs:1002,description:'Rings the bell.'}],
    dialogueCues:[{offscreenVoiceRole:'Announcer',delivery:'urgent',text:'Last call!',startOffsetMs:1020,estimatedDurationMs:1800}],
    audioCues:[{description:'Buzzer.',startOffsetMs:3456}]
  });
  const result = compileMergedStoryPrompt(project,scene,['s1','s2'],'seedance');
  assert.match(result.text,/Duration: 6\.555 seconds/);
  assert.match(result.text,/2\.656–3\.557s — Rings the bell/);
  assert.match(result.text,/\[3\.575–5\.375s\] Announcer \(off-screen\): “Last call!”/);
  assert.match(result.text,/\[6\.011s\] Buzzer/);
  assert.match(result.text,/Tilt down/);
  assert.match(result.text,/Cut to black/);
});

test('cleared document sections supersede legacy direction, while a manual Shot without a document uses its records', () => {
  const {scene,project,shots} = fixture();
  const shot = shots[1];
  Object.assign(shot,{
    manualStoryboard:true,
    shotDocument:'SCENE\nAn empty platform.\nOPENING\nCAMERA\nPERFORMANCE AND TIMELINE\nDIALOGUE AND FACIAL PERFORMANCE\nAUDIO\nCONTINUITY AND CONSTRAINTS',
    visibleMoment:'Legacy starting pose', cameraMovement:'Legacy zoom', subjectAction:'Legacy action',
    videoActionTimeline:[{startMs:50,endMs:750,description:'Legacy wave'}],
    dialogueCues:[{offscreenVoiceRole:'Guard',text:'Legacy speech',startOffsetMs:200,estimatedDurationMs:500}],
    audioIntent:'Legacy ambience', audioCues:[{startOffsetMs:500,description:'Legacy bell'}],
    performance:'Legacy reaction', continuityExit:'Legacy exit', continuityNotes:['Legacy prop']
  });
  const compile = () => compileMergedStoryPrompt(project,scene,['s2','s1'],'seedance');
  const cleared = compile();
  assert.match(cleared.text,/An empty platform/);
  assert.doesNotMatch(cleared.text,/Legacy/);
  assert.deepEqual(cleared.cues,[]);
  delete shot.shotDocument;
  const legacy = compile();
  assert.deepEqual(legacy.shots.map(item => item.id), ['s1','s2']);
  for (const term of ['starting pose','zoom','wave','speech','ambience','bell','reaction','exit','prop']) {
    assert.ok(legacy.text.includes(`Legacy ${term}`));
  }
  assert.equal(legacy.cues[0].startOffsetMs,3200);
  delete shot.videoActionTimeline;
  assert.match(compile().text,/3–7s — Legacy action/);
});

test('source hashes isolate the edited Shot and ignore draft storage and click order', () => {
  const {scene,project,shots} = fixture();
  const compile = ids => compileMergedStoryPrompt(project,scene,ids,'seedance');
  const original = compile(['s1','s2','s3']);
  shots[0].version++;
  shots[0].storyPromptVariants = {flow:{text:'An independently edited draft'}};
  assert.equal(compile(['s3','s2','s1']).sourceFingerprint,original.sourceFingerprint);
  shots[1].shotDocument += '\nCONTINUITY AND CONSTRAINTS\nKeep the lamp on.';
  const changed = compile(['s1','s2','s3']);
  assert.notEqual(changed.sourceFingerprint,original.sourceFingerprint);
  assert.deepEqual(changed.shots.filter((s,i) => s.sourceFingerprint !== original.shots[i].sourceFingerprint).map(s=>s.id),['s2']);
});

test('the merge accepts multiple distinct Shots from one Scene and a video template', () => {
  const {scene,project} = fixture();
  project.scenes.push({id:'elsewhere',shots:[{id:'foreign'}]});
  for (const ids of [null, [], ['s1'], ['s1','s1'], ['s1',null]]) {
    assert.throws(() => compileMergedStoryPrompt(project,scene,ids,'flow'),{code:'cinematic_story_merge_selection_invalid'});
  }
  assert.throws(() => compileMergedStoryPrompt(project,scene,['s1','foreign'],'flow'),{code:'cinematic_shot_not_found'});
  assert.throws(() => compileMergedStoryPrompt(project,scene,['s1','s2'],'still'),{code:'cinematic_story_template_invalid'});
});
