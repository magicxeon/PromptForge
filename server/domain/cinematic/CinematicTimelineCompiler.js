import crypto from 'node:crypto';

export class CinematicTimelineCompiler {
  compile(input, project, { createId } = {}) {
    const requestedEntries = Array.isArray(input?.entries) ? input.entries : [];
    if (!requestedEntries.length) throw timelineError('cinematic_timeline_invalid', 'Timeline requires at least one entry.');
    const orderedProjectShots = orderedShots(project);
    const requiredShotIds = new Set(orderedProjectShots.map(({ shot }) => shot.id));
    const requestedShotIds = requestedEntries.map(entry => String(entry?.shotId || ''));
    if (requestedShotIds.some(id => !requiredShotIds.has(id))
      || new Set(requestedShotIds).size !== requestedShotIds.length
      || requestedShotIds.length !== requiredShotIds.size
      || [...requiredShotIds].some(id => !requestedShotIds.includes(id))) {
      throw timelineError(
        'cinematic_timeline_shot_set_invalid',
        'Timeline must contain every current Project Shot exactly once.',
        409,
        { requiredShotIds: [...requiredShotIds] }
      );
    }

    const entries = requestedEntries.map((entry, index) => {
      const located = orderedProjectShots.find(value => value.shot.id === entry.shotId);
      const shot = located.shot;
      const approvedAttemptId = shot.approvedVideoAttemptId || entry.approvedVideoAttemptId || null;
      const attempt = (project.generationAttempts || []).find(item => (
        item.id === approvedAttemptId && item.shotId === shot.id && isVideoAttempt(item)
      ));
      const sourceCurrent = isCurrentVideoSource(shot, attempt);
      const sourceDurationMs = resolveSourceDurationMs(shot, attempt);
      const trimInMs = nonNegativeInteger(entry.trimInMs, 0);
      const trimOutMs = nonNegativeInteger(entry.trimOutMs, sourceDurationMs);
      if (trimInMs >= sourceDurationMs || trimOutMs > sourceDurationMs || trimOutMs <= trimInMs) {
        throw timelineError(
          'cinematic_timeline_trim_invalid',
          'Timeline trim bounds must stay inside the approved video source.',
          400,
          { shotId: shot.id, sourceDurationMs }
        );
      }
      const transition = pick(entry.transition, ['cut', 'dissolve', 'fade'], 'cut');
      const transitionDurationMs = transition === 'cut'
        ? 0
        : nonNegativeInteger(entry.transitionDurationMs, defaultTransitionDuration(trimOutMs - trimInMs));
      const durationMs = trimOutMs - trimInMs;
      if (transitionDurationMs >= durationMs) {
        throw timelineError(
          'cinematic_timeline_transition_invalid',
          'Timeline transition duration must be shorter than its owning clip.',
          400,
          { shotId: shot.id, durationMs, transitionDurationMs }
        );
      }
      return {
        id: String(entry.id || '').trim() || createId?.('cineclip') || deterministicEntryId(project.id, shot.id),
        orderKey: index + 1,
        orderAuthority: input.orderAuthority === 'story_order' ? 'story_order' : 'finish_explicit',
        sceneId: located.scene.id,
        shotId: shot.id,
        approvedVideoAttemptId: approvedAttemptId,
        sourceFingerprint: ['looks_only', 'text_only'].includes(attempt?.referenceMode) ? null : attempt?.sourceFingerprint || shot.approvedStoryboardSource?.sourceFingerprint || null,
        videoSourceFingerprint: attempt ? videoSourceFingerprint(attempt) : null,
        outputAssetIds: [...(attempt?.outputAssetIds || [])],
        trimInMs,
        trimOutMs,
        sourceDurationMs,
        durationMs,
        transition,
        transitionDurationMs,
        downstreamSourceStatus: sourceCurrent ? 'current' : attempt ? 'source_changed' : 'source_unavailable'
      };
    });
    const timelineCore = {
      projectId: project.id,
      aspectRatio: project.aspectRatio,
      entries: entries.map(fingerprintEntry),
      durationMs: assembledDuration(entries),
      targetDurationMs: Number(project.durationTargetMs || 0)
    };
    return {
      id: createId?.('cinetimeline') || `cinetimeline_${fingerprint(timelineCore).slice(0, 20)}`,
      version: (project.timelineVersions || []).length + 1,
      parentVersionId: project.activeTimelineVersionId || null,
      status: 'active',
      entries,
      durationMs: timelineCore.durationMs,
      targetDurationMs: timelineCore.targetDurationMs,
      durationDeltaMs: timelineCore.durationMs - timelineCore.targetDurationMs,
      timelineFingerprint: fingerprint(timelineCore),
      exportEligible: entries.every(entry => entry.downstreamSourceStatus === 'current'),
      createdAt: new Date().toISOString()
    };
  }

