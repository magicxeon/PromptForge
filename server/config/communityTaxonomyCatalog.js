import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const CONFIG_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'community-taxonomy.json');
let cachedCatalog = null;

export async function loadCommunityTaxonomyCatalog({ forceReload = false } = {}) {
  if (cachedCatalog && !forceReload) return structuredClone(cachedCatalog);

  const parsed = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
  validateCommunityTaxonomyCatalog(parsed);
  cachedCatalog = parsed;
  return structuredClone(cachedCatalog);
}

export function validateCommunityTaxonomyCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object') throw new TypeError('Community taxonomy catalog must be an object.');
  if (!catalog.taxonomyVersion) throw new TypeError('Community taxonomy version is required.');
  if (!Array.isArray(catalog.dimensions) || catalog.dimensions.length === 0) {
    throw new TypeError('Community taxonomy must define at least one dimension.');
  }

  const dimensionIds = new Set();
  const tagIds = new Set();
  for (const dimension of catalog.dimensions) {
    if (!dimension?.id || dimensionIds.has(dimension.id)) {
      throw new TypeError(`Community taxonomy dimension is missing or duplicated: ${dimension?.id || 'unknown'}.`);
    }
    dimensionIds.add(dimension.id);
    if (!Array.isArray(dimension.tags) || dimension.tags.length === 0) {
      throw new TypeError(`Community taxonomy dimension "${dimension.id}" has no tags.`);
    }
    for (const tag of dimension.tags) {
      if (!tag?.id || tagIds.has(tag.id)) {
        throw new TypeError(`Community taxonomy tag is missing or duplicated: ${tag?.id || 'unknown'}.`);
      }
      if (!tag.id.startsWith(`${dimension.id}.`)) {
        throw new TypeError(`Community taxonomy tag "${tag.id}" does not belong to "${dimension.id}".`);
      }
      tagIds.add(tag.id);
    }
  }

  return true;
}

export function toPublicCommunityTaxonomyCatalog(catalog) {
  return {
    schemaVersion: catalog.schemaVersion,
    taxonomyVersion: catalog.taxonomyVersion,
    thresholds: structuredClone(catalog.thresholds || {}),
    limits: structuredClone(catalog.limits || {}),
    dimensions: catalog.dimensions.map(dimension => ({
      id: dimension.id,
      labels: structuredClone(dimension.labels || {}),
      tags: dimension.tags.map(tag => ({
        id: tag.id,
        labels: structuredClone(tag.labels || {})
      }))
    }))
  };
}
