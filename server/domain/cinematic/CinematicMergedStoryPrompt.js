import {createHash} from 'node:crypto';
import templates from '../../config/cinematic/story-shot-templates.v1.json' with {type:'json'};
import {resolveWritingPreferences, storySpokenLanguage, storyVisualStyle} from '../../config/storyWritingSettings.js';
import {formatStoryPromptWholeSeconds, mergedSequenceClock, rebaseDirectionClocks} from './StoryPromptFormatting.js';
import {projectVideoDirection} from './CinematicProjectVideoDirection.js';
import {compileCinematicShotDocument, parseDialogueClock} from './CinematicShotDocumentCompiler.js';
import {missingCharacterReferences, orderStoryPromptReferences, storyPromptPeople, storyPromptReferences, storyVideoFrameDirection, storyVideoReferenceMapping, storyVisualTarget, withStoryVideoReferenceNote} from './CinematicStoryPromptPacket.js';

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

function prepareShot(project, scene, shot, first, shotOnly) {
  const document = compileCinematicShotDocument({...shot, manualStoryboard:false}, scene, project.castAssignments);
  const cues = document?.dialogue.cues ?? shot.dialogueCues ?? [];
  const people = storyPromptPeople(project, scene, shot, shotOnly, cues);
  const sections = document?.sections || {};
  const camera = lines(document ? sections.camera : lines(shot.framing, shot.cameraAngle, shot.lensIntent, shot.cameraMovement), shot.cameraDirectionNotes);
  const timeline = document?.timeline ?? shot.videoActionTimeline ?? [];
  const fallbackAction = !document && (lines(shot.subjectAction, shot.blocking, shot.prompt) || shot.visibleMoment || shot.purpose);
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
    light:shot.artDirection || sections.lighting || shot.lighting, continuity:document ? sections.continuity : lines(...(shot.continuityNotes || [])),
    exit:document ? '' : lines(shot.continuityExit, shot.transitionToNext),
    people:people.map(({person,visible}) => ({name:person.displayName, role:person.storyRole, visible,
      referenceId:visible && person.storyReference?.assetId})),
    missingCharacters:missingCharacterReferences(people),
    references:storyPromptReferences(scene, shot, people, first)
  };
}

function rebaseCueLines(text, startMs, embedded = false, precise = false) {
  const direction = body => embedded ? rebaseDirectionClocks(body,startMs,undefined,precise) : body;
  return text.split('\n').map(line => {
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/u);
    if (!match) return direction(line);
    const range = parseDialogueClock(match[1]);
    if (range.length > 2 || !range.every(Number.isFinite)) return line;
    const clock = range.length === 2 ? span(startMs + range[0], startMs + range[1]) : `${seconds(startMs + range[0])}s`;
    return `[${clock}] ${direction(match[2])}`;
  }).join('\n');
}

function seedanceAction(event, offset, duration, precise) {
  let first = event.startMs, last = event.endMs;
  const description = rebaseDirectionClocks(event.description, offset, (start, end) => {
    if (start <= end && end <= duration) {
      first = Math.min(first, start);
      last = Math.max(last, end);
    }
  }, precise);
  return {ms:offset + first, text:`${span(offset + first, offset + last)} — ${description}`};
}

