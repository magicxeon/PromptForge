import {
  CINEMATIC_AUTHORING_CONTRACT_VERSION,
  normalizeCinematicAuthoringEnvelope
} from '../../repositories/cinematic/cinematicProjectRecord.js';
import { cinematicFieldManifestService } from './CinematicFieldManifestService.js';

const SOURCES = new Set(['user', 'ai', 'inherited', 'default', 'legacy_inferred']);
const STATUSES = new Set(['current', 'stale', 'missing', 'conflict']);

export class CinematicAuthoringStateService {
  constructor({ manifestService = cinematicFieldManifestService } = {}) {
    this.manifestService = manifestService;
  }

  normalizeProject(project, options) {
    return normalizeCinematicAuthoringEnvelope(project, options);
  }

  resolveFieldState(project, key) {
    this.normalizeProject(project);
    const parsed = parseFieldKey(key);
    this.#assertKnown(parsed.manifestPath);
    const explicit = project.authoringState.fieldStates[key];
    if (explicit) return structuredClone(explicit);
    const hasValue = meaningful(readFieldValue(project, parsed));
    return {
      source: 'legacy_inferred',
      locked: false,
      status: hasValue ? 'current' : 'missing',
      sourceRevision: null,
      recipe: null,
      updatedAt: null,
      updatedByActorId: null
    };
  }

  recordFieldUpdate(project, key, {
    source = 'user', locked = false, status = 'current', sourceRevision = null,
    recipe = null, updatedAt = new Date().toISOString(), updatedByActorId = null
  } = {}) {
    this.normalizeProject(project);
    const parsed = parseFieldKey(key);
    this.#assertKnown(parsed.manifestPath);
    if (!SOURCES.has(source)) throw new TypeError(`Unknown Cinematic field source: ${source}.`);
    if (!STATUSES.has(status)) throw new TypeError(`Unknown Cinematic field status: ${status}.`);
    const field = this.manifestService.getField(parsed.manifestPath);
    if (!field.authorities.includes(source)) {
      throw new TypeError(`${parsed.manifestPath} does not allow ${source} authority.`);
    }
    const next = {
      source,
      locked: locked === true,
      status,
      sourceRevision: textOrNull(sourceRevision),
      recipe: normalizeRecipe(recipe),
      updatedAt: textOrNull(updatedAt),
      updatedByActorId: textOrNull(updatedByActorId)
    };
    project.authoringState.fieldStates[key] = next;
    project.authoringState.inferenceMode = 'explicit';
    return structuredClone(next);
  }

  setFieldLock(project, key, locked, { actorId = null, updatedAt = new Date().toISOString() } = {}) {
    const current = this.resolveFieldState(project, key);
    const parsed = parseFieldKey(key);
    this.#assertKnown(parsed.manifestPath);
    const next = {
      ...current,
      source: locked ? 'user' : current.source,
      locked: locked === true,
      updatedAt,
      updatedByActorId: textOrNull(actorId)
    };
    project.authoringState.fieldStates[key] = next;
    project.authoringState.inferenceMode = 'explicit';
    return structuredClone(next);
  }

  markDependentsStale(project, changedKeys, { sourceRevision = null, updatedAt = new Date().toISOString() } = {}) {
    this.normalizeProject(project);
    const staleKeys = [];
    for (const changedKey of [...new Set(changedKeys || [])]) {
      const context = parseFieldKey(changedKey);
      this.#assertKnown(context.manifestPath);
      const dependentPaths = this.manifestService.getDependents(context.manifestPath);
      for (const dependentPath of dependentPaths) {
        for (const key of enumerateFieldKeys(project, dependentPath, context)) {
          if (key === changedKey) continue;
          const current = this.resolveFieldState(project, key);
          if (current.locked || current.source === 'user' || current.status === 'missing') continue;
          project.authoringState.fieldStates[key] = {
            ...current,
            status: 'stale',
            sourceRevision: textOrNull(sourceRevision) || current.sourceRevision,
            updatedAt
          };
          staleKeys.push(key);
        }
      }
    }
    return [...new Set(staleKeys)];
  }

  #assertKnown(manifestPath) {
    if (!this.manifestService.getField(manifestPath)) {
      throw new TypeError(`Unknown Cinematic authoring field: ${manifestPath}.`);
    }
  }
}

export function cinematicFieldKey({ entity, field, id = null, planId = null, sceneId = null }) {
  if (entity === 'setup') return `setup.${field}`;
  if (entity === 'cast' || entity === 'plan' || entity === 'scene') return `${entity}:${id}.${field}`;
  if (entity === 'beat') return `beat:${planId}:${id}.${field}`;
  if (entity === 'shot') return `shot:${sceneId}:${id}.${field}`;
  throw new TypeError(`Unknown Cinematic field entity: ${entity}.`);
}

