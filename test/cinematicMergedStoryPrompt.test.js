import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMergedStoryPrompt} from '../server/domain/cinematic/CinematicMergedStoryPrompt.js';
import {planStoryPromptLanguage, planStoryPromptRefinement} from '../server/domain/cinematic/StoryPromptLanguage.js';
import {compileStoryPromptPacket} from '../server/domain/cinematic/CinematicStoryPromptPacket.js';
import {compileCinematicShotDocument} from '../server/domain/cinematic/CinematicShotDocumentCompiler.js';
import {applyShotProposal, createShotProposal} from '../server/domain/cinematic/CinematicShotAuthoring.js';
import {inspectStoryPromptDraft} from '../server/domain/cinematic/StoryPromptFormatting.js';

test('reference label translation keeps canonical numbers and roles when the writer repeats the entry format', () => {
  const source = '[REFERENCE MAPPING]\nReference 1 — ถนน: set geometry, materials and light direction.\n'
    + 'Reference 2 — วิ: this character’s face, hair and wardrobe.';
  const {slots,render} = planStoryPromptLanguage(source,[]);
  assert.ok(slots.every(slot => slot.role === 'reference_label' && slot.linePrefix === undefined));
  assert.deepEqual(slots.map(slot => slot.source),['ถนน','วิ']);
  const translations = [
    {id:0,text:'Reference 1 — Residential lane: set geometry, materials and light direction.'},
    {id:1,text:'Wi (Image 2)'}
  ];
  assert.equal(render(translations,'Thai'),
    '[REFERENCE MAPPING]\nReference 1 — Residential lane: set geometry, materials and light direction.\n'
    + 'Reference 2 — Wi: this character’s face, hair and wardrobe.');
  for (const text of ['Reference 2 — Residential lane','Image 2: Residential lane','Residential lane [4s]']) {
    assert.throws(() => render([{id:0,text},translations[1]],'Thai'), {
      code:'cinematic_prompt_translation_invalid',
      details:{reason:'changed_markers',slotId:0,section:'REFERENCE MAPPING',role:'reference_label'}
    });
  }
});

