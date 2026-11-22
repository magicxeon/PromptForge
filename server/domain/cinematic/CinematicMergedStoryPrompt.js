import {createHash} from 'node:crypto';
import templates from '../../config/cinematic/story-shot-templates.v1.json' with {type:'json'};
import {resolveWritingPreferences, storySpokenLanguage} from '../../config/storyWritingSettings.js';
import {projectVideoDirection} from './CinematicProjectVideoDirection.js';
import {compileCinematicShotDocument, parseDialogueClock} from './CinematicShotDocumentCompiler.js';
import {storyPromptPeople, storyPromptReferences, storyReferenceText} from './CinematicStoryPromptPacket.js';

const lines = (...values) => values.filter(Boolean).join('\n');
const seconds = ms => ms / 1000;
const span = (startMs, endMs) => `${seconds(startMs)}–${seconds(endMs)}s`;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function invalid(code, message, statusCode = 400) {
  throw Object.assign(new Error(message), {code, statusCode});
}

function selectShots(scene, ids) {
  if (!Array.isArray(ids) || ids.length < 2 || ids.some(id => typeof id !== 'string' || !id.trim())
    || new Set(ids).size !== ids.length) {
    invalid('cinematic_story_merge_selection_invalid', 'Choose at least two distinct Shots.');
  }
  const selected = new Set(ids);
  const shots = scene.shots.filter(shot => selected.has(shot.id));
  if (shots.length !== ids.length) invalid('cinematic_shot_not_found', 'A selected Shot was not found in this Scene.', 404);
  if (shots.some(shot => !Number.isSafeInteger(shot.durationMs) || shot.durationMs < 1)) {
    invalid('cinematic_story_merge_duration_invalid', 'Each selected Shot needs a positive duration in milliseconds.');
  }
  return shots.sort((a,b) => a.orderKey - b.orderKey);
}

function prepareShot(project, scene, shot, first) {
  const document = compileCinematicShotDocument({...shot, manualStoryboard:false}, scene, project.castAssignments);
  const people = storyPromptPeople(project, scene, shot);
  const sections = document?.sections || {};
  const camera = document ? sections.camera : lines(shot.framing, shot.cameraAngle, shot.lensIntent, shot.cameraMovement);
  const timeline = document?.timeline ?? shot.videoActionTimeline ?? [];
  const fallbackAction = !document && (lines(shot.subjectAction, shot.blocking, shot.prompt) || shot.visibleMoment || shot.purpose);
  const cues = document?.dialogue.cues ?? shot.dialogueCues ?? [];
  return {
    id:shot.id, title:shot.title, orderKey:shot.orderKey, durationMs:shot.durationMs,
    scene:sections.scene, opening:document ? sections.opening : shot.continuityEntry || shot.visibleMoment,
    camera, timeline:timeline.length || !fallbackAction ? timeline : [{startMs:0,endMs:shot.durationMs,description:fallbackAction}],
    cues:cues.map(cue => {
      const person = project.castAssignments?.find(p => p.active !== false && p.id === cue.speakerCastAssignmentId);
      return {...cue, speaker:person?.displayName || cue.offscreenVoiceRole || 'Speaker',
        delivery:document ? cue.delivery : [person?.dialogueStyle, cue.delivery].filter(Boolean).join('; ')};
    }),
    findings:document?.dialogue.findings || [],
    performance:document ? document.dialogue.performance : lines(shot.performanceCue || shot.performance, shot.emotionalTarget, shot.gaze),
    audio:document ? sections.audio : shot.audioIntent, audioCues:document ? [] : shot.audioCues || [],
    light:shot.lighting, continuity:document ? sections.continuity : lines(...(shot.continuityNotes || [])),
    exit:document ? '' : lines(shot.continuityExit, shot.transitionToNext),
    people:people.map(({person,visible}) => ({name:person.displayName, role:person.storyRole, visible,
      referenceId:visible && person.storyReference?.assetId})),
    references:storyPromptReferences(scene, shot, people, first)
  };
}

function timedPerformance(performance, startMs) {
  return performance.split('\n').map(line => {
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/u);
    if (!match) return line;
    const range = parseDialogueClock(match[1]);
    if (range.length > 2 || !range.every(Number.isFinite)) return line;
    const clock = range.length === 2 ? span(startMs + range[0], startMs + range[1]) : `${seconds(startMs + range[0])}s`;
    return `[${clock}] ${match[2]}`;
  }).join('\n');
}

