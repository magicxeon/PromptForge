import crypto from 'node:crypto';
import { projectVideoDirection } from './CinematicProjectVideoDirection.js';
import { resolveShotCastIds } from './CinematicCastCoverage.js';
import { estimateDialogueSpeech, assessDialogueShot } from './CinematicDialogueTiming.js';

const SECTION_ALIASES = Object.freeze({
  'SHOT DURATION': 'duration',
  SCENE: 'scene',
  OPENING: 'opening',
  'OPENING FRAME': 'opening',
  'FIRST FRAME': 'opening',
  CAMERA: 'camera',
  'PERFORMANCE AND TIMELINE': 'timeline',
  'DIALOGUE AND FACIAL PERFORMANCE': 'dialoguePerformance',
  AUDIO: 'audio',
  'CONTINUITY AND CONSTRAINTS': 'continuity'
});

export function compileCinematicShotDocument(shot, scene = {}, cast = []) {
  const source = String(shot?.shotDocument || '').trim();
  if (!source || shot?.manualStoryboard === true) return null;
  const sections = parseSections(source);
  const timeline = parseTimeline(sections.timeline, Number(shot.durationMs || 0));
  const firstEvent = timeline[0]?.description || '';
  const lastEvent = timeline.at(-1)?.description || '';
  const opening = compact(sections.opening) || sentences([
    compact(sections.scene),
    firstEvent ? `At time zero, hold the state immediately before this event begins: ${firstEvent}` : ''
  ]);
  const primaryAction = compact(sections.timeline) || firstEvent;
  const continuityNotes = lines(sections.continuity);
  const dialogue = compileDialogue(sections.dialoguePerformance, shot, scene, cast);
  const audioIntent = [dialogue.performance, sections.audio].map(compact).filter(Boolean).join(' ');
  const timing = assessDialogueShot({ ...shot, dialogueCues: dialogue.cues, performance: dialogue.performance });

  return {
    source,
    sections,
    timeline,
    opening,
    primaryAction,
    dialogue,
    timing,
    creatorPrompt: [
      `One continuous ${Number(shot.durationMs || 0) / 1000}-second photorealistic live-action shot.`,
      sections.scene && `SCENE\n${sections.scene}`,
      opening && `OPENING\n${opening}`,
      sections.camera && `CAMERA\n${sections.camera}`,
      sections.timeline && `ACTION\n${sections.timeline}`,
      dialogue.cues.length && `DIALOGUE\n${dialogue.cues.map(cue => {
        const person = cast.find(item => item.id === cue.speakerCastAssignmentId);
        return `[${cue.startOffsetMs / 1000}s] ${person?.displayName || cue.offscreenVoiceRole}${cue.speakerVisible ? '' : ' (off-screen)'}: ${cue.text}${cue.delivery ? `\nDelivery: ${cue.delivery}` : ''}`;
      }).join('\n')}`,
      dialogue.performance && `PERFORMANCE\n${dialogue.performance}`,
      sections.audio && `AUDIO\n${sections.audio}`,
      sections.continuity && `CONTINUITY\n${sections.continuity}`
    ].filter(Boolean).join('\n\n'),
    preparedShot: {
      ...shot,
      openingFrameVersion: 1,
      visibleMoment: opening,
      subjectAction: primaryAction,
      emotionalTarget: '',
      performance: '',
      performanceCue: '',
      gaze: '',
      cameraMovement: compact(sections.camera),
      audioIntent,
      audioDirectionVersion: 1,
      dialogueCues: dialogue.cues,
      audioCues: [],
      continuityEntry: opening,
      continuityExit: lastEvent,
      transitionToNext: '',
      continuityNotes,
      prompt: '',
      shotDocumentAuthority: true
    }
  };
}

