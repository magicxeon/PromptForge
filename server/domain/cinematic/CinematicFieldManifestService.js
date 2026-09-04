import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = path.resolve(__dirname, '../../config/cinematic');
const DEFAULT_PATHS = Object.freeze({
  manifest: path.resolve(CONFIG_ROOT, 'authoring-field-manifest.v1.json'),
  dependencies: path.resolve(CONFIG_ROOT, 'field-dependencies.v1.json'),
  readinessPolicy: path.resolve(CONFIG_ROOT, 'readiness-policy.v1.json')
});

const ENTITIES = new Set(['setup', 'cast', 'plan', 'beat', 'scene', 'shot']);
const VISIBILITY = new Set(['simple', 'advanced', 'system']);
const REQUIREMENTS = new Set(['required', 'optional', 'derived']);
const AUTHORITIES = new Set(['user', 'ai', 'inherited', 'default', 'legacy_inferred']);
const CONSUMERS = new Set(['cast', 'story-plan', 'storyboard', 'produce', 'finish']);

export class CinematicFieldManifestService {
  constructor({ paths = DEFAULT_PATHS, manifest, dependencies, readinessPolicy } = {}) {
    const loaded = {
      manifest: manifest || loadJson(paths.manifest),
      dependencies: dependencies || loadJson(paths.dependencies),
      readinessPolicy: readinessPolicy || loadJson(paths.readinessPolicy)
    };
    this.manifest = validateManifest(loaded.manifest);
    this.dependencies = validateDependencies(loaded.dependencies, this.manifest);
    this.readinessPolicy = validateReadinessPolicy(loaded.readinessPolicy, this.manifest);
    this.fingerprint = fingerprint({
      manifest: this.manifest,
      dependencies: this.dependencies,
      readinessPolicy: this.readinessPolicy
    });
    this.fieldByPath = new Map(this.manifest.fields.map(field => [field.path, field]));
    this.dependents = buildDependents(this.dependencies.dependencies);
  }

  getPublicManifest() {
    return structuredClone({
      schemaVersion: this.manifest.schemaVersion,
      id: this.manifest.id,
      version: this.manifest.version,
      fingerprint: this.fingerprint,
      fields: this.manifest.fields,
      readiness: this.readinessPolicy.stages
    });
  }

  getField(pathValue) {
    const field = this.fieldByPath.get(String(pathValue || '').trim());
    return field ? structuredClone(field) : null;
  }

  getDependents(pathValue, { transitive = true } = {}) {
    const root = String(pathValue || '').trim();
    if (!this.fieldByPath.has(root)) return [];
    const result = new Set();
    const pending = [...(this.dependents.get(root) || [])];
    while (pending.length) {
      const target = pending.shift();
      if (!target || result.has(target)) continue;
      result.add(target);
      if (transitive) pending.push(...(this.dependents.get(target) || []));
    }
    return [...result];
  }
}

function loadJson(filePath) {
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(`${CONFIG_ROOT}${path.sep}`)) {
    throw new TypeError('Cinematic configuration must remain under server/config/cinematic.');
  }
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function validateManifest(value) {
  assertHeader(value, 'field manifest');
  if (!Array.isArray(value.fields) || !value.fields.length) invalid('Field manifest requires fields.');
  const paths = new Set();
  const fields = value.fields.map((field, index) => {
    if (!field || typeof field !== 'object') invalid(`Field ${index} must be an object.`);
    const pathValue = text(field.path);
    const [entity, name, ...rest] = pathValue.split('.');
    if (!ENTITIES.has(entity) || !name || rest.length) invalid(`Unknown canonical field path: ${pathValue}.`);
    if (paths.has(pathValue)) invalid(`Duplicate canonical field path: ${pathValue}.`);
    paths.add(pathValue);
    if (!text(field.group)) invalid(`${pathValue} requires a group.`);
    if (!VISIBILITY.has(field.visibility)) invalid(`${pathValue} has invalid visibility.`);
    if (!REQUIREMENTS.has(field.requirement)) invalid(`${pathValue} has invalid requirement.`);
    if (!Array.isArray(field.authorities) || !field.authorities.length
      || field.authorities.some(item => !AUTHORITIES.has(item))) invalid(`${pathValue} has invalid authorities.`);
    if (!Array.isArray(field.consumers) || field.consumers.some(item => !CONSUMERS.has(item))) {
      invalid(`${pathValue} has invalid consumers.`);
    }
    if (!text(field.localizationKey)) invalid(`${pathValue} requires a localization key.`);
    if (field.maxLength != null && (!Number.isInteger(field.maxLength) || field.maxLength <= 0)) {
      invalid(`${pathValue} has invalid maxLength.`);
    }
    return structuredClone(field);
  });
  return Object.freeze({ schemaVersion: 1, id: value.id, version: value.version, fields: Object.freeze(fields) });
}