test('embedded shot clocks widen the action row and cannot be reintroduced by translation', () => {
  const {project,scene,shots} = fixture();
  shots[1].shotDocument = 'PERFORMANCE AND TIMELINE\n[0–1s] The passenger lowers the letter. They stop [0:00.9-0:02.2] and listen [3s].';
  const {text,cues,findings} = compileMergedStoryPrompt(project,scene,['s1','s2'],'seedance');
  assert.match(text,/3–6s — The passenger lowers the letter\. They stop \[4–5s\] and listen \[6s\]/);
  assert.doesNotMatch(text,/\[0:|\[WRITING DIRECTION\]/);
  const {slots,render} = planStoryPromptLanguage(text,cues,findings);
  const translations = slots.map(({id,source}) => ({id,text:source}));
  assert.equal(render(translations,'English'),text);
  const slot = translations.find(row => row.text.includes('lowers the letter'));
  slot.text += ' Pause [0:00.9-0:02.2].';
  assert.throws(() => render(translations,'English'), {code:'cinematic_prompt_translation_invalid'});
  assert.ok(inspectStoryPromptDraft('Pause [0:00.9-0:02.2].', [], 10000).some(issue => issue.key === 'reviewClock'));
});

const image = assetId => ({assetId, imageUrl:`/owned/${assetId}`});
test('an accepted shot revision updates its cast and earlier revisions recover a uniquely named scene speaker', () => {
  const {project,scene,shots} = fixture();
  const shot = shots[0];
  project.castAssignments.push({id:'jai',displayName:'ชายอาบน้ำ',storyCharacterDetails:{aliases:['ใจ']},storyReference:image('jai')});
  scene.castAssignmentIds = ['c','jai'];
  shot.castMode = 'selected';
  shot.castAssignmentIds = ['c'];
  const document = shot.shotDocument + '\nDIALOGUE AND FACIAL PERFORMANCE\n[1–2s] ใจ (สะดุ้ง): ว้าย!';
  const before = {...shot,shotDocument:document};
  const compiled = compileCinematicShotDocument(before,scene,project.castAssignments);
  const packet = compileStoryPromptPacket(project,scene,before,compiled,'seedance');
  assert.equal(compiled.dialogue.cues[0].speakerCastAssignmentId,'jai');
  assert.ok(packet.references.some(ref=>ref.assetId==='jai'));
  assert.ok(!compileMergedStoryPrompt(project,scene,['s1','s3'],'seedance').references.some(ref=>ref.assetId==='jai'));
  const proposal = createShotProposal({sceneId:scene.id,targetShotId:shot.id,sourceShotVersion:shot.version,
    shots:[{title:shot.title,durationMs:shot.durationMs,shotDocument:document,characterIds:['c','jai']}],
    allowedCharacterIds:scene.castAssignmentIds});
  project.shotProposals = [proposal];
  applyShotProposal(project,scene.id,proposal.id);
  assert.deepEqual(shot.castAssignmentIds,['c','jai']);
  assert.equal(shot.speakerBindings[0].alias,'Conductor');
  assert.ok(compileMergedStoryPrompt(project,scene,['s1','s3'],'seedance').references.some(ref=>ref.assetId==='jai'));
  shot.speakerBindings[1].visible = false;
  const offscreen = compileMergedStoryPrompt(project,scene,['s1','s3'],'seedance');
  assert.equal(offscreen.cues[0].speakerVisible,false);
  assert.ok(!offscreen.references.some(ref=>ref.assetId==='jai'));
});

test('visual target survives writing and references follow scene, character name and opening order', () => {
  const {project,scene,shots} = fixture();
  project.castAssignments.push({id:'a',displayName:'Alpha',storyReference:image('alpha')});
  shots[2].speakerBindings.push({alias:'Alpha',castAssignmentId:'a',visible:true});
  for (const packet of [
    compileMergedStoryPrompt(project,scene,['s1','s3'],'seedance'),
    compileStoryPromptPacket(project,scene,shots[2],compileCinematicShotDocument(shots[2],scene,project.castAssignments),'seedance')
  ]) {
    assert.deepEqual(packet.references.map(ref=>ref.role),['location','character','character','opening']);
    assert.deepEqual(packet.references.slice(1,3).map(ref=>ref.name),['Alpha','Kai']);
    assert.match(packet.text,/Use Reference 4 as the exact opening frame/);
    assert.ok(packet.text.indexOf('[VISUAL TARGET]') < packet.text.indexOf('[REFERENCE MAPPING]'));
    const language = planStoryPromptLanguage(packet.text,packet.cues || [],packet.findings);
    assert.ok(!language.slots.some(slot=>/Photorealistic live-action|exact opening frame/.test(slot.source)));
    const refinement = planStoryPromptRefinement(packet.text);
    assert.ok(refinement.lines.filter(line=>/Photorealistic live-action|exact opening frame/.test(line.text))
      .every(line=>!line.editable));
  }
});

test('single and merged video prompts retain the fictional reference note through writing and refinement', () => {
  const {project,scene,shots} = fixture();
  const shot = shots[0];
  shots[1].shotDocument = 'OPENING\nThe door is closed.\nCAMERA\nKeep the door in frame.\nPERFORMANCE AND TIMELINE\n[0–4s] The door opens slowly.';
  const prepared = compileCinematicShotDocument(shot,scene,project.castAssignments);
  const note = '[REFERENCE NOTE]\nThe character references depict AI-generated fictional characters, not real people.';
  for (const template of ['seedance','flow']) {
    const merged = compileMergedStoryPrompt(project,scene,['s1','s2'],template);
    const single = compileStoryPromptPacket(project,scene,shot,prepared,template);
    for (const {text} of [merged,single]) {
      const plan = planStoryPromptLanguage(text,[],[],template === 'seedance');
      assert.ok(!plan.slots.some(slot => slot.source.includes('fictional characters')));
      const written = plan.render(plan.slots.map(({id,source}) => ({id,text:source})),'Thai');
      const reviewed = planStoryPromptRefinement(written).apply([]);
      assert.ok(reviewed.startsWith(note + '\n\n'));
      assert.ok(reviewed.endsWith('\n\n' + note));
      assert.equal(reviewed.split(note).length,3);
    }
  }
});
test('Seedance composes one clip brief with a concrete opening, shared lighting and an immutable cut schedule', () => {
  const {project,scene,shots} = fixture();
  shots[0].durationMs = 3300;
  shots[1].durationMs = 2900;
  shots[2].durationMs = 3800;
  for (const shot of shots) shot.artDirection = 'Warm reflected light.';
  const packet = compileMergedStoryPrompt(project,scene,['s2','s3','s1'],'seedance');
  assert.match(packet.text,/3 shots\. Shot boundaries: 3s, 6s\./);
  assert.match(packet.text,/Opening-frame basis: The carriage is still\./);
  const headings = Array.from(packet.text.matchAll(/^\[(?!REFERENCE NOTE\])([A-Z ]+)\]$/gm), m=>m[1]);
  assert.equal(headings.length,new Set(headings).size);
  for (const heading of ['REFERENCE MAPPING','CAMERA','ACTION TIMELINE','LIGHTING','VOICE']) assert.ok(headings.includes(heading));
  assert.equal(packet.text.match(/Warm reflected light\./g).length,1);
  const {slots} = planStoryPromptLanguage(packet.text,packet.cues,packet.findings);
  assert.ok(!slots.some(slot => slot.source.includes('Shot boundaries:')));
  assert.deepEqual(slots.filter(slot => slot.section === 'CAMERA').map(slot => slot.shotNumber),[1,2,3]);
  assert.equal(packet.text.match(/“รอก่อน”/g).length,1);
});

