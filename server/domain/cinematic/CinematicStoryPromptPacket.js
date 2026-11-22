import { createHash } from 'node:crypto';
import templates from '../../config/cinematic/story-shot-templates.v1.json' with { type: 'json' };
import { resolveShotCastIds } from './CinematicCastCoverage.js';
import { projectVideoDirection } from './CinematicProjectVideoDirection.js';
import { storySpokenLanguage } from '../../config/storyWritingSettings.js';

const joined = (...parts) => parts.filter(part => typeof part === 'string' && part.trim()).join('\n');
const block = (title, text) => text ? `[${title}]\n${text}` : '';
const seconds = milliseconds => Number((milliseconds / 1000).toFixed(3));

export function storyPromptKind(value) {
  return ['still', 'flow', 'seedance'].includes(value);
}

export function storyPromptPeople(project, scene, shot) {
  const bindings = shot.speakerBindings;
  const ids = bindings?.map(item => item.castAssignmentId) ?? resolveShotCastIds(scene, shot);
  return (project.castAssignments || []).filter(person => person.active !== false && ids.includes(person.id))
    .map(person => ({person, visible: bindings?.find(item => item.castAssignmentId === person.id)?.visible !== false}));
}

export function storyPromptReferences(scene, shot, people, includeOpening) {
  const references = [];
  function add(role, name, media) {
    if (media?.assetId && media.imageUrl) references.push({
      number: references.length + 1, role, name, assetId: media.assetId, imageUrl: media.imageUrl
    });
  }
  if (includeOpening) add('opening', shot.title, shot.approvedStoryboardSource);
  if (scene.environmentReferenceEnabled !== false) add('location', scene.location || scene.title, scene.approvedEnvironmentSource);
  for (const {person, visible} of people) if (visible) add('character', person.displayName, person.storyReference);
  return references;
}

export function storyReferenceText(references) {
  return references.map(ref => `Reference ${ref.number} — ${ref.name}: ${{
    opening: 'opening frame, pose and framing', location: 'set geometry, materials and light direction',
    character: 'this character’s face, hair and wardrobe'
  }[ref.role]}.`).join('\n');
}

