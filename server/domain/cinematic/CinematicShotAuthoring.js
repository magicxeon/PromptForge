import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import { cinematicWorkflowPolicy } from '../../config/cinematicRewampConfiguration.js';
import { resolveShotCastIds } from './CinematicCastCoverage.js';

const SOURCES = new Set(['manual', 'ai_proposal', 'restored', 'legacy']);
const SHOT_DOCUMENT_MAXIMUM = cinematicWorkflowPolicy.authoring.shotDocumentMaximumCharacters;

export function ensureShotAuthoring(project) {
  if (!Array.isArray(project.shotProposals)) project.shotProposals = [];
  if (!Array.isArray(project.scenes)) project.scenes = [];
  for (const scene of project.scenes) {
    if (!Array.isArray(scene.shots)) scene.shots = [];
    if (!Array.isArray(scene.shotOrder)) scene.shotOrder = scene.shots.map(shot => shot.id);
  }
  return project;
}

export function createShotProposal(input, now = new Date().toISOString()) {
  const allowedCharacterIds = new Set(input.allowedCharacterIds || []);
  const maximumShots = integer(input.maximumShots, 1, 24, 20);
  const shots = (Array.isArray(input.shots) ? input.shots : []).slice(0, maximumShots)
    .map((shot, index) => normalizeShotOutline(shot, index, allowedCharacterIds));
  if (!shots.length) fail('cinematic_shots_invalid', 'At least one complete Shot proposal is required.');
  return {
    id: createPrefixedId('cineshotproposal'),
    providerProposalId: text(input.providerProposalId, 160),
    status: 'pending_review',
    sceneId: requiredId(input.sceneId, 'A Scene is required.'),
    ...(input.targetShotId ? { targetShotId: input.targetShotId, sourceShotVersion: input.sourceShotVersion } : {}),
    sourceSceneVersion: integer(input.sourceSceneVersion, 1, Number.MAX_SAFE_INTEGER, 1),
    sourceChapterRevisionId: nullableId(input.sourceChapterRevisionId),
    baseProjectVersion: Number(input.baseProjectVersion) || 0,
    shots,
    warnings: list(input.warnings, 8, 500),
    provenance: normalizeProvenance(input.provenance),
    createdAt: now,
    appliedAt: null,
    discardedAt: null
  };
}

export function applyShotProposal(project, sceneId, proposalId, now = new Date().toISOString()) {
  ensureShotAuthoring(project);
  const scene = findScene(project, sceneId);
  const proposal = project.shotProposals.find(item => item.id === proposalId && item.sceneId === sceneId);
  if (!proposal) fail('cinematic_shot_proposal_not_found', 'Shot proposal not found.', 404);
  if (proposal.status === 'applied') return { proposal, scene };
  if (proposal.status !== 'pending_review') fail('cinematic_shot_proposal_unavailable', 'This Shot proposal is no longer available.', 409);
  if (proposal.sourceSceneVersion !== Number(scene.version || 1)
    || proposal.sourceChapterRevisionId !== (project.activeChapterVersionId || null)
    || (scene.sourceChapterRevisionId && proposal.sourceChapterRevisionId !== scene.sourceChapterRevisionId)) {
    fail('cinematic_shot_proposal_stale', 'The Scene changed after these Shots were proposed. Review or regenerate the Shots.', 409);
  }

  if (proposal.targetShotId) {
    const current = scene.shots.find(item => item.id === proposal.targetShotId);
    if (!current || current.version !== proposal.sourceShotVersion) fail('cinematic_shot_proposal_stale', 'The Shot changed after this revision was proposed.', 409);
    updateShotDocument(project, sceneId, current.id, { ...proposal.shots[0], expectedShotVersion: current.version, source: 'ai_proposal' }, now);
    current.sourceShotProposalId = proposal.id;
    proposal.status = 'applied'; proposal.appliedAt = now;
    return { proposal, scene };
  }

  const existing = [...scene.shots].sort((left, right) => Number(left.orderKey) - Number(right.orderKey));
  const accepted = proposal.shots.map((outline, index) => {
    const current = existing[index];
    if (!current) return shotFromOutline(outline, index, proposal, scene, now);
    return {
      ...current,
      ...shotDocumentFields(outline, index, proposal),
      id: current.id,
      version: Number(current.version || 1) + 1,
      shotDocumentVersion: Number(current.shotDocumentVersion || 0) + 1,
      shotPlanningStatus: hasProductionEvidence(project, current) ? 'review_required' : 'ready',
      updatedAt: now
    };
  });
  for (const retained of existing.slice(proposal.shots.length)) {
    accepted.push({
      ...retained,
      orderKey: accepted.length + 1,
      shotPlanningStatus: 'review_required',
      updatedAt: now
    });
  }
  scene.shots = accepted;
  scene.shotOrder = accepted.map(shot => shot.id);
  scene.durationMs = accepted.reduce((total, shot) => total + Number(shot.durationMs || 0), 0);
  scene.version = Number(scene.version || 1) + 1;
  scene.planningStatus = accepted.some(shot => shot.shotPlanningStatus === 'review_required') ? 'review_required' : 'ready';
  scene.updatedAt = now;
  proposal.status = 'applied';
  proposal.appliedAt = now;
  project.status = 'planning';
  return { proposal, scene };
}

