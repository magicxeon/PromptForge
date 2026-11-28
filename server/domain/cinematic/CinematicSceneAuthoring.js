import { createPrefixedId } from '../../repositories/schemaVersioning.js';
import {storySkillProvenance} from './StorySkillProvenance.js';
import {normalizeSceneEvents} from '../../config/storyDirectingSkills.js';

const PURPOSES = new Set(['dialogue', 'action', 'montage', 'establishing', 'atmosphere', 'transition', 'dramatic']);

export function ensureSceneAuthoring(project) {
  if (!Array.isArray(project.sceneProposals)) project.sceneProposals = [];
  if (!Array.isArray(project.scenes)) project.scenes = [];
  return project;
}

export function createSceneProposal(input, now = new Date().toISOString()) {
  const allowedCharacterIds = new Set(input.allowedCharacterIds || []);
  const scenes = (Array.isArray(input.scenes) ? input.scenes : []).slice(0, input.maximumScenes || 24)
    .map((scene, index) => normalizeOutline(scene, index, allowedCharacterIds));
  if (!scenes.length) fail('cinematic_scenes_invalid', 'At least one complete Scene proposal is required.');
  const starts=input.scenes.slice(0,scenes.length).map(s=>s.sourceStartParagraph);
  if (starts[0]===1 && starts.every((n,i)=>Number.isInteger(n) && n<=input.paragraphCount && (!i||n>starts[i-1]))) {
    scenes.forEach((s,i)=>{s.sourceStartParagraph=starts[i];s.sourceEndParagraph=(starts[i+1]??input.paragraphCount+1)-1;});
  }
  return {
    id: createPrefixedId('cinesceneproposal'),
    providerProposalId: text(input.providerProposalId, 160),
    status: 'pending_review',
    sourceChapterRevisionId: requiredId(input.sourceChapterRevisionId, 'A saved Chapter revision is required.'),
    baseProjectVersion: Number(input.baseProjectVersion) || 0,
    scenes,
    warnings: list(input.warnings, 8, 500),
    provenance: normalizeProvenance(input.provenance),
    createdAt: now,
    appliedAt: null,
    discardedAt: null
  };
}

export function applySceneProposal(project, proposalId, now = new Date().toISOString(), reviewedRanges) {
  ensureSceneAuthoring(project);
  const proposal = project.sceneProposals.find(item => item.id === proposalId);
  if (!proposal) fail('cinematic_scene_proposal_not_found', 'Scene proposal not found.', 404);
  if (proposal.status === 'applied') return proposal;
  if (proposal.status !== 'pending_review') fail('cinematic_scene_proposal_unavailable', 'This Scene proposal is no longer available.', 409);
  if (!project.activeChapterVersionId || proposal.sourceChapterRevisionId !== project.activeChapterVersionId) {
    fail('cinematic_scene_proposal_stale', 'The Chapter changed after these Scenes were proposed. Review or regenerate the Scenes.', 409);
  }

  const existing = [...project.scenes].sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
  const originals = proposal.scenes;
  const rows = reviewedRanges === undefined
    ? originals.map((outline, original) => ({outline, original}))
    : reviewSourceRanges(project, proposal, reviewedRanges, existing);
  const accepted = rows.map(({outline,original}, index) => {
    const current = original===null?null:existing[original];
    if (!current) return sceneFromOutline(outline, index, proposal, now);
    if (current.shots?.length && current.shots.every(shot => shot.completed === true)) return { ...current, orderKey: index + 1 };
    const hasProduction = (current.shots || []).length > 0;
    const reviewed = sceneOutlineFields(outline, index, proposal);
    for (const key of current.authorDirectedFields || []) {
      if (['lighting','audioIntent','sceneEvents'].includes(key)) reviewed[key] = current[key];
    }
    return {
      ...current,
      ...reviewed,
      sourceStartParagraph: outline.sourceStartParagraph,
      sourceEndParagraph: outline.sourceEndParagraph,
      id: current.id,
      version: Number(current.version || 1) + 1,
      shots: current.shots || [],
      shotOrder: current.shotOrder || (current.shots || []).map(shot => shot.id),
      planningStatus: hasProduction ? 'review_required' : 'ready',
      updatedAt: now
    };
  });
  for (const retained of existing.slice(originals.length)) {
    const complete = retained.shots?.length && retained.shots.every(shot => shot.completed === true);
    accepted.push({ ...retained, orderKey: accepted.length + 1, ...(complete ? {} : { planningStatus: 'review_required' }) });
  }
  project.scenes = accepted;
  proposal.scenes=rows.map(row=>row.outline);
  proposal.status = 'applied';
  proposal.appliedAt = now;
  project.status = 'planning';
  return proposal;
}