export function shotPromptSourceFingerprint(project, scene, shot) {
  const ids = new Set([...(shot.speakerBindings || []).map(item => item.castAssignmentId), ...resolveShotCastIds(scene, shot)]);
  return crypto.createHash('sha256').update(JSON.stringify(stableValue({
    ...(projectVideoDirection(project) ? { projectVideoDirection: projectVideoDirection(project) } : {}),
    document: shot.shotDocument || '', durationMs: shot.durationMs,
    bindings: shot.speakerBindings || resolveShotCastIds(scene, shot).map(id => ({
      castAssignmentId: id, alias: (project.castAssignments || []).find(item => item.id === id)?.displayName || id, visible: true
    })), visibleCast: resolveShotCastIds(scene, shot),
    characters: (project.castAssignments || []).filter(item => ids.has(item.id)).map(item => ({
      id: item.id, name: item.displayName, active: item.active, voice: item.dialogueStyle,
      looks: item.looks, generatedSheet: item.generatedSheet, profileVersion: item.characterProfileVersionId
    })),
    looks: shot.wardrobeLookIds, sceneLooks: scene.wardrobeLookIds,
    scene: [scene.location, scene.time, scene.weather, scene.lighting, scene.castMode, scene.castAssignmentIds],
    environment: scene.approvedEnvironmentSource?.sourceFingerprint,
    environmentEnabled: scene.environmentReferenceEnabled,
    frame: shot.approvedStoryboardSource?.sourceFingerprint, referenceMode: shot.videoReferenceMode
  }))).digest('hex');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function compileDialogue(value, shot, scene, cast) {
  const bindings = shot.speakerBindings || resolveShotCastIds(scene, shot).map(id => ({
    alias: cast.find(item => item.id === id)?.displayName || id, castAssignmentId: id, visible: true
  }));
  const cues = [];
  const findings = [];
  const performance = [];
  let cursorMs = 0;
  for (const [index, raw] of String(value || '').split('\n').entries()) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^(?:\[([^\]]+)\]\s*)?([^:()]+?)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$/u);
    if (!match) { performance.push(raw); continue; }
    const [, range, name, delivery = '', words] = match;
    const alias = name.trim();
    if (/^(gaze|performance|reaction|listener|emotion|delivery|pause|silence|no dialogue)$/iu.test(alias)) {
      performance.push(raw); continue;
    }
    const matches = bindings.filter(item => item.alias === alias);
    const binding = matches.length === 1 ? matches[0] : null;
    const person = cast.find(item => item.id === binding?.castAssignmentId && item.active !== false);
    if (!person) {
      findings.push({ code: 'cinematic_dialogue_speaker_unresolved', line: index + 1, speaker: alias });
      performance.push(raw);
      continue;
    }
    const times = range?.replace(/\s*(sec|seconds|s)\s*$/iu, '').split(/\s*[-\u2013\u2014]\s*/u);
    const startOffsetMs = times ? timeMs(times[0]) : cursorMs;
    const effectiveDelivery = [person.dialogueStyle, delivery].filter(Boolean).join('; ');
    const estimate = estimateDialogueSpeech(words, { delivery: effectiveDelivery });
    const endMs = times?.[1] ? timeMs(times[1]) : startOffsetMs + estimate.maximumMs;
    if (!Number.isFinite(startOffsetMs) || !Number.isFinite(endMs) || endMs <= startOffsetMs) {
      findings.push({ code: 'cinematic_dialogue_timing_invalid', line: index + 1, speaker: alias });
      performance.push(raw); continue;
    }
    cues.push({ speakerCastAssignmentId: person.id, offscreenVoiceRole: '', text: words,
      delivery: effectiveDelivery, startOffsetMs, estimatedDurationMs: endMs - startOffsetMs,
      speakerVisible: binding.visible !== false });
    cursorMs = endMs;
  }
  return { cues, findings, performance: performance.join('\n') };
}

function parseSections(source) {
  const sections = Object.fromEntries([...new Set(Object.values(SECTION_ALIASES))].map(key => [key, '']));
  let active = 'scene';
  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = splitHeading(rawLine);
    if (heading) {
      active = SECTION_ALIASES[heading.name];
      if (heading.value) sections[active] = `${sections[active]}\n${heading.value}`.trim();
      continue;
    }
    sections[active] = `${sections[active]}\n${rawLine}`.trim();
  }
  return sections;
}

function parseTimeline(value, durationMs) {
  const events = [];
  let current = null;
  for (const rawLine of String(value || '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^\[?\s*(\d+(?::\d{1,2}(?:\.\d{1,3})?|\.\d+)?)\s*(?:s|sec|seconds)?\s*(?:-|\u2013|\u2014)\s*(\d+(?::\d{1,2}(?:\.\d{1,3})?|\.\d+)?)\s*(?:s|sec|seconds)?\s*\]?\s*:?[ \t]*(.*)$/iu);
    if (match) {
      current = { startMs: timeMs(match[1]), endMs: timeMs(match[2]), description: compact(match[3]) };
      events.push(current);
    } else if (current) {
      current.description = sentences([current.description, line]);
    }
  }
  const valid = events.filter(event => Number.isFinite(event.startMs) && Number.isFinite(event.endMs)
    && event.startMs >= 0 && event.endMs > event.startMs && event.description);
  if (valid.length || !compact(value)) return valid;
  return [{ startMs: 0, endMs: Math.max(500, durationMs || 5000), description: compact(value) }];
}

function timeMs(value) {
  const normalized = String(value || '').trim();
  if (!normalized.includes(':')) return Math.round(Number(normalized) * 1000);
  const [minutes, seconds] = normalized.split(':');
  return Math.round((Number(minutes) * 60 + Number(seconds)) * 1000);
}

function normalizeHeading(value) {
  return String(value || '').trim().replace(/:$/, '').replace(/\s+/g, ' ').toUpperCase();
}

function splitHeading(value) {
  const line = String(value || '').trim();
  const inline = line.match(/^([^:]+):\s*(.*)$/u);
  if (inline) {
    const name = normalizeHeading(inline[1]);
    if (SECTION_ALIASES[name]) return { name, value: inline[2].trim() };
  }
  const name = normalizeHeading(line);
  return SECTION_ALIASES[name] ? { name, value: '' } : null;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentences(values) {
  return values.map(compact).filter(Boolean).join(' ');
}

function lines(value) {
  return [...new Set(String(value || '').split('\n').map(compact).filter(Boolean))];
}