export function discardShotProposal(project, sceneId, proposalId, now = new Date().toISOString()) {
  ensureShotAuthoring(project);
  findScene(project, sceneId);
  const proposal = project.shotProposals.find(item => item.id === proposalId && item.sceneId === sceneId);
  if (!proposal) fail('cinematic_shot_proposal_not_found', 'Shot proposal not found.', 404);
  if (proposal.status === 'pending_review') {
    proposal.status = 'discarded';
    proposal.discardedAt = now;
  }
  return proposal;
}

export function createManualShot(project, sceneId, { maximumShots = 20 } = {}, now = new Date().toISOString()) {
  ensureShotAuthoring(project);
  const scene = findScene(project, sceneId);
  if (scene.shots.length >= maximumShots) fail('cinematic_shot_limit', `A Scene supports at most ${maximumShots} Shots.`, 409);
  const index = scene.shots.length;
  const durationMs = Math.min(20000, Math.max(1000, Math.round(Number(scene.durationMs || 5000) / Math.max(1, index + 1))));
  const outline = normalizeShotOutline({
    title: `Shot ${index + 1}`,
    purpose: scene.objective || scene.synopsis || scene.storyChange || '',
    durationMs,
    shotDocument: createShotDocumentTemplate(scene, durationMs),
    characterIds: scene.castMode === 'none' ? [] : scene.castAssignmentIds || []
  }, index, new Set(scene.castAssignmentIds || []));
  const shot = shotFromOutline(outline, index, { id: null }, scene, now);
  shot.source = 'manual';
  shot.shotPlanningStatus = 'draft';
  scene.shots.push(shot);
  scene.shotOrder = scene.shots.map(item => item.id);
  scene.durationMs = scene.shots.reduce((total, item) => total + Number(item.durationMs || 0), 0);
  scene.version = Number(scene.version || 1) + 1;
  scene.planningStatus = 'draft';
  scene.updatedAt = now;
  project.status = 'planning';
  return { scene, shot };
}

