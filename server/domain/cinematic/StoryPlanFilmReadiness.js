const LOCATION_GROUPS = Object.freeze({
  station: ['station', 'platform', 'train', 'railway', 'tracks', 'สถานี', 'ชานชาลา', 'รถไฟ', 'รางรถไฟ'],
  cafe: ['cafe', 'café', 'coffee shop', 'coffeehouse', 'ร้านกาแฟ', 'คาเฟ่'],
  office: ['office', 'workplace', 'สำนักงาน', 'ออฟฟิศ'],
  school: ['school', 'classroom', 'university', 'โรงเรียน', 'ห้องเรียน', 'มหาวิทยาลัย'],
  home: ['home', 'house', 'apartment', 'บ้าน', 'อพาร์ตเมนต์'],
  beach: ['beach', 'seaside', 'coast', 'ชายหาด', 'ริมทะเล']
});

const DIMENSIONS = Object.freeze([
  'story', 'script', 'performance', 'visual', 'editorial', 'audio', 'continuity', 'production'
]);

export function analyzeStoryPlanSource(project, { sourceResolution = null } = {}) {
  const storyBrief = String(project?.setup?.storyBrief || '').trim();
  const creativeDirection = String(project?.setup?.creativeDirection || '').trim();
  const duplicate = normalizeRepeatedSource(storyBrief);
  const diagnostics = [];

  if (!storyBrief) {
    diagnostics.push(diagnostic(
      'story_source_empty', 'blocking', 'setup.storyBrief',
      'Story Brief is required before directing a Story Plan.',
      'Return to Setup and add the complete story.', false, true
    ));
  }

  if (duplicate.changed) {
    diagnostics.push(diagnostic(
      'story_source_duplicate', 'blocking', 'setup.storyBrief',
      'The Story Brief repeats an earlier passage.',
      'Review the deduplicated Story Brief or explicitly use Story Brief as the generation authority.', true, true
    ));
  }

  if (hasUnclosedQuote(storyBrief)) {
    diagnostics.push(diagnostic(
      'story_source_likely_truncated', 'blocking', 'setup.storyBrief',
      'The Story Brief appears to end inside an unfinished quotation.',
      'Complete the missing text or confirm a deterministic complete passage as the authority.', duplicate.changed, true
    ));
  }

  const storyLocations = findLocationGroups(duplicate.normalized || storyBrief);
  const directionLocations = findLocationGroups(creativeDirection);
  if (storyLocations.length && directionLocations.length && !storyLocations.some(value => directionLocations.includes(value))) {
    diagnostics.push({
      ...diagnostic(
        'story_source_location_conflict', 'blocking', 'setup.creativeDirection',
        `Story Brief and Creative Direction describe different locations (${storyLocations.join(', ')} / ${directionLocations.join(', ')}).`,
        'Choose which source controls this Plan or reconcile the fields in Setup.', false, true
      ),
      comparedPath: 'setup.storyBrief'
    });
  }

  const storyText = normalizeForSearch(duplicate.normalized || storyBrief);
  for (const role of project?.setup?.storyRoleSlots || []) {
    const direction = [role.objective, role.storyFunction, role.relationshipHint, role.emotionalArc]
      .filter(Boolean).join(' ');
    const roleLocations = findLocationGroups(direction);
    const staleLocations = roleLocations.filter(value => !storyLocations.includes(value) && !storyText.includes(value));
    if (staleLocations.length) {
      diagnostics.push({
        ...diagnostic(
          'story_role_direction_may_be_stale', 'warning', `setup.storyRoleSlots.${role.id}`,
          `Role direction refers to a location absent from the Story Brief (${staleLocations.join(', ')}).`,
          'Review this Role in Setup. The AI Director will not treat the stale location as current authority.', false, false
        ),
        entityId: role.id
      });
    }
  }

  const normalizedStoryBrief = duplicate.normalized || storyBrief;
  const resolvedCodes = new Set();
  let resolvedCreativeDirection = creativeDirection;
  let resolvedStoryBrief = normalizedStoryBrief;

  if (sourceResolution === 'story_brief') {
    for (const item of diagnostics) {
      if (['story_source_duplicate', 'story_source_likely_truncated', 'story_source_location_conflict'].includes(item.code)) {
        resolvedCodes.add(item.code);
      }
    }
    if (directionLocations.length && storyLocations.length
      && !storyLocations.some(value => directionLocations.includes(value))) {
      resolvedCreativeDirection = '';
    }
  } else if (sourceResolution === 'creative_direction' && creativeDirection) {
    resolvedStoryBrief = creativeDirection;
    resolvedCreativeDirection = '';
    for (const item of diagnostics) {
      if (item.code !== 'story_source_empty') resolvedCodes.add(item.code);
    }
  }

  const resolvedDiagnostics = diagnostics.map(item => ({ ...item, resolved: resolvedCodes.has(item.code) }));
  const unresolvedBlockers = resolvedDiagnostics.filter(item => item.severity === 'blocking' && !item.resolved);
  return {
    status: unresolvedBlockers.length ? 'blocked' : 'ready',
    diagnostics: resolvedDiagnostics,
    sourceResolution,
    resolvedStoryBrief,
    resolvedCreativeDirection,
    storyLocations,
    directionLocations
  };
}