// A portable authoring packet describes the exact ordered files the user should attach externally.
// Provider dispatch and its identity/eligibility checks remain behind the production workflow.
export function compileStoryPromptPacket(project, scene, shot, prepared, kind, skillInstructions = []) {
  if (!storyPromptKind(kind)) throw new TypeError('Unknown story prompt template');
  const people = storyPromptPeople(project, scene, shot);
  const references = storyPromptReferences(scene, shot, people, kind !== 'still');
  const referenceText = storyReferenceText(references);
  const characters = people.map(({person, visible}, i) =>
    `Character ${i + 1}: ${person.displayName}. ${person.storyRole || ''} ${visible ? '' : 'Voice only, off-screen.'}`.trim()).join('\n');
  const {sections, opening, timeline, dialogue} = prepared;
  const direction = project.writingSettings?.direction || {};
  const aspect = direction.aspectRatio || project.aspectRatio || project.setup?.aspectRatio;
  const location = joined(scene.location, scene.time, scene.weather, scene.environmentPrompt, scene.synopsis || scene.storyChange, sections.scene);
  const start = joined(shot.continuityEntry, opening || shot.visibleMoment || shot.blocking);
  const end = joined(shot.continuityExit, shot.transitionToNext);
  const light = joined(shot.lighting || scene.lighting, scene.artDirection, shot.artDirection) || 'Match the established direction of light and preserve visible shadow detail.';
  const camera = joined(shot.framing, shot.cameraAngle, shot.lensIntent);
  const cues = dialogue.cues.length || sections.dialoguePerformance ? dialogue.cues : (shot.dialogueCues || []);
  const duration = seconds(shot.durationMs);
  let prompt;
  if (kind === 'still') {
    const fields = {
      SCENE: joined(scene.location, scene.time, scene.weather, scene.environmentPrompt || scene.artDirection),
      SUBJECT: joined(sections.opening || shot.continuityEntry || shot.visibleMoment || shot.blocking || sections.scene?.split('\n')[0],
        people.filter(p => p.visible).map(p => p.person.displayName).join(', ')) || scene.synopsis || shot.title,
      CAMERA: camera || 'Keep the focal subject clear and leave space for the intended movement.',
      LIGHT: light, 'MATERIAL AND CONTACT': templates.still.material, PRESERVE: referenceText, AVOID: templates.still.avoid
    };
    prompt = [templates.still.opening, aspect, ...templates.still.sections.map(title => block(title, fields[title]))];
  } else {
    const frame = references.some(ref => ref.role === 'opening');
    const beats = timeline.length ? timeline : (shot.videoActionTimeline || []);
    const events = beats.map(event => ({time:event.startMs, text:kind === 'flow' ? event.description
      : `${seconds(event.startMs)}–${seconds(event.endMs)}s — ${event.description}`}));
    if (!events.length) events.push({time:0, text:joined(kind === 'seedance' ? `0–${duration}s` : '', shot.subjectAction || shot.visibleMoment || sections.timeline || sections.scene)});
    for (const cue of cues) {
      const speaker = people.find(({person}) => person.id === cue.speakerCastAssignmentId)?.person.displayName || cue.offscreenVoiceRole;
      const clock = kind === 'seedance' ? `[${seconds(cue.startOffsetMs)}s] ` : '';
      events.push({time:cue.startOffsetMs, text:`${clock}${speaker || 'Speaker'}: “${cue.text}”`});
    }
    const fields = {
      'PRESERVE EXACTLY': joined(referenceText, templates.video.preserve, sections.continuity),
      'CHARACTER IDENTIFICATION': characters || 'No assigned characters. Preserve the subjects described in the scene.',
      SCENE: location || shot.title,
      CAMERA: joined(sections.camera || joined(camera, shot.cameraMovement), shot.gaze) || 'Keep the focal action readable.',
      'ACTION TIMELINE': joined(...events.sort((first, second) => first.time - second.time).map(event => event.text), end),
      PERFORMANCE: joined(dialogue.performance, shot.performanceCue || shot.performance, shot.emotionalTarget, templates.video.performance),
      VOICE: cues.length ? joined(`Spoken language: ${storySpokenLanguage(project.writingSettings)}.`,
        ...cues.map(cue => cue.delivery), 'Speak only the supplied dialogue verbatim.') : 'Preserve any supplied dialogue verbatim. Add no new speech or narration.',
      AUDIO: joined(sections.audio || shot.audioIntent || 'Keep location ambience low.', 'No music.'),
      LIGHTING: light, 'ENVIRONMENT MOVEMENT': templates.video.environmentMovement, NEGATIVE: templates.video.negative
    };
    const header = kind === 'flow' ? joined(templates.flow.opening, templates.flow.camera)
      : joined(references.length && block('REFERENCE NOTE', templates.seedance.referenceNote),
        frame ? templates.seedance.withFrame : templates.seedance.withoutFrame);
    prompt = [header, `Duration: ${duration} seconds. ${aspect || ''}`.trim(),
      start && `Starting state: ${start}`, ...templates.video.sections.map(title => block(title, fields[title])),
      projectVideoDirection(project), kind === 'seedance' && aspect];
  }
  const text = [...prompt, skillInstructions.length && block('WRITING DIRECTION', skillInstructions.join('\n'))].filter(Boolean).join('\n\n');
  const sourceFingerprint = createHash('sha256').update(JSON.stringify(['english-directions-v1', storySpokenLanguage(project.writingSettings), kind, text, references.map(r => r.assetId)])).digest('hex');
  return {kind, text, sourceFingerprint, references, ready: kind !== 'flow' || references.some(r => r.role === 'opening')};
}