export function updateShotDocument(project, sceneId, shotId, input, now = new Date().toISOString()) {
  ensureShotAuthoring(project);
  const scene = findScene(project, sceneId);
  const shot = scene.shots.find(item => item.id === shotId);
  if (!shot) fail('cinematic_shot_not_found', 'Shot not found.', 404);
  if (Number(input?.expectedShotVersion) !== Number(shot.version || 1)) {
    fail('cinematic_shot_version_conflict', 'The Shot changed in another session.', 409);
  }
  const title = text(input?.title, 120);
  const shotDocument = checkedShotDocument(input?.shotDocument);
  if (!title) fail('cinematic_shot_title_required', 'Shot title is required.');
  if (!shotDocument.trim()) fail('cinematic_shot_document_required', 'Shot direction is required.');
  if (input.speakerBindings !== undefined) {
    if (!Array.isArray(input.speakerBindings) || input.speakerBindings.length > 24) {
      fail('cinematic_shot_cast_invalid', 'Choose at most 24 Scene Characters.');
    }
    const allowed = new Set(scene.castMode === 'none' ? [] : scene.castAssignmentIds || []);
    const aliases = new Set();
    const ids = new Set();
    shot.speakerBindings = input.speakerBindings.map(binding => {
      const alias = text(binding.alias, 120);
      const id = String(binding.castAssignmentId || '');
      if (!alias || aliases.has(alias) || ids.has(id) || !allowed.has(id)
        || !(project.castAssignments || []).some(item => item.id === id && item.active !== false)
        || typeof binding.visible !== 'boolean') {
        fail('cinematic_shot_cast_invalid', 'Each speaker needs a unique name and an active Scene Character.');
      }
      aliases.add(alias); ids.add(id);
      return { alias, castAssignmentId: id, visible: binding.visible };
    });
    shot.castAssignmentIds = shot.speakerBindings.filter(item => item.visible).map(item => item.castAssignmentId);
    shot.castMode = shot.castAssignmentIds.length ? 'selected' : 'none';
  } else if (!shot.speakerBindings) {
    shot.speakerBindings = resolveShotCastIds(scene, shot).map(id => ({
      castAssignmentId: id, alias: (project.castAssignments || []).find(item => item.id === id)?.displayName || id, visible: true
    }));
  }
  if (input.videoPromptOverride !== undefined) {
    if (input.videoPromptOverride === null) shot.videoPromptOverride = null;
    else {
      const value = input.videoPromptOverride;
      if (typeof value.text !== 'string' || !value.text.trim()
        || value.text.length > cinematicWorkflowPolicy.authoring.videoPromptMaximumCharacters
        || !/^[a-f0-9]{64}$/.test(value.sourceFingerprint || '')) {
        fail('cinematic_video_prompt_invalid', 'Video Prompt or its source revision is invalid.');
      }
      shot.videoPromptOverride = { text: value.text, sourceFingerprint: value.sourceFingerprint };
    }
  }
  shot.title = title;
  shot.durationMs = integer(input?.durationMs, 500, 20000, Number(shot.durationMs) || 5000);
  shot.shotDocument = shotDocument;
  shot.manualStoryboard = false;
  shot.shotDocumentVersion = Number(shot.shotDocumentVersion || 0) + 1;
  shot.source = SOURCES.has(input?.source) ? input.source : (SOURCES.has(shot.source) ? shot.source : 'manual');
  shot.shotPlanningStatus = 'ready';
  shot.version = Number(shot.version || 1) + 1;
  shot.updatedAt = now;
  scene.durationMs = scene.shots.reduce((total, item) => total + Number(item.durationMs || 0), 0);
  scene.version = Number(scene.version || 1) + 1;
  scene.planningStatus = scene.shots.some(item => item.shotPlanningStatus === 'review_required') ? 'review_required' : 'ready';
  scene.updatedAt = now;
  return { scene, shot };
}

