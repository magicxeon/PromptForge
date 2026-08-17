import crypto from 'node:crypto';
import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

export const ATTRIBUTE_CATALOG_SCHEMA_VERSION = 1;

export function stableCatalogStringify(value) {
  return JSON.stringify(sortObject(value));
}

export function catalogFingerprint(value) {
  return crypto
    .createHash('sha256')
    .update(stableCatalogStringify(value))
    .digest('hex');
}

export function createShadowCatalogRelease({ bundle, inventory, createdAt = new Date().toISOString() }) {
  assertBundleShape(bundle);
  const bundleFingerprint = catalogFingerprint(bundle);
  const inventoryFingerprint = catalogFingerprint(inventory);
  return {
    schemaVersion: ATTRIBUTE_CATALOG_SCHEMA_VERSION,
    id: `attrrel_shadow_${bundleFingerprint.slice(0, 16)}`,
    status: 'shadow',
    bundleFingerprint,
    inventoryFingerprint,
    createdAt,
    bundle: structuredClone(bundle),
    inventorySummary: summarizeInventory(inventory)
  };
}

export function compileCatalogRelease(release) {
  if (!release || release.schemaVersion !== ATTRIBUTE_CATALOG_SCHEMA_VERSION) {
    throw catalogError('attribute_catalog_release_invalid', 'Attribute Catalog release is invalid.');
  }
  assertBundleShape(release.bundle);
  const actualFingerprint = catalogFingerprint(release.bundle);
  if (actualFingerprint !== release.bundleFingerprint) {
    throw catalogError(
      'attribute_catalog_release_fingerprint_mismatch',
      'Attribute Catalog release content does not match its fingerprint.'
    );
  }
  return structuredClone(release.bundle);
}

export function assertBundleShape(bundle) {
  if (
    !bundle
    || typeof bundle !== 'object'
    || !Array.isArray(bundle.library)
    || !Array.isArray(bundle.order)
    || bundle.schema === undefined
    || bundle.templates === undefined
    || bundle.presets === undefined
  ) {
    throw catalogError('attribute_catalog_bundle_invalid', 'Attribute bundle is invalid.');
  }
  return bundle;
}

export function validateInventory(inventory) {
  const errors = [];
  const warnings = [];
  if (inventory.attributeFiles?.length !== 25) {
    errors.push(issue(
      'attribute_catalog_source_count_mismatch',
      `Expected 25 Attribute source files but found ${inventory.attributeFiles?.length || 0}.`
    ));
  }
  if (inventory.fieldManifests?.length !== 19) {
    errors.push(issue(
      'attribute_catalog_manifest_count_mismatch',
      `Expected 19 field manifests but found ${inventory.fieldManifests?.length || 0}.`
    ));
  }
  for (const id of inventory.duplicateAttributeIds || []) {
    errors.push(issue('attribute_catalog_duplicate_option_id', `Duplicate Attribute ID: ${id}`, id));
  }
  for (const item of inventory.missingVisualAttributeIds || []) {
    warnings.push(issue(
      'attribute_catalog_visual_attribute_missing',
      `Visual item ${item.assetId} does not declare a canonical Attribute ID.`,
      item.assetId
    ));
  }
  for (const manifest of inventory.unindexedFieldManifests || []) {
    warnings.push(issue(
      'attribute_catalog_manifest_unindexed',
      `Visual manifest ${manifest.file} exists on disk but is not referenced by a runtime index.`,
      manifest.manifestId
    ));
  }
  for (const item of inventory.unknownVisualAttributeIds || []) {
    errors.push(issue(
      'attribute_catalog_visual_attribute_unknown',
      `Visual item ${item.assetId} references unknown Attribute ID ${item.attributeId}.`,
      item.assetId
    ));
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function summarizeInventory(inventory = {}) {
  return {
    attributeFileCount: inventory.attributeFiles?.length || 0,
    attributeOptionCount: inventory.attributeOptionCount || 0,
    enabledAttributeOptionCount: inventory.enabledAttributeOptionCount || 0,
    specFileCount: inventory.specFiles?.length || 0,
    manifestIndexCount: inventory.manifestIndexes?.length || 0,
    fieldManifestCount: inventory.fieldManifests?.length || 0,
    indexedFieldManifestCount: inventory.indexedFieldManifestCount || 0,
    unindexedFieldManifestCount: inventory.unindexedFieldManifests?.length || 0,
    visualItemCount: inventory.visualItemCount || 0
  };
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, sortObject(value[key])])
  );
}

function issue(code, message, entityId = null) {
  return { code, message, entityId };
}

function catalogError(code, message, statusCode = 400) {
  return new RepositoryContractError(code, message, statusCode);
}