function validateDependencies(value, manifest) {
  assertHeader(value, 'field dependencies');
  if (!Array.isArray(value.dependencies)) invalid('Field dependencies must be an array.');
  const known = new Set(manifest.fields.map(field => field.path));
  const sourcePaths = new Set();
  const dependencies = value.dependencies.map((rule, index) => {
    const source = text(rule?.source);
    if (!known.has(source)) invalid(`Dependency ${index} has unknown source: ${source}.`);
    if (sourcePaths.has(source)) invalid(`Dependency source is duplicated: ${source}.`);
    sourcePaths.add(source);
    if (!Array.isArray(rule.targets) || !rule.targets.length) invalid(`Dependency ${source} requires targets.`);
    const targets = [...new Set(rule.targets.map(text))];
    for (const target of targets) {
      if (!known.has(target)) invalid(`Dependency ${source} has unknown target: ${target}.`);
      if (target === source) invalid(`Dependency ${source} cannot depend on itself.`);
    }
    return { source, targets };
  });
  assertAcyclic(dependencies);
  return Object.freeze({ schemaVersion: 1, id: value.id, version: value.version, dependencies: Object.freeze(dependencies) });
}

function validateReadinessPolicy(value, manifest) {
  assertHeader(value, 'readiness policy');
  if (!value.stages || typeof value.stages !== 'object') invalid('Readiness policy requires stages.');
  const known = new Set(manifest.fields.map(field => field.path));
  const stages = {};
  for (const [stage, policy] of Object.entries(value.stages)) {
    if (!policy || !Array.isArray(policy.requiredPaths)) invalid(`Readiness stage ${stage} requires requiredPaths.`);
    const requiredPaths = [...new Set(policy.requiredPaths.map(text))];
    for (const fieldPath of requiredPaths) {
      if (!known.has(fieldPath)) invalid(`Readiness stage ${stage} has unknown path: ${fieldPath}.`);
    }
    stages[stage] = { requiredPaths };
  }
  return Object.freeze({ schemaVersion: 1, id: value.id, version: value.version, stages: Object.freeze(stages) });
}

function assertHeader(value, label) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1
    || !text(value.id) || !Number.isInteger(value.version) || value.version <= 0) {
    invalid(`Cinematic ${label} header is invalid.`);
  }
}

function assertAcyclic(dependencies) {
  const graph = buildDependents(dependencies);
  const visiting = new Set();
  const visited = new Set();
  const visit = node => {
    if (visiting.has(node)) invalid(`Cinematic field dependency cycle includes ${node}.`);
    if (visited.has(node)) return;
    visiting.add(node);
    for (const target of graph.get(node) || []) visit(target);
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of graph.keys()) visit(node);
}

function buildDependents(dependencies) {
  const graph = new Map();
  for (const rule of dependencies) {
    if (!graph.has(rule.source)) graph.set(rule.source, new Set());
    for (const target of rule.targets) graph.get(rule.source).add(target);
  }
  return graph;
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function text(value) {
  return String(value || '').trim();
}

function invalid(message) {
  throw new TypeError(message);
}

export const cinematicFieldManifestService = new CinematicFieldManifestService();