  reconcile(project, timeline) {
    if (!timeline) return null;
    const input = {
      orderAuthority: timeline.entries?.[0]?.orderAuthority || 'finish_explicit',
      entries: (timeline.entries || []).map(entry => ({
        id: entry.id,
        shotId: entry.shotId,
        approvedVideoAttemptId: entry.approvedVideoAttemptId,
        trimInMs: entry.trimInMs,
        trimOutMs: entry.trimOutMs,
        transition: entry.transition,
        transitionDurationMs: entry.transitionDurationMs
      }))
    };
    const reconciled = this.compile(input, project, { createId: prefix => (
      prefix === 'cinetimeline' ? timeline.id : null
    ) });
    return {
      ...reconciled,
      id: timeline.id,
      version: timeline.version,
      parentVersionId: timeline.parentVersionId || null,
      createdAt: timeline.createdAt
    };
  }
}

function orderedShots(project) {
  return [...(project.scenes || [])]
    .sort((left, right) => Number(left.orderKey || 0) - Number(right.orderKey || 0))
    .flatMap(scene => {
      const byId = new Map((scene.shots || []).map(shot => [shot.id, shot]));
      const ordered = (scene.shotOrder || []).map(id => byId.get(id)).filter(Boolean);
      const shots = ordered.length === (scene.shots || []).length
        ? ordered
        : [...(scene.shots || [])].sort((left, right) => Number(left.orderKey || 0) - Number(right.orderKey || 0));
      return shots.map(shot => ({ scene, shot }));
    });
}

function isCurrentVideoSource(shot, attempt) {
  return Boolean(attempt
    && attempt.status === 'approved'
    && (['looks_only', 'text_only'].includes(attempt.referenceMode) || attempt.sourceFingerprint === shot.approvedStoryboardSource?.sourceFingerprint)
    && !['source_changed', 'packet_changed'].includes(attempt.downstreamSourceStatus)
    && shot.approvedVideoAttemptId === attempt.id);
}

function isVideoAttempt(attempt) {
  return ['cinematic_motion_preview', 'cinematic_draft_clip', 'cinematic_final_clip'].includes(attempt?.operation);
}

function resolveSourceDurationMs(shot, attempt) {
  const value = Number(
    attempt?.renderDurationMs
    || attempt?.outputAsset?.durationMs
    || (Number(attempt?.durationSeconds || 0) * 1000)
    || shot.durationMs
  );
  return Number.isFinite(value) && value > 0 ? Math.round(value) : Math.max(1, Number(shot.durationMs || 1));
}

function videoSourceFingerprint(attempt) {
  return attempt.videoSourceFingerprint || fingerprint({
    attemptId: attempt.id,
    generationJobId: attempt.generationJobId || null,
    sourceFingerprint: attempt.sourceFingerprint || null,
    outputAssetIds: [...(attempt.outputAssetIds || [])],
    providerId: attempt.providerId || null,
    modelId: attempt.modelId || null
  });
}

function fingerprintEntry(entry) {
  return {
    orderKey: entry.orderKey,
    orderAuthority: entry.orderAuthority,
    sceneId: entry.sceneId,
    shotId: entry.shotId,
    approvedVideoAttemptId: entry.approvedVideoAttemptId,
    videoSourceFingerprint: entry.videoSourceFingerprint,
    trimInMs: entry.trimInMs,
    trimOutMs: entry.trimOutMs,
    transition: entry.transition,
    transitionDurationMs: entry.transitionDurationMs,
    downstreamSourceStatus: entry.downstreamSourceStatus
  };
}

function assembledDuration(entries) {
  return entries.reduce((total, entry, index) => (
    total + entry.durationMs - (index === 0 ? 0 : entry.transitionDurationMs)
  ), 0);
}

function defaultTransitionDuration(durationMs) {
  return Math.min(500, Math.max(1, Math.floor(durationMs / 4)));
}

function deterministicEntryId(projectId, shotId) {
  return `cineclip_${fingerprint({ projectId, shotId }).slice(0, 20)}`;
}

function nonNegativeInteger(value, fallback) {
  const number = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(number) || number < 0) return Math.round(fallback);
  return Math.round(number);
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(sortValue(value))).digest('hex');
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

function timelineError(code, message, statusCode = 400, details = null) {
  return Object.assign(new Error(message), { code, statusCode, details });
}

export const cinematicTimelineCompiler = new CinematicTimelineCompiler();
