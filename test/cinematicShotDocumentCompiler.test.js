import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCinematicShotDocument, shotPromptSourceFingerprint } from '../server/domain/cinematic/CinematicShotDocumentCompiler.js';
import { CinematicVideoPacketCompiler } from '../server/domain/cinematic/CinematicVideoPacketCompiler.js';
import { StoryboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';

const DOCUMENT = `SHOT DURATION
4 seconds

SCENE
Rain falls outside the flower shop.

OPENING
Mira crouches beside the curb with both hands hovering above the fallen pot. Kin remains behind her and looks toward the road.

CAMERA
Locked vertical medium-wide frame at eye level.

PERFORMANCE AND TIMELINE
0.0-1.0s: Mira lowers both hands and grips opposite sides of the pot rim.
1.0-4.0s: She attempts one heavy lift while Kin takes one walking step.

DIALOGUE AND FACIAL PERFORMANCE
No dialogue. Mira concentrates on the pot.

AUDIO
Heavy rain and distant traffic.

CONTINUITY AND CONSTRAINTS
The pot remains in contact with the road.
Kin does not notice Mira.`;

test('named dialogue retains stable identity, shared voice, local delivery and off-screen visibility', () => {
  const cast = [{ id: 'a', displayName: 'New name', dialogueStyle: 'Soft low voice' }, { id: 'b', displayName: 'Kin', dialogueStyle: '' }];
  const shot = { durationMs: 10000, speakerBindings: [
    { alias: 'Lalin', castAssignmentId: 'a', visible: true }, { alias: 'Kin', castAssignmentId: 'b', visible: false }
  ], shotDocument: 'DIALOGUE AND FACIAL PERFORMANCE\n[0:00-0:04] Lalin (apologetic): ขอโทษนะคะ\n[0:04-0:08] Kin: ไม่เป็นไรครับ\nThe listener looks up.\nAUDIO\nRain.' };
  const compiled = compileCinematicShotDocument(shot, {}, cast);
  assert.equal(compiled.dialogue.cues[0].speakerCastAssignmentId, 'a');
  assert.equal(compiled.dialogue.cues[0].text, 'ขอโทษนะคะ');
  assert.equal(compiled.dialogue.cues[0].delivery, 'Soft low voice; apologetic');
  assert.equal(compiled.dialogue.cues[1].speakerVisible, false);
  assert.equal(compiled.dialogue.cues[1].startOffsetMs, 4000);
  assert.equal(compiled.dialogue.findings.length, 0);
  assert.match(compiled.creatorPrompt, /New name/);
  assert.match(compiled.creatorPrompt, /The listener looks up/);
});

test('unresolved speakers preserve prose and do not inherit stale legacy cues', () => {
  const compiled = compileCinematicShotDocument({ durationMs: 4000,
    dialogueCues: [{ text: 'Old line' }], shotDocument: 'DIALOGUE AND FACIAL PERFORMANCE\nUnknown: Keep this line.' }, {}, []);
  assert.equal(compiled.preparedShot.dialogueCues.length, 0);
  assert.equal(compiled.dialogue.findings[0].code, 'cinematic_dialogue_speaker_unresolved');
  assert.match(compiled.creatorPrompt, /Keep this line/);
  assert.doesNotMatch(compiled.creatorPrompt, /Old line/);
});

test('custom prompt reaches provider rendering without duplicate authored action and becomes stale on source changes', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0], shot = scene.shots[0];
  Object.assign(shot, { shotDocument: DOCUMENT, videoReferenceMode: 'looks_only' });
  shot.videoPromptOverride = { text: 'A unique CUSTOM direction: remain still and listen.', sourceFingerprint: shotPromptSourceFingerprint(project, scene, shot) };
  const compiler = new CinematicVideoPacketCompiler();
  const packet = compiler.compile({ project, scene, shot });
  assert.equal(packet.findings.some(item => item.code === 'cinematic_video_prompt_review_required'), false);
  const rendered = compiler.renderForProvider(packet);
  assert.match(rendered.prompt, /A unique CUSTOM direction/);
  assert.doesNotMatch(rendered.prompt, /attempts one heavy lift/);
  assert.ok(rendered.promptBudget);
  project.castAssignments[0].dialogueStyle = 'Now speak slowly';
  const changed = compiler.compile({ project, scene, shot });
  assert.equal(changed.findings.some(item => item.code === 'cinematic_video_prompt_review_required'), true);
  assert.notEqual(changed.packetFingerprint, packet.packetFingerprint);
  assert.equal(shot.videoPromptOverride.text, 'A unique CUSTOM direction: remain still and listen.');
});

