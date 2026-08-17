import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  ATTRIBUTES_ROOT,
  VISUAL_CHARACTER_ASSETS_ROOT
} from '../../config/paths.js';
import {
  ATTRIBUTE_SOURCE_FILES,
  ATTRIBUTE_SPEC_FILES,
  VISUAL_MANIFEST_INDEX_FILES
} from '../../config/attributeCatalogSource.js';

export class AttributeCatalogSourceRepository {
  constructor({
    attributesRoot = ATTRIBUTES_ROOT,
    visualAssetsRoot = VISUAL_CHARACTER_ASSETS_ROOT
  } = {}) {
    this.attributesRoot = attributesRoot;
    this.visualAssetsRoot = visualAssetsRoot;
  }

  async createInventory() {
    const attributeFiles = await Promise.all(ATTRIBUTE_SOURCE_FILES.map(file =>
      this.readAttributeFile(file)
    ));
    const specFiles = await Promise.all(ATTRIBUTE_SPEC_FILES.map(file =>
      this.readJsonDescriptor(path.join(this.attributesRoot, 'spec', file), file)
    ));
    const manifestIndexes = await Promise.all(VISUAL_MANIFEST_INDEX_FILES.map(file =>
      this.readManifestIndex(file)
    ));
    const fieldManifests = await this.readFieldManifests(manifestIndexes);
    const attributes = attributeFiles.flatMap(file => file.items);
    const attributeIds = attributes.map(item => item?.id).filter(Boolean);
    const knownAttributeIds = new Set(attributeIds);
    const indexedFieldManifests = fieldManifests.filter(manifest => manifest.indexed);
    const visualItems = indexedFieldManifests.flatMap(manifest => manifest.items.map(item => ({
      manifestId: manifest.manifestId,
      fieldId: manifest.fieldId,
      ...item
    })));

    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      attributeFiles: attributeFiles.map(withoutItems),
      attributeOptionCount: attributes.length,
      enabledAttributeOptionCount: attributes.filter(item => item?.enabled !== false).length,
      duplicateAttributeIds: duplicates(attributeIds),
      specFiles,
      manifestIndexes: manifestIndexes.map(index => ({
        file: index.file,
        schemaVersion: index.schemaVersion,
        visualStyleVersion: index.visualStyleVersion,
        manifestCount: index.manifests.length,
        sha256: index.sha256
      })),
      fieldManifests: fieldManifests.map(manifest => ({
        file: manifest.file,
        manifestId: manifest.manifestId,
        fieldId: manifest.fieldId,
        visualStyleVersion: manifest.visualStyleVersion,
        itemCount: manifest.items.length,
        indexed: manifest.indexed,
        sha256: manifest.sha256
      })),
      indexedFieldManifestCount: indexedFieldManifests.length,
      unindexedFieldManifests: fieldManifests
        .filter(manifest => !manifest.indexed)
        .map(manifest => ({
          file: manifest.file,
          manifestId: manifest.manifestId,
          fieldId: manifest.fieldId
        })),
      visualItemCount: visualItems.length,
      missingVisualAttributeIds: visualItems
        .filter(item => !item.attributeId)
        .map(item => ({ assetId: item.assetId, manifestId: item.manifestId })),
      unknownVisualAttributeIds: visualItems
        .filter(item => item.attributeId && !knownAttributeIds.has(item.attributeId))
        .map(item => ({
          assetId: item.assetId,
          attributeId: item.attributeId,
          manifestId: item.manifestId
        }))
    };
  }

  async readAttributeFile(file) {
    const descriptor = await this.readJsonDescriptor(path.join(this.attributesRoot, file), file);
    const items = Array.isArray(descriptor.value)
      ? descriptor.value
      : Array.isArray(descriptor.value?.entries) ? descriptor.value.entries : [];
    return {
      file,
      itemCount: items.length,
      enabledItemCount: items.filter(item => item?.enabled !== false).length,
      sha256: descriptor.sha256,
      items
    };
  }

  async readManifestIndex(file) {
    const descriptor = await this.readJsonDescriptor(
      path.join(this.visualAssetsRoot, file),
      file
    );
    return {
      file,
      schemaVersion: descriptor.value?.schemaVersion,
      visualStyleVersion: descriptor.value?.visualStyleVersion || null,
      manifests: Array.isArray(descriptor.value?.manifests)
        ? descriptor.value.manifests
        : [],
      sha256: descriptor.sha256
    };
  }

  async readFieldManifests(indexes) {
    const entries = indexes.flatMap(index => index.manifests);
    const indexedFiles = new Set(entries
      .map(entry => entry?.url)
      .filter(Boolean)
      .map(visualUrlToRelativeFile)
      .map(normalizeRelativeFile));
    const files = await findManifestFiles(this.visualAssetsRoot);
    return Promise.all(files.map(async file => {
      const descriptor = await this.readJsonDescriptor(
        path.join(this.visualAssetsRoot, file),
        file
      );
      return {
        file,
        manifestId: descriptor.value?.manifestId || null,
        fieldId: descriptor.value?.fieldId || null,
        visualStyleVersion: descriptor.value?.visualStyleVersion || null,
        items: Array.isArray(descriptor.value?.items) ? descriptor.value.items : [],
        indexed: indexedFiles.has(normalizeRelativeFile(file)),
        sha256: descriptor.sha256
      };
    }));
  }

  async readJsonDescriptor(filePath, file) {
    const raw = await fs.readFile(filePath, 'utf8');
    return {
      file,
      value: JSON.parse(raw),
      bytes: Buffer.byteLength(raw),
      sha256: sha256(raw)
    };
  }
}

function visualUrlToRelativeFile(url) {
  const pathname = String(url).split('?')[0];
  const prefix = '/assets/visual-character-builder/';
  if (!pathname.startsWith(prefix) || pathname.includes('..') || pathname.includes('\\')) {
    throw new Error(`Unsafe visual manifest URL: ${url}`);
  }
  return pathname.slice(prefix.length).replaceAll('/', path.sep);
}

async function findManifestFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && entry.name === 'manifest.json') {
        files.push(normalizeRelativeFile(path.relative(root, absolutePath)));
      }
    }
  }
  await visit(root);
  return files.sort((left, right) => left.localeCompare(right));
}

function normalizeRelativeFile(file) {
  return String(file).replaceAll('\\', '/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value);
    seen.add(value);
  }
  return [...duplicateValues].sort();
}

function withoutItems(file) {
  const { items, ...descriptor } = file;
  return descriptor;
}

export const attributeCatalogSourceRepository = new AttributeCatalogSourceRepository();