test('the sequence writer composes adjacent directions as one beat with protected inner clocks and separate dialogue', () => {
  const {project,scene,shots} = fixture();
  shots[0].shotDocument += '\n[2–3s] The door opens.';
  const {text,cues,findings} = compileMergedStoryPrompt(project,scene,['s1','s2'],'seedance');
  const {slots,render} = planStoryPromptLanguage(text,cues,findings,true);
  const beat = slots.find(s => s.section === 'ACTION TIMELINE' && s.shotNumber === 1 && s.source.includes('door opens'));
  assert.match(beat.source,/The hand moves\. \[2–3s\] The door opens/);
  const result = slots.map(({id,source}) => ({id,text:source}));
  result[beat.id].text = 'Her hand moves. [2–3s] The door swings open.';
  const composed = render(result,'Thai');
  assert.match(composed,/The door swings open/);
  assert.equal(composed.match(/“รอก่อน”/g).length,1);
  result[beat.id].text = 'Her hand moves and the door swings open.';
  assert.throws(() => render(result,'Thai'),{code:'cinematic_prompt_translation_invalid'});
});

test('short selected shots retain a positive interval and share precise cut and inline cue times', () => {
  const {project,scene,shots} = fixture();
  shots[0].durationMs = 250;
  shots[0].shotDocument = 'OPENING\nThe light is out.\nPERFORMANCE AND TIMELINE\n[0–0.25s] It flickers.';
  shots[1].shotDocument = 'PERFORMANCE AND TIMELINE\n[0–1s] Hold [0:00.1–0:00.5].';
  const {text} = compileMergedStoryPrompt(project,scene,['s1','s2'],'seedance');
  assert.match(text,/Duration: 4.25 seconds/);
  assert.match(text,/Shot boundaries: 0.25s/);
  assert.match(text,/0–0.25s — It flickers/);
  assert.match(text,/0.25–1.25s — Hold \[0.35–0.75s\]/);
});
test('selected Seedance shots scope reveals, isolate the timeline and preserve literal speech',()=>{
  const {project,scene,shots}=fixture();
  scene.synopsis='A later visitor rings a hidden bell.';
  scene.audioIntent='The final bell rings.';
  shots[1].shotDocument+='\nAUDIO\nSteam rises [0:00.9-0:02.2].';
  const packet=compileMergedStoryPrompt(project,scene,['s2','s1'],'seedance');
  assert.doesNotMatch(packet.text,/hidden bell|final bell|WRITING DIRECTION|0:00\.9/);
  assert.match(packet.text,/Steam rises \[4–5s\]/);
  assert.ok(packet.text.indexOf('Shot 1') < packet.text.indexOf('Shot 2'));
  const changed=packet.text.replace('“รอก่อน”','').concat('\nReference 99\n[10s] Hold.');
  const issues=inspectStoryPromptDraft(changed,packet.references,7000,packet.text);
  assert.deepEqual(new Set(issues.map(issue=>issue.key)),new Set(['reviewClock','reviewReference','reviewCue']));
});
test('both destinations reuse saved lighting and scene sound after an art override',()=>{
  const {project,scene,shots}=fixture();
  scene.audioIntent='Rain on the station roof.';
  shots[0].shotDocument+='\nVISUAL STYLE & LIGHTING\nWarm lantern.';
  shots[1].shotDocument+='\nAUDIO\n[0:01–0:02] Door creaks.';
  for(const kind of ['seedance','flow']){
    delete shots[0].artDirection;
    assert.match(compileMergedStoryPrompt(project,scene,['s1','s2'],kind).text,/Warm lantern/);
    shots[0].artDirection='Cool window light.';
    const packet=compileMergedStoryPrompt(project,scene,['s1','s2','s3'],kind);
    assert.match(packet.text,/Cool window light/);
    assert.match(packet.text,/Rain on the station roof/);
    assert.match(packet.text,/\[4–5s\] Door creaks/);
    assert.doesNotMatch(packet.text,/Warm lantern/);
  }
});
test('a silent insert with no shot cast does not import a scene cast portrait', () => {
  const {project,scene,shots} = fixture();
  scene.castAssignmentIds = ['c'];
  for (const shot of [shots[0],shots[2]]) delete shot.speakerBindings;
  const packet = compileMergedStoryPrompt(project,scene,['s1','s3'],'seedance');
  assert.equal(packet.references.some(ref => ref.role === 'character'), false);
  assert.doesNotMatch(packet.text,/Kai|CHARACTER IDENTIFICATION/);
  assert.deepEqual(packet.cues,[]);
});
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
    assert.match(result.text,/3–5s — The hand moves/);
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
      [1,'location','station'],[2,'character','kai'],[3,'opening','station']
    ]);
  }
  assert.deepEqual(project,before);
});