test('Shot document compiler separates the time-zero opening from timed video events', () => {
  const prepared = compileCinematicShotDocument({ id: 'shot_1', durationMs: 4000, shotDocument: DOCUMENT }, {});
  assert.equal(prepared.opening, 'Mira crouches beside the curb with both hands hovering above the fallen pot. Kin remains behind her and looks toward the road.');
  assert.deepEqual(prepared.timeline, [
    { startMs: 0, endMs: 1000, description: 'Mira lowers both hands and grips opposite sides of the pot rim.' },
    { startMs: 1000, endMs: 4000, description: 'She attempts one heavy lift while Kin takes one walking step.' }
  ]);
  assert.equal(prepared.preparedShot.openingFrameVersion, 1);
  assert.equal(prepared.preparedShot.prompt, '');
  assert.deepEqual(prepared.preparedShot.continuityNotes, [
    'The pot remains in contact with the road.', 'Kin does not notice Mira.'
  ]);
});

test('Shot document drives First Frame and Video compilers without legacy direction fields', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  Object.assign(shot, {
    shotDocument: DOCUMENT,
    shotDocumentVersion: 2,
    visibleMoment: '', subjectAction: '', emotionalTarget: '', performanceCue: '', prompt: '',
    videoReferenceMode: 'looks_only'
  });
  const before = structuredClone(shot);
  const keyframe = new StoryboardKeyframeContractCompiler().compile({ project, scene, shot });
  assert.equal(keyframe.findings.some(item => item.severity === 'blocking'), false);
  assert.match(keyframe.providerIndependentPrompt, /both hands hovering above the fallen pot/i);
  assert.doesNotMatch(keyframe.providerIndependentPrompt, /attempts one heavy lift/i);

  const video = new CinematicVideoPacketCompiler().compile({ project, scene, shot });
  assert.equal(video.findings.some(item => item.code === 'cinematic_video_action_required'), false);
  assert.deepEqual(video.motion.timeline.map(event => [event.startMs, event.endMs]), [[0, 1000], [1000, 4000]]);
  assert.match(video.providerIndependentPrompt, /0:00-0:01: Mira lowers both hands/i);
  assert.match(video.providerIndependentPrompt, /0:01-0:04: She attempts one heavy lift/i);
  assert.deepEqual(shot, before);
});

test('Shot document without an opening or action remains blocked before generation', () => {
  const project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = { ...scene.shots[0], shotDocument: 'SHOT DURATION\n4 seconds',
    visibleMoment: '', subjectAction: '', emotionalTarget: '', prompt: '' };
  const contract = new StoryboardKeyframeContractCompiler().compile({ project, scene, shot });
  assert.ok(contract.findings.some(item => item.severity === 'blocking' && item.fieldPath === 'shot.visibleMoment'));
  assert.ok(contract.findings.some(item => item.severity === 'blocking' && item.fieldPath === 'shot.subjectAction'));
  const video = new CinematicVideoPacketCompiler().compile({ project, scene, shot });
  assert.ok(video.findings.some(item => item.severity === 'blocking'
    && item.code === 'cinematic_video_timeline_required' && item.fieldPath === 'shot.shotDocument'));
});

test('Shot document compiler accepts existing inline headings and minute clocks', () => {
  const prepared = compileCinematicShotDocument({ id: 'shot_legacy_format', durationMs: 10000,
    shotDocument: `SHOT DURATION: 10 seconds\n\nSCENE: Inside a dawn bus.\n\nCAMERA: Wide aisle view.\n\nPERFORMANCE AND TIMELINE:\n0:00-0:03 Lek sits still by the window.\n0:03-0:10 She raises the envelope and looks outside.\n\nAUDIO: Engine and road ambience.` }, {});
  assert.equal(prepared.sections.scene, 'Inside a dawn bus.');
  assert.equal(prepared.sections.camera, 'Wide aisle view.');
  assert.deepEqual(prepared.timeline.map(event => [event.startMs, event.endMs]), [[0, 3000], [3000, 10000]]);
  assert.match(prepared.opening, /Inside a dawn bus/);
  assert.match(prepared.opening, /immediately before.*Lek sits still/i);
});
