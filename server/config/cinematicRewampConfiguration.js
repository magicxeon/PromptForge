import crypto from 'node:crypto';
import fs from 'node:fs';

const workflowUrl = new URL('./cinematic/workflow-policy.v1.json', import.meta.url);
const assetsUrl = new URL('./cinematic/production-assets.v1.json', import.meta.url);

export function validateCinematicWorkflowPolicy(value) {
  assertHeader(value, 'workflow');
  const workspaceIds = value.workspace?.ids;
  if (!Array.isArray(workspaceIds) || workspaceIds.length !== 3
    || new Set(workspaceIds).size !== workspaceIds.length
    || !['story', 'production', 'final'].every(id => workspaceIds.includes(id))
    || !workspaceIds.includes(value.workspace?.default)) invalid('Invalid Cinematic workspace policy.');
  const stageMap = value.workspace?.legacyStageMap;
  for (const stage of ['setup', 'cast', 'story-plan', 'storyboard', 'produce', 'finish']) {
    if (!workspaceIds.includes(stageMap?.[stage])) invalid(`Invalid workspace mapping for ${stage}.`);
  }
  const creation = value.projectCreation;
  if (!exactIds(creation?.formats, ['short-film', 'mini-series'])
    || !creation.formats.includes(creation.defaultFormat)
    || !exactIds(creation?.aspectRatios, ['9:16', '16:9', '1:1'])
    || !creation.aspectRatios.includes(creation.defaultAspectRatio)
    || !exactValues(creation?.chapterDurationsSeconds, [20, 30, 45, 60, 90, 120])
    || typeof creation?.defaultSeasonEnabled !== 'boolean'
    || !integerBetween(creation?.defaultSeasonCount, 1, 24)
    || !integerBetween(creation?.defaultChapterCount, 1, 120)
    || !integerBetween(creation?.maximumSeasonCount, creation.defaultSeasonCount, 24)
    || !integerBetween(creation?.maximumChapterCount, creation.defaultChapterCount, 120)) {
    invalid('Invalid Cinematic Project creation policy.');
  }
  const authoring = value.authoring;
  if (!integerBetween(authoring?.continuityExcerptCharacters, 200, 6000)
    || !integerBetween(authoring?.continuityHistoryDepth, 1, 8)
    || !integerBetween(authoring?.projectVideoDirectionMaximumCharacters, 100, 4000)) invalid('Invalid Cinematic continuity policy.');
  if (!integerBetween(authoring?.defaultChapterCount, 1, 120)
    || !integerBetween(authoring?.defaultChapterDurationSeconds, 1, 86400)
    || !integerBetween(authoring?.storyRevisionHistoryLimit, 1, 100)
    || !integerBetween(authoring?.fullStoryMaximumCharacters, 1000, 100000)
    || !integerBetween(authoring?.fullStoryInstructionMaximumCharacters, 100, 10000)
    || !integerBetween(authoring?.generatedChapterMaximum, 1, 120)
    || !integerBetween(authoring?.chapterOutlineMaximumOutputTokens, 1000, 8000)
    || !integerBetween(authoring?.chapterOutlineSynopsisMaximumCharacters, 100, 2000)
    || !integerBetween(authoring?.generatedSceneMaximum, 1, 24)
    || !integerBetween(authoring?.sceneProposalHistoryLimit, 1, 50)
    || !integerBetween(authoring?.generatedShotMaximumPerScene, 1, 24)
    || !integerBetween(authoring?.shotProposalHistoryLimit, 1, 50)
    || !integerBetween(authoring?.shotDocumentMaximumCharacters, 1000, 50000)
    || !integerBetween(authoring?.videoPromptMaximumCharacters, 1000, 50000)
    || typeof authoring?.storyPlanningRequiresFinalLooks !== 'boolean'
    || typeof authoring?.recommendFirstFrame !== 'boolean'
    || typeof authoring?.defaultAudioEnabled !== 'boolean') invalid('Invalid Cinematic authoring defaults.');
  const dialogue = value.dialogue;
  const storyImport = value.storyImport;
  if (!exactValues(storyImport?.extensions, ['.md', '.txt'])
    || !integerBetween(storyImport?.maximumBytes, 1024, 1048576)
    || !integerBetween(storyImport?.fullStoryThresholdCharacters, 1, authoring.fullStoryMaximumCharacters)) {
    invalid('Invalid Cinematic story import policy.');
  }
  if (typeof dialogue?.defaultTargetRatio !== 'number' || dialogue.defaultTargetRatio < 0 || dialogue.defaultTargetRatio > 1
    || !validIds(dialogue?.exemptScenePurposes, 12)) invalid('Invalid Cinematic dialogue policy.');
  const bounds = value.bounds;
  for (const key of ['chapterPageSize', 'assetPageSize', 'assetPageSizeMaximum', 'takePageSize', 'retainedAssetPages']) {
    if (!integerBetween(bounds?.[key], 1, 200)) invalid(`Invalid Cinematic bound: ${key}.`);
  }
  if (bounds.assetPageSize > bounds.assetPageSizeMaximum) invalid('Default asset page size exceeds its maximum.');
  return deepFreeze(structuredClone(value));
}