export function resolveShotDocument(shot, scene, cast = []) {
  if (typeof shot?.shotDocument === 'string' && shot.shotDocument.trim()) return shot.shotDocument;
  const durationMs = integer(shot?.durationMs, 500, 20000, 5000);
  const parts = [
    'SHOT DURATION',
    `${formatSeconds(durationMs)} seconds`,
    '',
    'SCENE',
    text(scene?.synopsis || scene?.storyChange || shot?.purpose, 4000),
    '',
    'OPENING',
    text(shot?.visibleMoment || shot?.continuityEntry, 2000),
    '',
    'CAMERA',
    [shot?.framing, shot?.cameraAngle, shot?.cameraMovement, shot?.lensIntent].map(value => text(value, 1000)).filter(Boolean).join('. '),
    '',
    'PERFORMANCE AND TIMELINE',
    `[0.0-${formatSeconds(durationMs)} sec]`,
    [shot?.blocking, shot?.performance, shot?.gaze, shot?.prompt].map(value => text(value, 4000)).filter(Boolean).join('\n'),
    '',
    'DIALOGUE AND FACIAL PERFORMANCE',
    dialogueText(shot?.dialogueCues, cast),
    '',
    'AUDIO',
    text(shot?.audioIntent, 2000),
    '',
    'CONTINUITY AND CONSTRAINTS',
    (Array.isArray(shot?.continuityNotes) ? shot.continuityNotes : []).map(value => text(value, 500)).filter(Boolean).join('\n')
  ];
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function createShotDocumentTemplate(scene, durationMs) {
  const duration = formatSeconds(durationMs);
  return [
    'SHOT DURATION', `${duration} seconds`, '',
    'SCENE', text(scene?.synopsis || scene?.storyChange, 4000), '',
    'OPENING', '', '',
    'CAMERA', '', '',
    'PERFORMANCE AND TIMELINE', `[0.0-${duration} sec]`, '', '',
    'DIALOGUE AND FACIAL PERFORMANCE', '', '',
    'AUDIO', '', '',
    'CONTINUITY AND CONSTRAINTS',
    [scene?.entryState, scene?.exitState, scene?.transitionIntent].map(value => text(value, 1000)).filter(Boolean).join('\n')
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function shotFromOutline(outline, index, proposal, scene, now) {
  return {
    id: createPrefixedId('cineshot'),
    version: 1,
    ...shotDocumentFields(outline, index, proposal),
    framing: '', cameraAngle: '', cameraMovement: '', lensIntent: '', blocking: '', performance: '', gaze: '',
    lighting: '', environment: scene.environmentPrompt || '', audioIntent: '', prompt: '', wardrobeLookIds: [],
    continuityNotes: [], storyboardStatus: 'draft', approvedVideoAttemptId: null,
    shotDocumentVersion: 1,
    shotPlanningStatus: 'ready',
    createdAt: now,
    updatedAt: now
  };
}

function shotDocumentFields(outline, index, proposal) {
  return {
    orderKey: index + 1,
    title: outline.title,
    purpose: outline.purpose,
    durationMs: outline.durationMs,
    shotDocument: outline.shotDocument,
    source: 'ai_proposal',
    sourceShotProposalId: proposal.id || null,
    castAssignmentIds: outline.characterIds
  };
}

function normalizeShotOutline(value, index, allowedCharacterIds) {
  if ((value?.characterIds || []).some(id => !allowedCharacterIds.has(id))) {
    fail('cinematic_shot_cast_invalid', 'The proposed Shot includes a Character outside this Scene.');
  }
  const durationMs = integer(value?.durationMs, 500, 20000, 5000);
  const shotDocument = checkedShotDocument(value?.shotDocument) || `SHOT DURATION\n${formatSeconds(durationMs)} seconds`;
  return {
    title: text(value?.title, 120) || `Shot ${index + 1}`,
    purpose: text(value?.purpose, 1000),
    durationMs,
    shotDocument,
    characterIds: [...new Set((Array.isArray(value?.characterIds) ? value.characterIds : [])
      .map(id => String(id || '').trim()).filter(id => allowedCharacterIds.has(id)))].slice(0, 24)
  };
}

function hasProductionEvidence(project, shot) {
  return Boolean(shot.approvedStoryboardSource || shot.approvedStoryboardAttemptId || shot.approvedVideoAttemptId
    || (project.generationAttempts || []).some(attempt => attempt.shotId === shot.id));
}
function findScene(project, sceneId) {
  const scene = project.scenes.find(item => item.id === sceneId);
  if (!scene) fail('cinematic_scene_not_found', 'Scene not found.', 404);
  return scene;
}
function dialogueText(cues, cast) {
  return (Array.isArray(cues) ? cues : []).map(cue => {
    const speaker = cast.find(item => item.id === cue.speakerCastAssignmentId)?.displayName
      || cue.offscreenVoiceRole || cue.speakerCastAssignmentId || 'Character';
    const start = Number(cue.startOffsetMs || 0) / 1000;
    const end = start + Math.max(0.5, Number(cue.estimatedDurationMs || 1000) / 1000);
    return `[${start}-${end} sec] ${speaker}${cue.delivery ? ` (${cue.delivery})` : ''}: ${String(cue.text || '')}`;
  }).join('\n');
}
function normalizeProvenance(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    provider: text(value.provider, 80),
    model: text(value.model, 120),
    responseId: nullableId(value.responseId),
    fallbackUsed: Boolean(value.fallbackUsed),
    fallbackReason: nullableId(value.fallbackReason)
  };
}
function formatSeconds(durationMs) { return (Math.round(durationMs / 100) / 10).toFixed(durationMs % 1000 === 0 ? 0 : 1); }
function requiredId(value, message) { const id = nullableId(value); if (!id) fail('cinematic_scene_required', message, 409); return id; }
function nullableId(value) { const normalized = text(value, 180); return normalized || null; }
function checkedShotDocument(value) {
  const document = String(value || '');
  if (document.length > SHOT_DOCUMENT_MAXIMUM) {
    fail('cinematic_shot_document_too_long', `Shot direction must not exceed ${SHOT_DOCUMENT_MAXIMUM} characters.`);
  }
  return document;
}
function text(value, maximum) { return String(value || '').trim().slice(0, maximum); }
function list(value, maximum, length) { return (Array.isArray(value) ? value : []).slice(0, maximum).map(item => text(item, length)).filter(Boolean); }
function integer(value, minimum, maximum, fallback) { const parsed = Math.round(Number(value)); return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback; }
function fail(code, message, statusCode = 400) { const error = new Error(message); error.code = code; error.statusCode = statusCode; throw error; }