export function compileMergedStoryPrompt(project, scene, shotIds, template) {
  if (!['seedance','flow'].includes(template)) invalid('cinematic_story_template_invalid', 'Choose a video prompt template.');
  const ordered = selectShots(scene, shotIds);
  const spokenLanguage = storySpokenLanguage(project.writingSettings);
  const {skillInstructions} = resolveWritingPreferences(project.writingSettings,"shots",{scene,shot:ordered});
  const direction = projectVideoDirection(project);
  const aspect = project.writingSettings?.direction?.aspectRatio || project.aspectRatio || project.setup?.aspectRatio;
  const seedance = template === 'seedance';
  const setting = seedance ? lines(scene.location,scene.time,scene.weather)
    : lines(scene.location, scene.time, scene.weather, scene.environmentPrompt, scene.synopsis || scene.storyChange);
  const parts = ordered.map((shot,index)=>prepareShot(project,scene,shot,index===0,seedance));
  const references = orderStoryPromptReferences(parts.flatMap(part=>part.references));
  const shots = [], cues = [], findings = [];
  let cursorMs = 0;
  const timing = ordered.map(shot => {
    const startMs = cursorMs;
    cursorMs += shot.durationMs;
    return {startMs,endMs:cursorMs};
  });
  const clock = mergedSequenceClock(timing);
  const exact = seedance && clock.precise;
  const fields = Object.fromEntries(templates.video.sections.map(name => [name, []]));
  const sharedDirections = new Map();
  function addDirection(section, text, index) {
    if (!text) return;
    const {startMs,endMs} = timing[index];
    if (!seedance) {
      fields[section].push(`${span(startMs,endMs)} — ${text}`);
      return;
    }
    const entries = sharedDirections.get(section) ?? new Map();
    const ranges = entries.get(text) ?? [];
    const previous = ranges.at(-1);
    if (previous?.endMs === startMs) previous.endMs = endMs;
    else ranges.push({startMs,endMs});
    entries.set(text,ranges);
    sharedDirections.set(section,entries);
  }
  let opening;
  if (setting) fields.SCENE.push(setting);
  if (scene.blockingMap) fields.CONTINUITY.push('Spatial anchors govern continuity. Frame only the scripted visible action.', scene.blockingMap);
  if (scene.audioIntent && (!seedance || ordered.length === scene.shots.length)) fields.AUDIO.push(scene.audioIntent);
  for (const [index, shot] of ordered.entries()) {
    const part = parts[index];
    const {startMs,endMs} = timing[index];
    if (seedance && index === 0) {
      opening = part.opening || part.scene || part.camera;
      if (!opening && part.timeline[0]?.description) opening = `Begin just before this action: ${part.timeline[0].description}`;
    }
    const interval = span(startMs,endMs);
    const scoped = body => body && `${interval} — ${body}`;
    const {missingCharacters, ...fingerprintedPart} = part;
    const sourceFingerprint = hash(['merged-story-v1', template, spokenLanguage, skillInstructions, direction, aspect,
      setting, scene.lighting, scene.artDirection, ...(scene.blockingMap ? [scene.blockingMap] : []), ...(seedance ? [scene.entryState,scene.objective,scene.exitState,scene.synopsis] : []), ...(scene.audioIntent ? [scene.audioIntent] : []), shot.shotDocument, {...fingerprintedPart,
        ...(missingCharacters.length ? {missingCharacters} : {}),
        references:part.references.map(r => [r.role, r.assetId, r.name])}]);
    shots.push({id:shot.id, title:shot.title, startMs, endMs, version:shot.version || 1, sourceFingerprint});
    for (const person of part.people) {
      const ref = references.find(r => r.role === 'character' && r.assetId === person.referenceId && r.name === person.name);
      addDirection('CHARACTER IDENTIFICATION',[person.name, !seedance && person.role, ref && `Reference ${ref.number}`,
        !person.visible && 'Voice only, off-screen.'].filter(Boolean).join(' — '),index);
    }
    addDirection('SCENE',part.scene,index);
    if (seedance) fields.CAMERA.push(`Shot ${index + 1}`);
    fields.CAMERA.push(scoped(part.camera || (seedance && 'Frame the scripted action clearly.')));
    fields.CONTINUITY.push(scoped(part.continuity));
    const events = part.timeline.map(event => seedance ? seedanceAction(event,startMs,part.durationMs,exact) : ({
      ms:startMs + event.startMs, text:`${span(startMs + event.startMs, startMs + event.endMs)} — ${event.description}`
    }));
    for (const cue of part.cues) {
      const ms = startMs + (cue.startOffsetMs || 0);
      const clock = cue.estimatedDurationMs > 0 ? span(ms, ms + cue.estimatedDurationMs) : `${seconds(ms)}s`;
      const speaker = cue.speaker + (cue.speakerVisible === false || cue.offscreenVoiceRole ? ' (off-screen)' : '');
      events.push({ms, text:`[${clock}] ${speaker}: “${cue.text}”`});
      if (cue.delivery) fields.VOICE.push(`[${clock}] ${speaker} — ${cue.delivery}`);
      cues.push({...cue, startOffsetMs:ms});
    }
    fields['ACTION TIMELINE'].push(seedance ? `Shot ${index + 1}` : scoped(shot.title || `Shot ${index + 1}`),
      (!seedance || index > 0) && part.opening && `Starting state: ${part.opening}`,
      ...events.sort((a,b) => a.ms - b.ms).map(event => event.text), part.exit);
    if (part.performance) fields.PERFORMANCE.push(seedance ? `Shot ${index + 1}` : scoped(shot.title), rebaseCueLines(part.performance,startMs,seedance,exact));
    if (part.audio) fields.AUDIO.push(...rebaseCueLines(part.audio,startMs,seedance,exact).split('\n').map(line =>
      /^\[\d/.test(line) ? line : scoped(line)));
    for (const cue of part.audioCues) {
      if (cue.description) fields.AUDIO.push(`[${seconds(startMs + (cue.startOffsetMs || 0))}s] ${cue.description}`);
    }
    addDirection('LIGHTING',part.light,index);
    findings.push(...part.findings.map(finding => ({...finding,shotId:shot.id})));
  }
  const frame = references.find(ref => ref.role === 'opening');
  for (const [section,entries] of sharedDirections) {
    for (const [text,ranges] of entries) {
      for (const {startMs,endMs} of ranges) {
        fields[section].push(startMs === 0 && endMs === cursorMs ? text : `${span(startMs,endMs)} — ${text}`);
      }
    }
  }
  const header = storyVideoFrameDirection(template, frame);
  fields['REFERENCE MAPPING'].push(storyVideoReferenceMapping(references));
  fields.CONTINUITY.unshift(templates.video.continuity);
  if (!seedance) {
    fields.PERFORMANCE.push(templates.video.performance);
  }
  fields.VOICE.unshift(`Spoken language: ${spokenLanguage}.`, 'Speak only the supplied dialogue. Preserve the pauses between cues.');
  if (!seedance || !fields.AUDIO.length) fields.AUDIO.push('No music.');
  if (!seedance || ordered.length === scene.shots.length) fields.LIGHTING.unshift(scene.lighting, scene.artDirection);
  if (seedance && project.writingSettings?.direction?.visualStyle) fields.LIGHTING.push(storyVisualStyle(project.writingSettings).instruction);
  fields['ENVIRONMENT MOVEMENT'].push(templates.video.environmentMovement);
  fields.NEGATIVE.push(templates.video.negative);
  const sectionOrder = seedance ? [...templates.video.sections.filter(name => name !== 'CONTINUITY' && name !== 'NEGATIVE'),
    'CONTINUITY','NEGATIVE'] : templates.video.sections;
  const sections = sectionOrder.map(title => {
    const body = lines(...fields[title]);
    return body && `[${title}]\n${body}`;
  });
  const cutPlan = seedance && `${shots.length} shots. Shot boundaries: ${shots.slice(1).map(shot => `${clock.seconds(shot.startMs)}s`).join(', ')}.`;
  const draft = [storyVisualTarget(references), header, `Duration: ${seconds(cursorMs)} seconds. ${aspect || ''}`.trim(), seedance && lines(cutPlan,templates.seedance.editing),
    opening && `Opening-frame basis: ${opening}`, ...sections, direction,
    !seedance && skillInstructions.length && `[WRITING DIRECTION]\n${lines(...skillInstructions)}`].filter(Boolean).join('\n\n');
  const text = withStoryVideoReferenceNote(exact ? draft : formatStoryPromptWholeSeconds(draft));
  const missingCharacters = [...new Set(parts.flatMap(part => part.missingCharacters))];
  return {template, text, missingCharacters, ready:!missingCharacters.length && (template !== 'flow' || Boolean(frame)),
    sourceFingerprint:hash([text, shots.map(s => [s.id,s.sourceFingerprint])]), shots, references, cues, findings};
}