function reviewSourceRanges(project, proposal, ranges, existing) {
  const originals = proposal.scenes;
  const revision = project.chapterVersions?.find(item => item.id === proposal.sourceChapterRevisionId);
  const paragraphs = String(revision?.story || project.chapterStory || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const retainedCount = Math.max(0, existing.length - originals.length);
  function invalid() { fail('cinematic_scene_range_invalid', 'Review the source paragraph ranges.'); }
  if (!Array.isArray(ranges) || !ranges.length || ranges.length + retainedCount > 24 || ranges[0]?.start !== 1) invalid();

  let lastOrigin = -1;
  const used = new Set();
  const rows = ranges.map((range, index) => {
    const start = range?.start;
    const end = (ranges[index + 1]?.start ?? paragraphs.length + 1) - 1;
    const origins = range?.origins;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > paragraphs.length) invalid();
    if (!Array.isArray(origins) || !origins.length || origins.length > originals.length) invalid();
    for (const [i, origin] of origins.entries()) {
      if (!Number.isInteger(origin) || !originals[origin]) invalid();
      if (i ? origin !== lastOrigin + 1 : origin < lastOrigin || origin > lastOrigin + 1) invalid();
      lastOrigin = origin;
    }
    for (const origin of origins.slice(1)) {
      const scene = existing[origin];
      if (scene && (scene.shots?.length || scene.approvedEnvironmentSource || project.generationAttempts?.some(a=>a.sceneId===scene.id))) {
        fail('cinematic_scene_range_in_use', 'A scene in this merge already has production work. Keep it separate.', 409);
      }
    }
    const first = originals[origins[0]];
    const last = originals[lastOrigin];
    const repeated = used.has(origins[0]);
    origins.forEach(origin => used.add(origin));
    const exact = origins.length === 1 && first.sourceStartParagraph === start && first.sourceEndParagraph === end;
    const seconds = origins.reduce((total, origin) => {
      const scene = originals[origin];
      const overlap = Math.min(end, scene.sourceEndParagraph) - Math.max(start, scene.sourceStartParagraph) + 1;
      const share = scene.sourceStartParagraph ? Math.max(0, overlap)/(scene.sourceEndParagraph-scene.sourceStartParagraph+1) : 1;
      return total + scene.targetDurationSeconds * share;
    }, 0);
    return {
      original: repeated ? null : origins[0],
      outline: {...first, sourceStartParagraph:start, sourceEndParagraph:end,
        title: repeated ? paragraphs[start-1].slice(0,120) : first.title,
        synopsis: exact ? first.synopsis : paragraphs.slice(start-1,end).join('\n').slice(0,4000),
        exitState:last.exitState, emotionalEnd:last.emotionalEnd, transitionIntent:last.transitionIntent,
        sceneEvents:normalizeSceneEvents(origins.flatMap(origin=>originals[origin].sceneEvents || [])),
        characterIds:[...new Set(origins.flatMap(origin=>originals[origin].characterIds))],
        targetDurationSeconds:integer(seconds,5,120,15)}
    };
  });
  if (used.size !== originals.length) invalid();
  return rows;
}

export function discardSceneProposal(project, proposalId, now = new Date().toISOString()) {
  ensureSceneAuthoring(project);
  const proposal = project.sceneProposals.find(item => item.id === proposalId);
  if (!proposal) fail('cinematic_scene_proposal_not_found', 'Scene proposal not found.', 404);
  if (proposal.status === 'pending_review') {
    proposal.status = 'discarded';
    proposal.discardedAt = now;
  }
  return proposal;
}