export function evaluateStoryPlanFilmReadiness(project, plan, { preflight = null, aiFindings = [] } = {}) {
  const findings = [];
  const activeCastIds = new Set((project?.castAssignments || []).filter(item => item.active !== false).map(item => item.id));
  const scenes = Array.isArray(plan?.scenes) ? plan.scenes : [];
  const beats = Array.isArray(plan?.beats) ? plan.beats : [];

  for (const item of preflight?.diagnostics || []) {
    if (item.severity === 'blocking' && !item.resolved) {
      findings.push(finding(item.code, 'story', 'blocking', item.summary, item.recoveryAction));
    } else if (!item.resolved && item.severity === 'warning') {
      findings.push(finding(item.code, 'story', 'warning', item.summary, item.recoveryAction));
    }
  }

  if (!beats.length) findings.push(finding('film_story_beats_required', 'story', 'blocking', 'At least one Story Beat is required.', 'Add a Beat before approval.'));
  for (const beat of beats) {
    if (!String(beat.cause || '').trim()) findings.push(finding('film_beat_cause_required', 'story', 'blocking', `Beat "${beat.title || beat.id}" has no entering cause.`, 'Describe what causes this Beat.', { beatId: beat.id }));
    if (!String(beat.consequence || '').trim()) findings.push(finding('film_beat_consequence_required', 'story', 'blocking', `Beat "${beat.title || beat.id}" has no outgoing consequence.`, 'Describe what changes because of this Beat.', { beatId: beat.id }));
  }

  if (!scenes.length) findings.push(finding('film_scenes_required', 'story', 'blocking', 'At least one Scene is required.', 'Add a Scene before approval.'));
  const allShots = [];
  for (const scene of scenes) {
    if (!String(scene.entryState || '').trim()) findings.push(finding('film_scene_entry_required', 'continuity', 'blocking', `Scene "${scene.title || scene.id}" has no entry state.`, 'Describe the visible state at the start of the Scene.', { sceneId: scene.id }));
    if (!String(scene.exitState || '').trim()) findings.push(finding('film_scene_exit_required', 'continuity', 'blocking', `Scene "${scene.title || scene.id}" has no exit state.`, 'Describe the visible state handed to the next Scene.', { sceneId: scene.id }));
    for (const castId of scene.castAssignmentIds || []) {
      if (!activeCastIds.has(castId)) findings.push(finding('film_scene_cast_invalid', 'production', 'blocking', `Scene "${scene.title || scene.id}" references unavailable Cast.`, 'Choose an active Cast Assignment.', { sceneId: scene.id }));
    }
    const shots = Array.isArray(scene.shots) ? scene.shots : [];
    shots.forEach((shot, shotIndex) => allShots.push({ scene, shot, shotIndex }));
  }

  for (const { scene, shot } of allShots) {
    const context = { sceneId: scene.id, shotId: shot.id };
    if (!String(shot.visibleMoment || '').trim()) findings.push(finding('film_shot_visible_moment_required', 'visual', 'blocking', `Shot "${shot.title || shot.id}" has no exact visible moment.`, 'Describe the one frame Storyboard must depict.', context));
    if (!String(shot.subjectAction || '').trim()) findings.push(finding('film_shot_action_required', 'performance', 'blocking', `Shot "${shot.title || shot.id}" has no primary action.`, 'Add one physically performable action.', context));
    if (!String(shot.emotionalTarget || '').trim()) findings.push(finding('film_shot_emotion_required', 'performance', 'blocking', `Shot "${shot.title || shot.id}" has no observable emotional target.`, 'Add one dominant emotional state and performance cue.', context));
    if (!String(shot.continuityEntry || '').trim()) findings.push(finding('film_shot_entry_required', 'continuity', 'blocking', `Shot "${shot.title || shot.id}" has no continuity entry anchor.`, 'Describe the incoming body, prop, light or screen-direction state.', context));
    if (!String(shot.continuityExit || '').trim()) findings.push(finding('film_shot_exit_required', 'continuity', 'blocking', `Shot "${shot.title || shot.id}" has no continuity exit anchor.`, 'Describe the state handed to the next Shot.', context));
    if (Number(shot.durationMs || 0) > 8000) {
      findings.push(finding(
        'film_shot_portable_duration_review',
        'production',
        'warning',
        `Shot "${shot.title || shot.id}" is longer than the portable eight-second video baseline.`,
        'Confirm one continuous performance is required, or split at a motivated action boundary before Storyboard.',
        context
      ));
    }

    for (const cue of shot.dialogueCues || []) {
      const speakerId = String(cue.speakerCastAssignmentId || '').trim();
      const offscreenRole = String(cue.offscreenVoiceRole || '').trim();
      if (!speakerId && !offscreenRole) findings.push(finding('film_dialogue_speaker_required', 'script', 'blocking', `Dialogue in Shot "${shot.title || shot.id}" has no authorized speaker.`, 'Choose a Cast Assignment or name an off-screen story role.', context));
      if (speakerId && !activeCastIds.has(speakerId)) findings.push(finding('film_dialogue_speaker_invalid', 'script', 'blocking', `Dialogue in Shot "${shot.title || shot.id}" references unavailable Cast.`, 'Choose an active Cast Assignment.', context));
      const endMs = Number(cue.startOffsetMs || 0) + Number(cue.estimatedDurationMs || 0);
      if (endMs > Number(shot.durationMs || 0)) findings.push(finding('film_dialogue_timing_overflow', 'script', 'blocking', `Dialogue exceeds the duration of Shot "${shot.title || shot.id}".`, 'Shorten the line, move it or increase Shot duration.', context));
    }
    for (const cue of shot.audioCues || []) {
      const endMs = Number(cue.startOffsetMs || 0) + Number(cue.durationMs || 0);
      if (endMs > Number(shot.durationMs || 0)) findings.push(finding('film_audio_timing_overflow', 'audio', 'warning', `An audio cue extends beyond Shot "${shot.title || shot.id}".`, 'Confirm intentional overlap or adjust its timing.', context));
    }
  }

  for (const item of Array.isArray(aiFindings) ? aiFindings : []) {
    const severity = item.severity === 'info' ? 'info' : 'warning';
    findings.push(finding(
      String(item.code || 'ai_director_note'),
      DIMENSIONS.includes(item.dimension) ? item.dimension : 'story',
      severity,
      String(item.summary || '').trim(),
      String(item.recommendation || '').trim(),
      { beatId: item.beatId, sceneId: item.sceneId, shotId: item.shotId }
    ));
  }

  const dimensions = Object.fromEntries(DIMENSIONS.map(dimension => {
    const relevant = findings.filter(item => item.dimension === dimension);
    const state = relevant.some(item => item.severity === 'blocking')
      ? 'not_ready'
      : relevant.some(item => item.severity === 'warning') ? 'ready_with_warnings' : 'ready';
    return [dimension, state];
  }));
  const status = findings.some(item => item.severity === 'blocking')
    ? 'not_ready'
    : findings.some(item => item.severity === 'warning') ? 'ready_with_warnings' : 'ready';
  return { status, dimensions, findings };
}