export function validateCinematicProductionAssets(value) {
  assertHeader(value, 'production assets');
  const sheet = value.expressionSheet;
  if (!integerBetween(sheet?.columns, 1, 12) || !integerBetween(sheet?.rows, 1, 12)
    || !Array.isArray(sheet?.slots) || sheet.slots.length !== sheet.columns * sheet.rows) {
    invalid('Invalid Cinematic expression sheet dimensions.');
  }
  const ids = new Set();
  const cells = new Set();
  for (const slot of sheet.slots) {
    if (!validId(slot?.id) || ids.has(slot.id)
      || !Number.isInteger(slot.column) || slot.column < 0 || slot.column >= sheet.columns
      || !Number.isInteger(slot.row) || slot.row < 0 || slot.row >= sheet.rows
      || cells.has(`${slot.column}:${slot.row}`)) invalid('Invalid or duplicate Cinematic expression slot.');
    ids.add(slot.id); cells.add(`${slot.column}:${slot.row}`);
  }
  const views = value.environmentViews;
  if (!validIds(views?.ids, 12) || !views.ids.includes(views.default)) invalid('Invalid Cinematic environment views.');
  const requiredPriority = ['composition', 'character-look', 'hero-prop', 'expression', 'environment'];
  if (!Array.isArray(value.referencePriority) || value.referencePriority.length !== requiredPriority.length
    || new Set(value.referencePriority).size !== requiredPriority.length
    || requiredPriority.some(id => !value.referencePriority.includes(id))) invalid('Invalid Cinematic reference priority.');
  return deepFreeze(structuredClone(value));
}

export function resolveCinematicRewampExposure(environment = process.env) {
  return parseBoolean(environment.CINEMATIC_REWAMP_ENABLED, false);
}

export const cinematicWorkflowPolicy = validateCinematicWorkflowPolicy(JSON.parse(fs.readFileSync(workflowUrl, 'utf8')));
export const cinematicProductionAssets = validateCinematicProductionAssets(JSON.parse(fs.readFileSync(assetsUrl, 'utf8')));

export function getPublicCinematicRewampConfiguration(environment = process.env) {
  const publicValue = {
    enabled: resolveCinematicRewampExposure(environment),
    workflow: cinematicWorkflowPolicy,
    productionAssets: cinematicProductionAssets
  };
  return deepFreeze({
    ...structuredClone(publicValue),
    fingerprint: crypto.createHash('sha256').update(JSON.stringify(publicValue)).digest('hex').slice(0, 16)
  });
}

function assertHeader(value, label) {
  if (value?.schemaVersion !== 1 || !validId(value?.id) || !integerBetween(value?.version, 1, Number.MAX_SAFE_INTEGER)) {
    invalid(`Invalid Cinematic ${label} policy header.`);
  }
}
function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (String(value).toLowerCase() === 'true') return true;
  if (String(value).toLowerCase() === 'false') return false;
  invalid('CINEMATIC_REWAMP_ENABLED must be true or false.');
}
function validIds(value, maximum) {
  return Array.isArray(value) && value.length > 0 && value.length <= maximum
    && new Set(value).size === value.length && value.every(validId);
}
function exactIds(value, expected) {
  return Array.isArray(value) && value.length === expected.length
    && new Set(value).size === value.length && expected.every(item => value.includes(item));
}
function exactValues(value, expected) {
  return Array.isArray(value) && value.length === expected.length
    && new Set(value).size === value.length && expected.every(item => value.includes(item));
}
function validId(value) { return typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value); }
function integerBetween(value, minimum, maximum) { return Number.isInteger(value) && value >= minimum && value <= maximum; }
function invalid(message) { throw new TypeError(message); }
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