export function createManualSceneOutline(project, now = new Date().toISOString()) {
  ensureSceneAuthoring(project);
  if (project.scenes.length >= 24) fail('cinematic_scene_limit', 'A Chapter supports at most 24 Scenes.', 409);
  const outline = normalizeOutline({
    title: `Scene ${project.scenes.length + 1}`,
    synopsis: '',
    purpose: 'dramatic',
    location: '',
    time: '',
    weather: '',
    environment: '',
    entryState: '',
    exitState: '',
    targetDurationSeconds: Math.max(5, Math.round(Number(project.durationTargetMs || 60000) / 1000 / (project.scenes.length + 1))),
    characterIds: []
  }, project.scenes.length, new Set());
  const scene = sceneFromOutline(outline, project.scenes.length, {
    id: null,
    sourceChapterRevisionId: project.activeChapterVersionId || null
  }, now);
  scene.planningStatus = 'draft';
  project.scenes.push(scene);
  project.status = 'planning';
  return scene;
}

export function updateSceneOutline(project, sceneId, input, now = new Date().toISOString()) {
  ensureSceneAuthoring(project);
  const scene = project.scenes.find(item => item.id === sceneId);
  if (!scene) fail('cinematic_scene_not_found', 'Scene not found.', 404);
  if (!text(input?.title, 120)) fail('cinematic_scene_title_required', 'Scene title is required.');
  if (Number(input?.expectedSceneVersion) !== Number(scene.version || 1)) {
    fail('cinematic_scene_version_conflict', 'The Scene changed in another session.', 409);
  }
  const allowedCharacterIds = new Set((project.castAssignments || []).filter(item => item.active !== false).map(item => item.id));
  const outline = normalizeOutline({
    title: input?.title,
    synopsis: input?.synopsis,
    purpose: input?.purpose,
    sceneEvents: input?.sceneEvents ?? scene.sceneEvents,
    lighting: input?.lighting ?? scene.lighting,
    audioIntent: input?.audioIntent ?? scene.audioIntent,
    objective: input?.objective,
    location: input?.location,
    time: input?.time,
    weather: input?.weather,
    environment: input?.environment,
    entryState: input?.entryState,
    exitState: input?.exitState,
    emotionalStart: input?.emotionalStart,
    emotionalEnd: input?.emotionalEnd,
    transitionIntent: input?.transitionIntent,
    targetDurationSeconds: input?.targetDurationSeconds,
    dialogueTargetPercent: input?.dialogueTargetPercent,
    characterIds: input?.characterIds
  }, Math.max(0, Number(scene.orderKey || 1) - 1), allowedCharacterIds);
  const edits = ['sceneEvents','lighting','audioIntent'].filter(key => input[key] !== undefined
    && JSON.stringify(outline[key]) !== JSON.stringify(scene[key] ?? (key === 'sceneEvents' ? [] : '')));
  if (edits.length) scene.authorDirectedFields = [...new Set([...(scene.authorDirectedFields || []),...edits])];
  Object.assign(scene, sceneOutlineFields(outline, Math.max(0, Number(scene.orderKey || 1) - 1), {
    id: scene.sourceSceneProposalId,
    sourceChapterRevisionId: project.activeChapterVersionId
  }));
  scene.version = Number(scene.version || 1) + 1;
  scene.planningStatus = (scene.shots || []).length ? 'review_required' : 'ready';
  scene.updatedAt = now;
  return scene;
}

export function scenePlanningProjection(project) {
  ensureSceneAuthoring(project);
  const acceptedSceneCount = project.scenes.length;
  const acceptedShotCount = project.scenes.reduce((total, scene) => total + (scene.shots || []).length, 0);
  const pending = [...project.sceneProposals].reverse().find(item => item.status === 'pending_review') || null;
  const pendingIsStale = Boolean(pending && pending.sourceChapterRevisionId !== project.activeChapterVersionId);
  const stale = acceptedSceneCount > 0 && project.scenes.some(scene => (
    scene.sourceChapterRevisionId && scene.sourceChapterRevisionId !== project.activeChapterVersionId
  ));
  return {
    sceneCount: acceptedSceneCount,
    shotCount: acceptedShotCount,
    scenePlanningStatus: pendingIsStale || stale ? 'source_changed' : pending ? 'proposal_pending' : acceptedSceneCount ? 'ready' : 'not_started',
    pendingSceneProposalId: pending?.id || null
  };
}

