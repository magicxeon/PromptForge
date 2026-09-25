import { createPrefixedId } from '../../repositories/schemaVersioning.js';

const SOURCES = new Set(['manual', 'ai', 'regenerate', 'restore', 'legacy']);

export function ensureChapterAuthoring(project) {
  if (!Array.isArray(project.chapterVersions)) project.chapterVersions = [];
  if (typeof project.activeChapterVersionId !== 'string') project.activeChapterVersionId = null;
  if (!Array.isArray(project.chapterProposals)) project.chapterProposals = [];
  if (!Array.isArray(project.chapterCharacterIds)) project.chapterCharacterIds = [];
  return project;
}

export function classifyChapter(project) {
  ensureChapterAuthoring(project);
  const active = project.chapterVersions.find(item => item.id === project.activeChapterVersionId) || null;
  const hasText = Boolean(String(project.chapterStory || '').trim());
  const generated = Boolean(project.chapterGeneration)
    || ['ai', 'regenerate'].includes(active?.source);
  if (generated && hasText) return 'generated';
  if (hasText) return 'authored';
  if (project.scenes?.length || project.generationAttempts?.length) return 'production_only';
  return 'empty';
}

export function appendChapterRevision(project, input, historyLimit, now = new Date().toISOString()) {
  ensureChapterAuthoring(project);
  seedLegacyRevision(project);
  const current = project.chapterVersions.find(item => item.id === project.activeChapterVersionId) || null;
  const title = validTitle(input.title);
  const story = validStory(input.story);
  if (!input.force && current?.title === title && current?.story === story) return current;
  for (const revision of project.chapterVersions) {
    if (revision.status === 'active') revision.status = 'superseded';
  }
  const revision = {
    id: createPrefixedId('cinechapterrev'),
    version: Math.max(0, ...project.chapterVersions.map(item => Number(item.version) || 0)) + 1,
    parentRevisionId: current?.id || null,
    title,
    story,
    source: SOURCES.has(input.source) ? input.source : 'manual',
    revisionInstruction: bounded(input.revisionInstruction, 2000),
    sourceFullStoryRevisionId: nullableId(input.sourceFullStoryRevisionId),
    status: 'active',
    provenance: normalizeProvenance(input.provenance),
    createdAt: now
  };
  project.chapterVersions.push(revision);
  project.activeChapterVersionId = revision.id;
  project.chapterTitle = title;
  project.chapterStory = story;
  rotateChapterHistory(project, historyLimit);
  return revision;
}

export function restoreChapterRevision(project, revisionId, historyLimit, now = new Date().toISOString()) {
  ensureChapterAuthoring(project);
  seedLegacyRevision(project);
  const source = project.chapterVersions.find(item => item.id === revisionId);
  if (!source) fail('cinematic_chapter_revision_not_found', 'Chapter revision not found.', 404);
  return appendChapterRevision(project, {
    title: source.title,
    story: source.story,
    source: 'restore',
    revisionInstruction: `Restore Chapter revision ${source.version}`,
    sourceFullStoryRevisionId: source.sourceFullStoryRevisionId,
    provenance: source.provenance,
    force: true
  }, historyLimit, now);
}

export function createChapterProposal(input, now = new Date().toISOString()) {
  const scope = input.scope === 'selected' ? 'selected' : 'all';
  const chapters = (Array.isArray(input.chapters) ? input.chapters : []).slice(0, 120).map((item, index) => ({
    projectId: nullableId(item.projectId),
    order: index + 1,
    seasonNumber: Math.max(1, Number(item.seasonNumber) || 1),
    chapterNumber: Math.max(1, Number(item.chapterNumber) || index + 1),
    title: validTitle(item.title || `Chapter ${index + 1}`),
    story: validStory(item.story)
  }));
  if (!chapters.length || chapters.some(item => !item.story)) {
    fail('cinematic_chapters_invalid', 'At least one complete Chapter proposal is required.');
  }
  return {
    id: createPrefixedId('cinechapterproposal'),
    providerProposalId: bounded(input.providerProposalId, 160),
    scope,
    status: 'pending_review',
    sourceFullStoryRevisionId: nullableId(input.sourceFullStoryRevisionId),
    targetProjectId: String(input.targetProjectId || ''),
    instruction: bounded(input.instruction, 2000),
    baseChapterVersions: (Array.isArray(input.baseChapterVersions) ? input.baseChapterVersions : []).slice(0, 120).map(item => ({
      projectId: String(item.projectId || ''),
      version: Number(item.version) || 0,
      activeChapterVersionId: nullableId(item.activeChapterVersionId)
    })),
    chapters,
    warnings: (Array.isArray(input.warnings) ? input.warnings : []).slice(0, 8).map(value => bounded(value, 500)).filter(Boolean),
    provenance: normalizeProvenance(input.provenance),
    createdAt: now,
    appliedAt: null,
    discardedAt: null
  };
}

export function activeChapterRevision(project) {
  ensureChapterAuthoring(project);
  return project.chapterVersions.find(item => item.id === project.activeChapterVersionId) || null;
}

export function pendingChapterProposal(project, scope = null) {
  ensureChapterAuthoring(project);
  return [...project.chapterProposals].reverse().find(item => (
    item.status === 'pending_review' && (!scope || item.scope === scope)
  )) || null;
}

export function chapterRevisionProjection(project) {
  ensureChapterAuthoring(project);
  return {
    activeChapterVersionId: project.activeChapterVersionId,
    revisionCount: project.chapterVersions.length,
    classification: classifyChapter(project),
    pendingProposalId: pendingChapterProposal(project)?.id || null
  };
}

function seedLegacyRevision(project) {
  if (project.chapterVersions.length || (!String(project.chapterTitle || '').trim() && !String(project.chapterStory || '').trim())) return;
  const createdAt = project.updatedAt || project.createdAt || new Date().toISOString();
  const revision = {
    id: createPrefixedId('cinechapterrev'), version: 1, parentRevisionId: null,
    title: validTitle(project.chapterTitle || project.title || 'Chapter 1'),
    story: validStory(project.chapterStory), source: 'legacy', revisionInstruction: '',
    sourceFullStoryRevisionId: project.chapterGeneration?.confirmedRevisionId || null,
    status: 'active', provenance: normalizeProvenance(project.chapterGeneration?.provenance), createdAt
  };
  project.chapterVersions.push(revision);
  project.activeChapterVersionId = revision.id;
}

function rotateChapterHistory(project, historyLimit) {
  const active = project.activeChapterVersionId;
  const previous = project.chapterVersions
    .filter(item => item.id !== active && item.pinned !== true)
    .sort((a, b) => b.version - a.version)
    .slice(0, Math.max(0, Number(historyLimit) || 0));
  const retained = new Set([active, ...previous.map(item => item.id), ...project.chapterVersions.filter(item => item.pinned === true).map(item => item.id)]);
  project.chapterVersions = project.chapterVersions.filter(item => retained.has(item.id));
}

function normalizeProvenance(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    provider: bounded(value.provider, 80),
    model: bounded(value.model, 120),
    responseId: nullableId(value.responseId)
  };
}

function validTitle(value) {
  const title = bounded(value, 120);
  if (!title) fail('cinematic_series_title_invalid', 'A Chapter title is required.');
  return title;
}
function validStory(value) { return bounded(value, 50000); }
function bounded(value, maximum) { return String(value || '').trim().slice(0, maximum); }
function nullableId(value) { const id = String(value || '').trim(); return id || null; }
function fail(code, message, statusCode = 400) { const error = new Error(message); error.code = code; error.statusCode = statusCode; throw error; }
