import { createHash } from 'node:crypto';
import templates from '../../config/cinematic/story-shot-templates.v1.json' with { type: 'json' };
import { resolveShotCastIds } from './CinematicCastCoverage.js';
import { projectVideoDirection } from './CinematicProjectVideoDirection.js';
import { storySpokenLanguage, storyVisualStyle } from '../../config/storyWritingSettings.js';
import {formatStoryPromptWholeSeconds, rebaseDirectionClocks} from './StoryPromptFormatting.js';

const joined = (...parts) => parts.filter(part => typeof part === 'string' && part.trim()).join('\n');
const block = (title, text) => text ? `[${title}]\n${text}` : '';
const seconds = milliseconds => Number((milliseconds / 1000).toFixed(3));
const referenceRoleOrder = ['location','character','opening'];
const referenceNames = new Intl.Collator('th', {sensitivity:'base', numeric:true});

export function orderStoryPromptReferences(references) {
  const seen = new Set();
  return [...references].sort((first, second) =>
    referenceRoleOrder.indexOf(first.role) - referenceRoleOrder.indexOf(second.role)
    || referenceNames.compare(first.name,second.name) || referenceNames.compare(first.assetId,second.assetId))
    .filter(ref => {
      const key = JSON.stringify([ref.role, ref.assetId, ref.role === 'character' ? ref.name : null]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((ref,index)=>({...ref,number:index+1}));
}

export function storyPromptKind(value) {
  return ['still', 'flow', 'seedance'].includes(value);
}

export function storyPromptPeople(project, scene, shot, shotOnly = false, cues = []) {
  const bindings = shot.speakerBindings;
  const ids = [
    ...(shotOnly || bindings?.length ? (shot.castMode === 'none' ? [] : shot.castAssignmentIds || []) : resolveShotCastIds(scene, shot)),
    ...(bindings || []).map(item => item.castAssignmentId),
    ...cues.map(cue => cue.speakerCastAssignmentId)
  ];
  return (project.castAssignments || []).filter(person => person.active !== false && ids.includes(person.id))
    .map(person => {
      const binding = bindings?.find(item => item.castAssignmentId === person.id);
      const spoken = cues.filter(cue => cue.speakerCastAssignmentId === person.id);
      return {person, visible:binding ? binding.visible !== false : !spoken.length || spoken.some(cue => cue.speakerVisible !== false)};
    });
}

export function storyPromptReferences(scene, shot, people, includeOpening) {
  const references = [];
  function add(role, name, media) {
    if (media?.assetId && media.imageUrl) references.push({
      role, name, assetId: media.assetId, imageUrl: media.imageUrl
    });
  }
  if (includeOpening) add('opening', shot.title, shot.approvedStoryboardSource);
  if (scene.environmentReferenceEnabled !== false) add('location', scene.location || scene.title, scene.approvedEnvironmentSource);
  for (const {person, visible} of people) if (visible) add('character', person.displayName, person.storyReference);
  return orderStoryPromptReferences(references);
}

export function missingCharacterReferences(people) {
  return people.filter(({person,visible}) => visible && !(person.storyReference?.assetId && person.storyReference.imageUrl))
    .map(({person}) => person.displayName);
}

function storyReferenceText(references) {
  return references.map(ref => `Reference ${ref.number} — ${ref.name}: ${templates.referenceRoles[ref.role]}.`).join('\n');
}

export function storyVideoReferenceMapping(references) {
  if (!references.length) return '';
  return joined(templates.video.referenceNote, storyReferenceText(references),
    references.some(ref => ref.role === 'location' || ref.role === 'character') && templates.video.visualReferences);
}

export function storyVisualTarget(references) {
  return block('VISUAL TARGET', joined(templates.video.visualTarget,
    references.some(ref=>ref.role !== 'opening') && templates.video.illustratedReferences));
}

export function storyVideoFrameDirection(kind, openingFrame) {
  const opening = openingFrame && (kind === 'flow'
    ? joined(templates.flow.opening, `Assign Reference ${openingFrame.number} to the opening-frame slot.`)
    : templates.seedance.withFrame.replace('{number}',openingFrame.number));
  return joined(opening || templates.video.withoutOpening,
    openingFrame && templates.video.exactFrameSource, templates.video.closing);
}

export function withStoryVideoReferenceNote(prompt) {
  const note = block('REFERENCE NOTE', templates.video.fictionalCharacterNote);
  return [note, prompt, note].join('\n\n');
}

// A portable authoring packet describes the exact ordered files the user should attach externally.
// Provider dispatch and its identity/eligibility checks remain behind the production workflow.
export function compileStoryPromptPacket(project, scene, shot, prepared, kind, skillInstructions = []) {
  if (!storyPromptKind(kind)) throw new TypeError('Unknown story prompt template');
  const {sections, opening, timeline, dialogue} = prepared;
  const cues = dialogue.cues.length || sections.dialoguePerformance ? dialogue.cues : (shot.dialogueCues || []);
  const people = storyPromptPeople(project, scene, shot, kind === 'seedance', cues);
  const references = storyPromptReferences(scene, shot, people, kind !== 'still');
  const characters = people.map(({person, visible}, i) =>
    `Character ${i + 1}: ${person.displayName}. ${kind !== 'seedance' && person.storyRole || ''} ${visible ? '' : 'Voice only, off-screen.'}`.trim()).join('\n');
  const direction = project.writingSettings?.direction || {};
  const aspect = direction.aspectRatio || project.aspectRatio || project.setup?.aspectRatio;
  const location = joined(scene.location, scene.time, scene.weather, scene.environmentPrompt, scene.synopsis || scene.storyChange, sections.scene);
  const start = joined(shot.continuityEntry, opening || shot.visibleMoment || shot.blocking);
  const end = joined(shot.continuityExit, shot.transitionToNext);
  const light = joined(scene.artDirection, scene.lighting, shot.artDirection || sections.lighting || shot.lighting) || 'Match the established direction of light and preserve visible shadow detail.';
  const camera = joined(shot.framing, shot.cameraAngle, shot.lensIntent);
  const duration = seconds(shot.durationMs);
  let prompt;
  if (kind === 'still') {
    const fields = {
      SCENE: joined(scene.location, scene.time, scene.weather, scene.environmentPrompt || scene.artDirection,
        scene.blockingMap && 'Use these positions to compose the visible opening frame.', scene.blockingMap),
      SUBJECT: joined(sections.opening || shot.continuityEntry || shot.visibleMoment || shot.blocking || sections.scene?.split('\n')[0],
        people.filter(p => p.visible).map(p => p.person.displayName).join(', ')) || scene.synopsis || shot.title,
      CAMERA: joined(camera, shot.cameraDirectionNotes) || 'Keep the focal subject clear and leave space for the intended movement.',
      LIGHT: light, 'MATERIAL AND CONTACT': templates.still.material, PRESERVE: storyReferenceText(references), AVOID: templates.still.avoid
    };
    prompt = [storyVisualTarget(references), templates.still.opening, aspect, ...templates.still.sections.map(title => block(title, fields[title]))];
  } else {
    const frame = references.find(ref => ref.role === 'opening');
    const beats = timeline.length ? timeline : (shot.videoActionTimeline || []);
    const events = beats.map(event => ({time:event.startMs, text:kind === 'flow' ? event.description
      : `${seconds(event.startMs)}–${seconds(event.endMs)}s — ${rebaseDirectionClocks(event.description)}`}));
    if (!events.length) events.push({time:0, text:joined(kind === 'seedance' ? `0–${duration}s` : '', shot.subjectAction || shot.visibleMoment || sections.timeline || sections.scene)});
    for (const cue of cues) {
      const speaker = people.find(({person}) => person.id === cue.speakerCastAssignmentId)?.person.displayName || cue.offscreenVoiceRole;
      const clock = kind === 'seedance' ? `[${seconds(cue.startOffsetMs)}s] ` : '';
      events.push({time:cue.startOffsetMs, text:`${clock}${speaker || 'Speaker'}: “${cue.text}”`});
    }
    const fields = {
      'REFERENCE MAPPING': storyVideoReferenceMapping(references),
      CONTINUITY: joined(templates.video.continuity, sections.continuity, scene.blockingMap && 'Spatial anchors govern continuity. Frame only the scripted visible action.', scene.blockingMap),
      'CHARACTER IDENTIFICATION': characters || (kind === 'flow' && 'No assigned characters. Preserve the subjects described in the scene.'),
      SCENE: kind === 'seedance' ? joined(scene.location,scene.time,scene.weather,sections.scene) : location || shot.title,
      CAMERA: joined(sections.camera || joined(camera, shot.cameraMovement), shot.gaze, shot.cameraDirectionNotes) || 'Keep the focal action readable.',
      'ACTION TIMELINE': joined(...events.sort((first, second) => first.time - second.time).map(event => event.text), end),
      PERFORMANCE: joined(dialogue.performance, shot.performanceCue || shot.performance, shot.emotionalTarget, templates.video.performance),
      VOICE: cues.length ? joined(`Spoken language: ${storySpokenLanguage(project.writingSettings)}.`,
        ...cues.map(cue => cue.delivery), 'Speak only the supplied dialogue verbatim.') : 'Preserve any supplied dialogue verbatim. Add no new speech or narration.',
      AUDIO: joined(kind === 'flow' && scene.audioIntent, sections.audio || shot.audioIntent) || 'No music.',
      LIGHTING: kind === 'seedance' ? joined(shot.artDirection || sections.lighting || shot.lighting,
        direction.visualStyle && storyVisualStyle(project.writingSettings).instruction) : light,
      'ENVIRONMENT MOVEMENT': templates.video.environmentMovement, NEGATIVE: templates.video.negative
    };
    const header = joined(storyVideoFrameDirection(kind, frame), kind === 'flow' && templates.flow.camera);
    prompt = [storyVisualTarget(references), header, `Duration: ${duration} seconds. ${aspect || ''}`.trim(),
      start && `Starting state: ${start}`, ...templates.video.sections.map(title => block(title, fields[title])),
      projectVideoDirection(project), kind === 'seedance' && aspect];
  }
  const rendered = [...prompt, kind !== 'seedance' && skillInstructions.length && block('WRITING DIRECTION', skillInstructions.join('\n'))].filter(Boolean).join('\n\n');
  const text = kind === 'still' ? rendered : withStoryVideoReferenceNote(formatStoryPromptWholeSeconds(rendered));
  const context = kind === 'seedance' ? [scene.entryState,scene.objective,scene.exitState,scene.synopsis,scene.lighting,scene.audioIntent] : undefined;
  const sourceFingerprint = createHash('sha256').update(JSON.stringify(['english-directions-v1', storySpokenLanguage(project.writingSettings), kind, text, references.map(r => r.assetId), ...(context ? [context] : [])])).digest('hex');
  const missingCharacters = missingCharacterReferences(people);
  return {kind, text, sourceFingerprint, references, missingCharacters,
    ready: !missingCharacters.length && (kind !== 'flow' || references.some(r => r.role === 'opening'))};
}