function sceneFromOutline(outline, index, proposal, now) {
  return {
    id: createPrefixedId('cinescene'),
    version: 1,
    lighting: '', audioIntent: '',
    ...sceneOutlineFields(outline, index, proposal),
    beatId: '',
    wardrobeLookIds: [],
    blocking: '',
    performance: '',
    continuityNotes: [],
    shots: [],
    shotOrder: [],
    planningStatus: 'ready',
    createdAt: now,
    updatedAt: now
  };
}

function sceneOutlineFields(outline, index, proposal) {
  return {
    ...(outline.sourceStartParagraph ? {sourceStartParagraph:outline.sourceStartParagraph,sourceEndParagraph:outline.sourceEndParagraph} : {}),
    orderKey: index + 1,
    title: outline.title,
    purpose: outline.purpose,
    synopsis: outline.synopsis,
    storyChange: outline.synopsis,
    objective: outline.objective,
    location: outline.location,
    time: outline.time,
    weather: outline.weather,
    environmentPrompt: outline.environment,
    ...(outline.sceneEvents !== undefined && {sceneEvents:outline.sceneEvents}),
    ...(outline.lighting !== undefined && {lighting:outline.lighting}),
    ...(outline.audioIntent !== undefined && {audioIntent:outline.audioIntent}),
    entryState: outline.entryState,
    exitState: outline.exitState,
    emotionalStart: outline.emotionalStart,
    emotionalEnd: outline.emotionalEnd,
    transitionIntent: outline.transitionIntent,
    castAssignmentIds: outline.characterIds,
    durationMs: outline.targetDurationSeconds * 1000,
    dialogueTargetPercent: outline.dialogueTargetPercent,
    sourceChapterRevisionId: proposal.sourceChapterRevisionId || null,
    sourceSceneProposalId: proposal.id || null
  };
}

function normalizeOutline(value, index, allowedCharacterIds) {
  const title = text(value?.title, 120) || `Scene ${index + 1}`;
  const purpose = PURPOSES.has(value?.purpose) ? value.purpose : 'dramatic';
  return {
    title,
    synopsis: text(value?.synopsis, 4000),
    purpose,
    objective: text(value?.objective, 1000),
    location: text(value?.location, 240),
    time: text(value?.time, 160),
    weather: text(value?.weather, 160),
    environment: text(value?.environment, 2500),
    sceneEvents: normalizeSceneEvents(value?.sceneEvents),
    lighting: text(value?.lighting,500),
    audioIntent: text(value?.audioIntent,500),
    entryState: text(value?.entryState, 1000),
    exitState: text(value?.exitState, 1000),
    emotionalStart: text(value?.emotionalStart, 500),
    emotionalEnd: text(value?.emotionalEnd, 500),
    transitionIntent: text(value?.transitionIntent, 500),
    targetDurationSeconds: integer(value?.targetDurationSeconds, 5, 120, 15),
    dialogueTargetPercent: integer(value?.dialogueTargetPercent, 0, 100, purpose === 'dialogue' ? 60 : 0),
    characterIds: [...new Set((Array.isArray(value?.characterIds) ? value.characterIds : [])
      .map(id => String(id || '').trim()).filter(id => allowedCharacterIds.has(id)))].slice(0, 24)
  };
}

function normalizeProvenance(value) {
  if (!value || typeof value !== 'object') return null;
  return { ...storySkillProvenance(value),provider: text(value.provider, 80), model: text(value.model, 120), responseId: nullableId(value.responseId) };
}
function requiredId(value, message) { const id = nullableId(value); if (!id) fail('cinematic_chapter_revision_required', message, 409); return id; }
function nullableId(value) { const normalized = text(value, 180); return normalized || null; }
function text(value, maximum) { return String(value || '').trim().slice(0, maximum); }
function list(value, maximum, length) { return (Array.isArray(value) ? value : []).slice(0, maximum).map(item => text(item, length)).filter(Boolean); }
function integer(value, minimum, maximum, fallback) { const parsed = Math.round(Number(value)); return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback; }
function fail(code, message, statusCode = 400) { const error = new Error(message); error.code = code; error.statusCode = statusCode; throw error; }
