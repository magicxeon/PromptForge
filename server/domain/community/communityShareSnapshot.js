import { stripEmbeddedBase64 } from '../../repositories/recordNormalizer.js';

const PARTIAL_PROMPT_LIMIT = 320;

export function buildGeneratedShareSnapshots(generation = {}, sceneTemplateSnapshot = null) {
  const safeSceneTemplate = sceneTemplateSnapshot && typeof sceneTemplateSnapshot === 'object'
    ? stripEmbeddedBase64(sceneTemplateSnapshot)
    : null;
  const finalPrompt = normalizeText(
    safeSceneTemplate?.finalPromptSnapshot
      || safeSceneTemplate?.manualPromptSnapshot
      || generation.prompt
  );
  const authoringMode = safeSceneTemplate?.authoringMode === 'manual' ? 'manual' : 'guided';

  return {
    sharedPromptSnapshot: {
      schemaVersion: 1,
      authoringMode,
      source: 'generation_result',
      publicPromptText: finalPrompt,
      createdAt: normalizeGenerationDate(generation)
    },
    providerModelSnapshot: {
      providerId: normalizeText(generation.provider) || null,
      providerDisplayName: normalizeText(generation.providerDisplayName) || null,
      modelId: normalizeText(generation.submodel) || null,
      modelDisplayName: normalizeText(generation.modelDisplayName) || null,
      resolvedModelId: normalizeText(generation.resolvedSubmodel) || null,
      providerConfigVersion: normalizeText(generation.providerConfigVersion) || null
    },
    workflowSnapshot: {
      schemaVersion: 1,
      mode: normalizeText(generation.mode) || null,
      authoringMode,
      structuredSelections: sanitizeStructuredSelections(stripEmbeddedBase64(
        safeSceneTemplate?.structuredSelectionsSnapshot
          || generation.selections
          || {}
      )),
      generationSettings: sanitizeGenerationSettings(generation)
    },
    sceneTemplateSnapshot: safeSceneTemplate
  };
}

export function applyPromptVisibilityToSnapshots(snapshots = {}, promptVisibility) {
  const sharedPromptSnapshot = stripEmbeddedBase64(snapshots.sharedPromptSnapshot || {});
  const providerModelSnapshot = stripEmbeddedBase64(snapshots.providerModelSnapshot || {});
  let workflowSnapshot = stripEmbeddedBase64(snapshots.workflowSnapshot || {});
  let sceneTemplateSnapshot = stripEmbeddedBase64(snapshots.sceneTemplateSnapshot || null);
  const fullPrompt = normalizeText(sharedPromptSnapshot.publicPromptText);

  if (promptVisibility === 'partial') {
    sharedPromptSnapshot.publicPromptText = createPartialPrompt(fullPrompt);
    workflowSnapshot = {
      schemaVersion: workflowSnapshot.schemaVersion || 1,
      mode: workflowSnapshot.mode || null,
      authoringMode: workflowSnapshot.authoringMode || 'guided'
    };
    sceneTemplateSnapshot = null;
  } else if (promptVisibility === 'remix_only') {
    sharedPromptSnapshot.publicPromptText = null;
    if (sceneTemplateSnapshot) {
      sceneTemplateSnapshot.finalPromptSnapshot = '';
      sceneTemplateSnapshot.manualPromptSnapshot = '';
    }
  } else if (promptVisibility === 'private') {
    sharedPromptSnapshot.publicPromptText = null;
    workflowSnapshot = {};
    sceneTemplateSnapshot = null;
  }

  return {
    sharedPromptSnapshot,
    providerModelSnapshot,
    workflowSnapshot,
    sceneTemplateSnapshot
  };
}

export function canPublishAsRemixOnly(snapshots = {}) {
  const authoringMode = snapshots.sharedPromptSnapshot?.authoringMode
    || snapshots.sceneTemplateSnapshot?.authoringMode;
  return authoringMode !== 'manual'
    && Boolean(snapshots.sceneTemplateSnapshot);
}

export function isReusablePublishedSnapshot(snapshots = {}, promptVisibility) {
  if (promptVisibility === 'private' || promptVisibility === 'partial') return false;
  return Boolean(snapshots.sceneTemplateSnapshot);
}

function createPartialPrompt(value) {
  if (!value) return null;
  const positivePrompt = value
    .split(/\b(?:negative prompt|negative|avoid|exclude)\s*:/i)[0]
    .trim();
  if (positivePrompt.length <= PARTIAL_PROMPT_LIMIT) return positivePrompt;
  return `${positivePrompt.slice(0, PARTIAL_PROMPT_LIMIT).trimEnd()}...`;
}

function sanitizeGenerationSettings(generation) {
  const source = generation.metadata?.generationSettings || generation.generationSettings || {};
  const allowed = {};
  for (const key of ['width', 'height', 'resolution', 'aspectRatio', 'quality', 'outputCount']) {
    const value = source[key] ?? generation[key];
    if (value !== null && value !== undefined
      && (typeof value === 'string' || Number.isFinite(Number(value)))) {
      allowed[key] = value;
    }
  }
  return allowed;
}

function sanitizeStructuredSelections(value, key = '') {
  if (isPrivateReferenceKey(key)) return null;
  if (typeof value === 'string') {
    return isPrivateAssetPointer(value) ? null : value;
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeStructuredSelections(item)).filter(item => item !== null);
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value)
    .filter(([entryKey]) => !isPrivateReferenceKey(entryKey))
    .map(([entryKey, item]) => [entryKey, sanitizeStructuredSelections(item, entryKey)]));
}

function isPrivateReferenceKey(key) {
  return /^(?:imageUrl|thumbnailUrl|sourceJobId|assetId|jobId|.*ReferenceImage.*|.*ReferenceJobIds?)$/i
    .test(String(key || ''));
}

function isPrivateAssetPointer(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('data:image/')
    || normalized.startsWith('blob:')
    || normalized.startsWith('/outputs/')
    || normalized.startsWith('http://')
    || normalized.startsWith('https://');
}

function normalizeGenerationDate(generation) {
  const value = generation.createdAt || generation.timestamp || generation.completedAt;
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