export function compileMergedStoryPrompt(project, scene, shotIds, template) {
  if (!['seedance','flow'].includes(template)) invalid('cinematic_story_template_invalid', 'Choose a video prompt template.');
  const ordered = selectShots(scene, shotIds);
  const spokenLanguage = storySpokenLanguage(project.writingSettings);
  const {skillInstructions} = resolveWritingPreferences(project.writingSettings);
  const direction = projectVideoDirection(project);
  const aspect = project.writingSettings?.direction?.aspectRatio || project.aspectRatio || project.setup?.aspectRatio;
  const setting = lines(scene.location, scene.time, scene.weather, scene.environmentPrompt, scene.synopsis || scene.storyChange);
  const shots = [], references = [], cues = [], findings = [];
  const fields = Object.fromEntries(templates.video.sections.map(name => [name, []]));
  if (setting) fields.SCENE.push(setting);
  let cursorMs = 0;
  for (const [index, shot] of ordered.entries()) {
    const part = prepareShot(project, scene, shot, index === 0);
    const startMs = cursorMs, endMs = startMs + part.durationMs;
    cursorMs = endMs;
    const interval = span(startMs,endMs);
    const scoped = body => body && `${interval} — ${body}`;
    const sourceFingerprint = hash(['merged-story-v1', template, spokenLanguage, skillInstructions, direction, aspect,
      setting, scene.lighting, scene.artDirection, shot.shotDocument, {...part,
        references:part.references.map(r => [r.role, r.assetId, r.name])}]);
    shots.push({id:shot.id, title:shot.title, startMs, endMs, version:shot.version || 1, sourceFingerprint});
    for (const ref of part.references) {
      if (!references.some(r => r.role === ref.role && r.assetId === ref.assetId)) {
        references.push({...ref, number:references.length + 1});
      }
    }
    for (const person of part.people) {
      const ref = references.find(r => r.role === 'character' && r.assetId === person.referenceId);
      fields['CHARACTER IDENTIFICATION'].push(scoped([person.name, person.role, ref && `Reference ${ref.number}`,
        !person.visible && 'Voice only, off-screen.'].filter(Boolean).join(' — ')));
    }
    fields.SCENE.push(scoped(part.scene));
    fields.CAMERA.push(scoped(part.camera));
    fields['PRESERVE EXACTLY'].push(scoped(part.continuity));
    const events = part.timeline.map(event => ({ms:startMs + event.startMs,
      text:`${span(startMs + event.startMs, startMs + event.endMs)} — ${event.description}`}));
    for (const cue of part.cues) {
      const ms = startMs + (cue.startOffsetMs || 0);
      const clock = cue.estimatedDurationMs > 0 ? span(ms, ms + cue.estimatedDurationMs) : `${seconds(ms)}s`;
      const speaker = cue.speaker + (cue.speakerVisible === false || cue.offscreenVoiceRole ? ' (off-screen)' : '');
      events.push({ms, text:`[${clock}] ${speaker}: “${cue.text}”`});
      if (cue.delivery) fields.VOICE.push(`[${clock}] ${speaker} — ${cue.delivery}`);
      cues.push({...cue, startOffsetMs:ms});
    }
    fields['ACTION TIMELINE'].push(scoped(shot.title || `Shot ${index + 1}`),
      part.opening && `Starting state: ${part.opening}`, ...events.sort((a,b) => a.ms - b.ms).map(event => event.text), part.exit);
    if (part.performance) fields.PERFORMANCE.push(scoped(shot.title), timedPerformance(part.performance,startMs));
    fields.AUDIO.push(scoped(part.audio));
    for (const cue of part.audioCues) {
      if (cue.description) fields.AUDIO.push(`[${seconds(startMs + (cue.startOffsetMs || 0))}s] ${cue.description}`);
    }
    fields.LIGHTING.push(scoped(part.light));
    findings.push(...part.findings.map(finding => ({...finding,shotId:shot.id})));
  }
  const frame = references.some(ref => ref.role === 'opening');
  const header = template === 'flow' ? templates.flow.opening : lines(
    references.length && `[REFERENCE NOTE]\n${templates.seedance.referenceNote}`,
    frame ? templates.seedance.withFrame : templates.seedance.withoutFrame);
  fields['PRESERVE EXACTLY'].unshift(storyReferenceText(references), templates.video.preserve);
  fields.PERFORMANCE.push(templates.video.performance);
  fields.VOICE.unshift(`Spoken language: ${spokenLanguage}.`, 'Speak only the supplied dialogue. Preserve the pauses between cues.');
  fields.AUDIO.push('No music.');
  fields.LIGHTING.unshift(scene.lighting, scene.artDirection);
  fields['ENVIRONMENT MOVEMENT'].push(templates.video.environmentMovement);
  fields.NEGATIVE.push(templates.video.negative);
  const sections = templates.video.sections.map(title => {
    const body = lines(...fields[title]);
    return body && `[${title}]\n${body}`;
  });
  const text = [header, `Duration: ${seconds(cursorMs)} seconds. ${aspect || ''}`.trim(), ...sections, direction,
    skillInstructions.length && `[WRITING DIRECTION]\n${lines(...skillInstructions)}`].filter(Boolean).join('\n\n');
  return {template, text, ready:template !== 'flow' || frame,
    sourceFingerprint:hash([text, shots.map(s => [s.id,s.sourceFingerprint])]), shots, references, cues, findings};
}