test('omitting the middle Shot compresses time, and later frames cannot satisfy Flow readiness', () => {
  const {scene,project,shots} = fixture();
  delete shots[0].approvedStoryboardSource;
  shots[2].shotDocument += '\nCONTINUITY AND CONSTRAINTS\nKeep the flashlight in the right hand.';
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
  assert.match(seedance.text,/Compose the closing frame from the final action and end state/);
  assert.match(seedance.text,/\[REFERENCE MAPPING\]\n[^\n]+\nReference 1 — Station: set geometry, materials and light direction\.\nReference 2 — Kai: this character’s face, hair and wardrobe\./);
  assert.match(seedance.text,/Never insert them as frames unless explicitly assigned the opening-frame role/);
  assert.match(seedance.text,/\[CONTINUITY\]\n[^\n]+\n3–6s — Keep the flashlight in the right hand/);
  assert.doesNotMatch(seedance.text,/exact opening frame|\[PRESERVE EXACTLY\]/i);
  const framed = compileMergedStoryPrompt(project,scene,['s3','s2'],'seedance');
  assert.equal(framed.references.at(-1).assetId,'frame1');
  assert.match(framed.text,/Use Reference 3 as the exact opening frame/);
});

test('merged prompts round displayed seconds and retain precise source timing', () => {
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
  assert.match(result.text,/Duration: 7 seconds/);
  assert.match(result.text,/3–4s — Rings the bell/);
  assert.match(result.text,/\[4–5s\] Announcer \(off-screen\): “Last call!”/);
  assert.match(result.text,/\[6s\] Buzzer/);
  assert.equal(result.shots[1].startMs,2555);
  assert.equal(result.shots[1].endMs,6555);
  assert.equal(result.cues[0].startOffsetMs,3575);
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