export function buildFilmScriptPreview(plan) {
  let cursorMs = 0;
  return (plan?.scenes || []).flatMap(scene => (scene.shots || []).map(shot => {
    const startMs = cursorMs;
    const endMs = startMs + Number(shot.durationMs || 0);
    cursorMs = endMs;
    return {
      sceneId: scene.id,
      sceneTitle: scene.title,
      shotId: shot.id,
      shotTitle: shot.title,
      startMs,
      endMs,
      visual: String(shot.visibleMoment || shot.prompt || shot.purpose || '').trim(),
      action: String(shot.subjectAction || shot.blocking || '').trim(),
      performance: String(shot.performanceCue || shot.performance || '').trim(),
      dialogue: structuredClone(shot.dialogueCues || []),
      audio: structuredClone(shot.audioCues || []),
      cut: String(shot.transitionToNext || scene.transitionIntent || '').trim()
    };
  }));
}

export function filmReadinessNotEvaluated() {
  return {
    status: 'not_evaluated',
    dimensions: Object.fromEntries(DIMENSIONS.map(dimension => [dimension, 'not_evaluated'])),
    findings: []
  };
}

function normalizeRepeatedSource(value) {
  const text = String(value || '').trim();
  if (text.length < 120) return { changed: false, normalized: text };
  const probeLength = Math.min(64, Math.max(32, Math.floor(text.length / 8)));
  const probe = normalizeForSearch(text.slice(0, probeLength));
  const normalizedText = normalizeForSearch(text);
  const repeatedIndex = normalizedText.indexOf(probe, probe.length + 20);
  if (repeatedIndex < 0) return { changed: false, normalized: text };

  // Whitespace normalization can shift the index slightly; locate a shorter raw prefix.
  const rawProbe = text.slice(0, Math.min(32, text.length));
  const rawIndex = text.indexOf(rawProbe, rawProbe.length + 20);
  const cutIndex = rawIndex >= 0 ? rawIndex : repeatedIndex;
  const candidate = text.slice(0, cutIndex).trim();
  return candidate.length >= 60
    ? { changed: true, normalized: candidate }
    : { changed: false, normalized: text };
}

function hasUnclosedQuote(value) {
  const text = String(value || '');
  const pairs = [['“', '”'], ['‘', '’']];
  if (pairs.some(([open, close]) => count(text, open) !== count(text, close))) return true;
  const straightDouble = count(text, '"');
  return straightDouble % 2 !== 0;
}

function findLocationGroups(value) {
  const text = normalizeForSearch(value);
  return Object.entries(LOCATION_GROUPS)
    .filter(([, terms]) => terms.some(term => text.includes(normalizeForSearch(term))))
    .map(([group]) => group);
}

function normalizeForSearch(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}

function count(value, token) {
  return String(value || '').split(token).length - 1;
}

function diagnostic(code, severity, fieldPath, summary, recoveryAction, autoFixAvailable, requiresConfirmation) {
  return { code, severity, fieldPath, summary, recoveryAction, autoFixAvailable, requiresConfirmation, resolved: false };
}

function finding(code, dimension, severity, summary, recommendation, references = {}) {
  return {
    code,
    dimension,
    severity,
    summary,
    recommendation,
    ...Object.fromEntries(Object.entries(references).filter(([, value]) => Boolean(value)))
  };
}