export function parseFieldKey(key) {
  const normalized = String(key || '').trim();
  const separator = normalized.lastIndexOf('.');
  if (separator <= 0 || separator === normalized.length - 1) throw new TypeError(`Invalid Cinematic field key: ${normalized}.`);
  const scope = normalized.slice(0, separator);
  const field = normalized.slice(separator + 1);
  if (scope === 'setup') return { key: normalized, entity: 'setup', field, manifestPath: `setup.${field}` };
  const [entity, ...ids] = scope.split(':');
  if (entity === 'cast' || entity === 'plan' || entity === 'scene') {
    if (ids.length !== 1 || !ids[0]) throw new TypeError(`Invalid Cinematic field key: ${normalized}.`);
    return { key: normalized, entity, id: ids[0], field, manifestPath: `${entity}.${field}` };
  }
  if (entity === 'beat') {
    if (ids.length !== 2 || ids.some(value => !value)) throw new TypeError(`Invalid Cinematic field key: ${normalized}.`);
    return { key: normalized, entity, planId: ids[0], id: ids[1], field, manifestPath: `beat.${field}` };
  }
  if (entity === 'shot') {
    if (ids.length !== 2 || ids.some(value => !value)) throw new TypeError(`Invalid Cinematic field key: ${normalized}.`);
    return { key: normalized, entity, sceneId: ids[0], id: ids[1], field, manifestPath: `shot.${field}` };
  }
  throw new TypeError(`Invalid Cinematic field key: ${normalized}.`);
}

function enumerateFieldKeys(project, manifestPath, context) {
  const [entity, field] = manifestPath.split('.');
  if (entity === 'setup') return [`setup.${field}`];
  if (entity === 'cast') {
    const assignments = context.entity === 'cast'
      ? project.castAssignments.filter(item => item.id === context.id)
      : project.castAssignments;
    return assignments.map(item => cinematicFieldKey({ entity, id: item.id, field }));
  }
  const plans = relevantPlans(project, context);
  if (entity === 'plan') return plans.map(plan => cinematicFieldKey({ entity, id: plan.id, field }));
  if (entity === 'beat') {
    return plans.flatMap(plan => plan.beats.filter(beat => context.entity !== 'beat' || beat.id === context.id)
      .map(beat => cinematicFieldKey({ entity, planId: plan.id, id: beat.id, field })));
  }
  const scenes = relevantScenes(project, context, plans);
  if (entity === 'scene') return scenes.map(scene => cinematicFieldKey({ entity, id: scene.id, field }));
  if (entity === 'shot') {
    return scenes.flatMap(scene => scene.shots
      .filter(shot => context.entity !== 'shot' || shot.id === context.id)
      .map(shot => cinematicFieldKey({ entity, sceneId: scene.id, id: shot.id, field })));
  }
  return [];
}

function relevantPlans(project, context) {
  if (context.entity === 'plan' || context.entity === 'beat') {
    return project.storyPlanVersions.filter(plan => plan.id === (context.planId || context.id));
  }
  const selected = project.storyPlanVersions.find(plan => plan.id === project.activeStoryPlanVersionId)
    || project.storyPlanVersions.at(-1);
  return selected ? [selected] : [];
}

function relevantScenes(project, context, plans) {
  if (context.entity === 'scene' || context.entity === 'shot') {
    return project.scenes.filter(scene => scene.id === (context.sceneId || context.id));
  }
  if (context.entity === 'beat') return project.scenes.filter(scene => scene.beatId === context.id);
  if (context.entity === 'cast') {
    return project.scenes.filter(scene => scene.castAssignmentIds.includes(context.id)
      || scene.shots.some(shot => shot.castAssignmentIds.includes(context.id)));
  }
  const sceneIds = new Set(plans.flatMap(plan => plan.sceneIds || []));
  return project.scenes.filter(scene => !sceneIds.size || sceneIds.has(scene.id));
}

function readFieldValue(project, parsed) {
  if (parsed.entity === 'setup') return project.setup?.[parsed.field];
  if (parsed.entity === 'cast') return project.castAssignments.find(item => item.id === parsed.id)?.[parsed.field];
  if (parsed.entity === 'plan') return project.storyPlanVersions.find(item => item.id === parsed.id)?.[parsed.field];
  if (parsed.entity === 'beat') {
    return project.storyPlanVersions.find(item => item.id === parsed.planId)?.beats.find(item => item.id === parsed.id)?.[parsed.field];
  }
  if (parsed.entity === 'scene') return project.scenes.find(item => item.id === parsed.id)?.[parsed.field];
  if (parsed.entity === 'shot') {
    return project.scenes.find(item => item.id === parsed.sceneId)?.shots.find(item => item.id === parsed.id)?.[parsed.field];
  }
  return undefined;
}

function meaningful(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function normalizeRecipe(value) {
  if (!value) return null;
  const recipe = {
    id: textOrNull(value.id),
    version: Number.isInteger(value.version) ? value.version : null,
    fingerprint: textOrNull(value.fingerprint)
  };
  return recipe.id && recipe.version && recipe.fingerprint ? recipe : null;
}

function textOrNull(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export { CINEMATIC_AUTHORING_CONTRACT_VERSION };
export const cinematicAuthoringStateService = new CinematicAuthoringStateService();

