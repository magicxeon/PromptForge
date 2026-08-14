import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
const AUTHORING_DIR = path.join(ROOT_DIR, 'visual-assets/character-builder');
const RUNTIME_ROOT = path.join(ROOT_DIR, 'client/assets/visual-character-builder');
const RUNTIME_EXTENSION_FILE = path.join(
  AUTHORING_DIR,
  'runtime-manifest-extensions.json'
);
const RUNTIME_MANIFEST_REVISION = '3';
const ATTRIBUTE_FILES = [
  path.join(ROOT_DIR, 'attributes/002-face.json'),
  path.join(ROOT_DIR, 'attributes/003-eyes.json'),
  path.join(ROOT_DIR, 'attributes/004-eyebrows.json'),
  path.join(ROOT_DIR, 'attributes/005-nose.json'),
  path.join(ROOT_DIR, 'attributes/006-lips.json'),
  path.join(ROOT_DIR, 'attributes/009-body.json'),
  path.join(ROOT_DIR, 'attributes/010-clothing.json'),
  path.join(ROOT_DIR, 'attributes/024-fashion-commerce.json'),
  path.join(ROOT_DIR, 'attributes/025-facial-hair.json')
];

const FIELD_MANIFESTS = {
  'face.shape': path.join(AUTHORING_DIR, 'manifests/headshot/face-structure/face-shape.manifest.json'),
  'eyes.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/eyes.manifest.json'),
  'eyebrows.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/eyebrows.manifest.json'),
  'nose.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/nose.manifest.json'),
  'lips.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/lips.manifest.json'),
  'facial_hair.style': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/facial-hair.manifest.json'),
  'expression.face': path.join(AUTHORING_DIR, 'manifests/headshot/expression/face-expression.manifest.json'),
  'hair.length': path.join(AUTHORING_DIR, 'manifests/headshot/hair/length.manifest.json'),
  'hair.cut_style': path.join(AUTHORING_DIR, 'manifests/headshot/hair/cut-style.manifest.json'),
  'hair.texture': path.join(AUTHORING_DIR, 'manifests/headshot/hair/texture.manifest.json'),
  'hair.parting_fringe': path.join(AUTHORING_DIR, 'manifests/headshot/hair/parting-fringe.manifest.json'),
  'body.silhouette': path.join(AUTHORING_DIR, 'manifests/character-sheet/body-silhouette.manifest.template.json'),
  'body.silhouette.female': path.join(AUTHORING_DIR, 'manifests/character-sheet/body-silhouette-female.manifest.template.json'),
  'body.silhouette.male': path.join(AUTHORING_DIR, 'manifests/character-sheet/body-silhouette-male.manifest.template.json'),
  'body.build': path.join(AUTHORING_DIR, 'manifests/character-sheet/body-build.manifest.template.json'),
  'clothing.outfit-base': path.join(AUTHORING_DIR, 'manifests/character-sheet/clothing-outfit-base.manifest.template.json'),
  'clothing.outfit-base.female': path.join(AUTHORING_DIR, 'manifests/character-sheet/clothing-outfit-base-female.manifest.template.json'),
  'clothing.outfit-base.male': path.join(AUTHORING_DIR, 'manifests/character-sheet/clothing-outfit-base-male.manifest.template.json'),
  'sheet.layout': path.join(AUTHORING_DIR, 'manifests/character-sheet/sheet-layout.manifest.template.json')
};
const FIELD_FOLDERS = {
  'face.shape': 'face-shape',
  'eyes.shape': 'eyes',
  'eyebrows.shape': 'eyebrows',
  'nose.shape': 'nose',
  'lips.shape': 'lips',
  'facial_hair.style': 'facial-hair',
  'expression.face': 'face-expression',
  'hair.length': 'length',
  'hair.cut_style': 'cut-style',
  'hair.texture': 'texture',
  'hair.parting_fringe': 'parting-fringe',
  'body.silhouette': 'body-silhouette',
  'body.silhouette.female': 'body-silhouette-female',
  'body.silhouette.male': 'body-silhouette-male',
  'body.build': 'body-build',
  'clothing.outfit-base': 'outfit-base',
  'clothing.outfit-base.female': 'outfit-base-female',
  'clothing.outfit-base.male': 'outfit-base-male',
  'sheet.layout': 'sheet-layout'
};
const FIELD_GROUPS = {
  headshot: [
    'face.shape',
    'eyes.shape',
    'eyebrows.shape',
    'nose.shape',
    'lips.shape',
    'facial_hair.style',
    'expression.face',
    'hair.length',
    'hair.cut_style',
    'hair.texture',
    'hair.parting_fringe'
  ],
  'character-sheet': [
    'body.silhouette',
    'body.silhouette.female',
    'body.silhouette.male',
    'body.build',
    'clothing.outfit-base',
    'clothing.outfit-base.female',
    'clothing.outfit-base.male',
    'sheet.layout'
  ]
};
const PUBLISH_READY_REVIEW_STATUSES = new Set([
  'approved',
  'source-selected',
  'override-approved'
]);
const RUNTIME_MANIFESTS = [
  {
    fieldId: 'face.shape',
    manifestId: 'headshot.face-structure.face-shape',
    sectionId: 'face-structure',
    folder: 'face-shape'
  },
  {
    fieldId: 'eyes.shape',
    manifestId: 'headshot.facial-features.eyes',
    sectionId: 'facial-features',
    folder: 'eyes'
  },
  {
    fieldId: 'eyebrows.shape',
    manifestId: 'headshot.facial-features.eyebrows',
    sectionId: 'facial-features',
    folder: 'eyebrows'
  },
  {
    fieldId: 'nose.shape',
    manifestId: 'headshot.facial-features.nose',
    sectionId: 'facial-features',
    folder: 'nose'
  },
  {
    fieldId: 'lips.shape',
    manifestId: 'headshot.facial-features.lips',
    sectionId: 'facial-features',
    folder: 'lips'
  },
  {
    fieldId: 'facial_hair.style',
    manifestId: 'headshot.facial-features.facial-hair',
    sectionId: 'facial-features',
    folder: 'facial-hair'
  },
  {
    fieldId: 'expression.face',
    manifestId: 'headshot.expression.face-expression',
    sectionId: 'expression',
    folder: 'face-expression'
  },
  {
    fieldId: 'hair.length',
    manifestId: 'headshot.hair.length',
    sectionId: 'hair',
    folder: 'length'
  },
  {
    fieldId: 'hair.cut_style',
    manifestId: 'headshot.hair.cut-style',
    sectionId: 'hair',
    folder: 'cut-style'
  },
  {
    fieldId: 'hair.texture',
    manifestId: 'headshot.hair.texture',
    sectionId: 'hair',
    folder: 'texture'
  },
  {
    fieldId: 'hair.parting_fringe',
    manifestId: 'headshot.hair.parting-fringe',
    sectionId: 'hair',
    folder: 'parting-fringe'
  },
  {
    fieldId: 'body.silhouette',
    manifestId: 'character-sheet.body.body-silhouette',
    sectionId: 'body',
    folder: 'body-silhouette'
  },
  {
    fieldId: 'body.silhouette.female',
    manifestId: 'character-sheet.body.body-silhouette-female',
    sectionId: 'body',
    folder: 'body-silhouette-female'
  },
  {
    fieldId: 'body.silhouette.male',
    manifestId: 'character-sheet.body.body-silhouette-male',
    sectionId: 'body',
    folder: 'body-silhouette-male'
  },
  {
    fieldId: 'body.build',
    manifestId: 'character-sheet.body.body-build',
    sectionId: 'body',
    folder: 'body-build'
  },
  {
    fieldId: 'clothing.outfit-base',
    manifestId: 'character-sheet.clothing.outfit-base',
    sectionId: 'clothing',
    folder: 'outfit-base'
  },
  {
    fieldId: 'clothing.outfit-base.female',
    manifestId: 'character-sheet.clothing.outfit-base-female',
    sectionId: 'clothing',
    folder: 'outfit-base-female'
  },
  {
    fieldId: 'clothing.outfit-base.male',
    manifestId: 'character-sheet.clothing.outfit-base-male',
    sectionId: 'clothing',
    folder: 'outfit-base-male'
  },
  {
    fieldId: 'sheet.layout',
    manifestId: 'character-sheet.layout.sheet-layout',
    sectionId: 'layout',
    folder: 'sheet-layout'
  }
];

export function parseArgs(argv) {
  const fieldEqualsArg = argv.find(arg => arg.startsWith('--field='));
  const fieldFlagIndex = argv.indexOf('--field');
  return {
    fieldId: fieldEqualsArg
      ? fieldEqualsArg.slice('--field='.length)
      : fieldFlagIndex >= 0
        ? argv[fieldFlagIndex + 1] || 'face.shape'
        : 'face.shape',
    check: argv.includes('--check'),
    slice: argv.includes('--slice'),
    extensions: argv.includes('--extensions'),
    contactSheet: argv.includes('--contact-sheet') || argv.includes('--slice')
  };
}

export async function run(options = parseArgs(process.argv.slice(2))) {
  if (options.extensions) {
    const report = await materializeAllRuntimeExtensions();
    printReport(report);
    return report;
  }

  const groupedFieldIds = FIELD_GROUPS[options.fieldId];
  if (groupedFieldIds) {
    const reports = [];
    for (const fieldId of groupedFieldIds) {
      reports.push(await run({ ...options, fieldId }));
    }
    return { fieldGroup: options.fieldId, reports, ok: reports.every(report => report.ok) };
  }

  const manifestPath = FIELD_MANIFESTS[options.fieldId];
  if (!manifestPath) {
    throw new Error(`Unknown visual asset field: ${options.fieldId}`);
  }

  const manifest = await readJson(manifestPath);
  const paths = resolveManifestPaths(manifest);
  const report = await validateManifest(manifest, paths);

  if (options.check && !options.slice && !options.contactSheet) {
    printReport(report);
    return report;
  }

  if (options.slice) {
    const sourceExists = await fileExists(paths.sourcePath);
    if (!sourceExists) {
      throw new Error(`Missing source sheet. Place it at ${paths.sourcePath}`);
    }
    const result = await sliceManifest(manifest, paths);
    report.outputs = result.outputs;
    report.runtimeManifest = result.runtimeManifestPath;
    report.indexManifest = result.indexManifestPath;
    report.contactSheet = result.contactSheetPath;
  } else if (options.contactSheet) {
    report.contactSheet = await createContactSheetFromRuntime(manifest, paths);
  }

  printReport(report);
  return report;
}

async function materializeAllRuntimeExtensions() {
  const sharp = (await import('sharp')).default;
  const extensionDocument = await readJson(RUNTIME_EXTENSION_FILE);
  const reports = [];

  for (const fieldId of Object.keys(extensionDocument.fields || {})) {
    const manifestPath = FIELD_MANIFESTS[fieldId];
    if (!manifestPath) throw new Error(`Unknown extension visual field: ${fieldId}`);
    const manifest = await readJson(manifestPath);
    const paths = resolveManifestPaths(manifest);
    const runtimeManifestPath = path.join(paths.runtimeDirectory, 'manifest.json');
    if (!await fileExists(runtimeManifestPath)) {
      throw new Error(`${fieldId} runtime manifest must exist before importing approved visuals.`);
    }

    const runtimeManifest = await readJson(runtimeManifestPath);
    const extensionResult = await materializeRuntimeExtensionItems({ sharp, manifest, paths });
    const extensionOptionIds = new Set(extensionResult.items.map(item => item.optionId));
    runtimeManifest.items = [
      ...(runtimeManifest.items || []).filter(item => !extensionOptionIds.has(item.optionId)),
      ...extensionResult.items
    ];
    await atomicWriteJson(runtimeManifestPath, runtimeManifest);
    reports.push({
      fieldId,
      runtimeManifest: path.relative(ROOT_DIR, runtimeManifestPath),
      outputs: extensionResult.outputs
    });
  }

  await writeManifestIndex('headshot-v1');
  return { operation: 'approved-visual-import', ok: true, reports };
}

function resolveManifestPaths(manifest) {
  const style = manifest.visualStyleVersion.replace('-illustrated', '');
  const fieldSlug = fieldIdToFolderName(manifest.fieldId);
  const sourceFieldSlug = manifest.sourceSheet.folder || fieldSlug;
  const sourceDirectory = path.join(
    AUTHORING_DIR,
    'source-sets',
    style,
    manifest.sectionId,
    sourceFieldSlug
  );
  const runtimeDirectory = path.join(
    RUNTIME_ROOT,
    style,
    manifest.sectionId,
    fieldSlug
  );
  const reviewDirectory = path.join(AUTHORING_DIR, 'reviews', style, fieldSlug);
  return {
    style,
    fieldSlug,
    sourceDirectory,
    sourcePath: path.join(sourceDirectory, manifest.sourceSheet.filename),
    overrideDirectory: path.join(sourceDirectory, 'overrides'),
    runtimeDirectory,
    reviewDirectory
  };
}

async function validateManifest(manifest, paths) {
  const errors = [];
  const warnings = [];
  const positions = new Set();
  const optionIds = new Set();
  const slugs = new Set();
  const attributeIds = await readKnownAttributeIds();

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (manifest.assetFamily !== 'illustrated-set') errors.push('assetFamily must be illustrated-set.');
  if (manifest.recolorMode !== 'mask') errors.push('Only mask recolorMode is supported.');

  for (const item of manifest.items || []) {
    const itemSourceSheet = item.sourceSheet || manifest.sourceSheet;
    const sourceKey = `${itemSourceSheet.folder || manifest.sourceSheet.folder || ''}/${itemSourceSheet.filename}`;
    const positionKey = `${sourceKey}:${item.row}:${item.column}`;
    if (positions.has(positionKey)) errors.push(`Duplicate row/column ${positionKey}.`);
    positions.add(positionKey);

    if (optionIds.has(item.optionId)) errors.push(`Duplicate optionId ${item.optionId}.`);
    optionIds.add(item.optionId);

    if (slugs.has(item.slug)) errors.push(`Duplicate slug ${item.slug}.`);
    slugs.add(item.slug);

    if (item.row > itemSourceSheet.rows || item.column > itemSourceSheet.columns) {
      errors.push(`${item.optionId} is outside the declared grid.`);
    }
    if (!item.alt?.en || !item.alt?.th) {
      errors.push(`${item.optionId} needs bilingual alt text.`);
    }
    if (!item.reviewStatus) {
      errors.push(`${item.optionId} needs reviewStatus.`);
    }
    if (item.attributeId && !attributeIds.has(item.attributeId)) {
      errors.push(`${item.optionId} references missing attributeId ${item.attributeId}.`);
    }
  }

  const expectedCount = manifest.sourceSheet.rows * manifest.sourceSheet.columns;
  if (manifest.items.length !== expectedCount) {
    warnings.push(`Item count ${manifest.items.length} differs from declared grid count ${expectedCount}.`);
  }

  if (!await fileExists(paths.sourcePath)) {
    warnings.push(`Source sheet not found yet: ${paths.sourcePath}`);
  }
  for (const item of manifest.items || []) {
    if (!item.sourceSheet) continue;
    const itemSourcePath = resolveItemSourcePath(manifest, paths, item.sourceSheet);
    if (!await fileExists(itemSourcePath)) {
      warnings.push(`Source sheet not found yet: ${itemSourcePath}`);
    }
  }
  warnings.push(...getPublishReadinessWarnings(manifest));

  return {
    fieldId: manifest.fieldId,
    manifestId: manifest.manifestId,
    source: paths.sourcePath,
    runtimeDirectory: paths.runtimeDirectory,
    errors,
    warnings,
    ok: errors.length === 0
  };
}

async function sliceManifest(manifest, paths) {
  const sharp = (await import('sharp')).default;
  assertPublishReady(manifest);
  const sourceMetadata = await sharp(paths.sourcePath).metadata();
  const sourceMetadataByPath = new Map([[paths.sourcePath, sourceMetadata]]);
  const outputs = [];

  await fs.mkdir(paths.runtimeDirectory, { recursive: true });
  await fs.mkdir(paths.reviewDirectory, { recursive: true });
  for (const profileName of Object.keys(manifest.runtimeProfiles)) {
    await fs.mkdir(path.join(paths.runtimeDirectory, profileName), { recursive: true });
  }

  const runtimeItems = [];
  for (const item of manifest.items) {
    const itemSourceSheet = item.sourceSheet || manifest.sourceSheet;
    const itemSourcePath = item.sourceSheet
      ? resolveItemSourcePath(manifest, paths, item.sourceSheet)
      : paths.sourcePath;
    const sourcePath = item.overrideFilename
      ? path.join(paths.overrideDirectory, item.overrideFilename)
      : itemSourcePath;
    if (!sourceMetadataByPath.has(sourcePath)) {
      sourceMetadataByPath.set(sourcePath, await sharp(sourcePath).metadata());
    }
    const sourceForItemMetadata = item.overrideFilename
      ? await sharp(sourcePath).metadata()
      : sourceMetadataByPath.get(sourcePath);
    const bounds = item.overrideFilename
      ? fullBounds(sourceForItemMetadata)
      : item.sourceBounds || gridBounds(itemSourceSheet, sourceForItemMetadata, item);
    validateBounds(bounds, sourceForItemMetadata, item.optionId);

    const extracted = await sharp(sourcePath)
      .extract(bounds)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaBuffer = whiteToAlpha(extracted.data, extracted.info);

    const baseProfileName = getBaseRuntimeProfileName(manifest.runtimeProfiles);
    const baseProfile = manifest.runtimeProfiles[baseProfileName];
    const baseBuffer = await normalizeIcon(sharp, alphaBuffer, extracted.info, baseProfile)
      .png()
      .toBuffer();

    const outputNames = {};
    const runtimeAssets = {};
    for (const [profileName, profile] of Object.entries(manifest.runtimeProfiles)) {
      const filename = `${item.slug}-r${item.assetRevision}.png`;
      const outputPath = path.join(paths.runtimeDirectory, profileName, filename);
      const buffer = profileName === baseProfileName
        ? baseBuffer
        : await sharp(baseBuffer)
          .resize({
            width: profile.width,
            height: profile.height,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
      await atomicWriteFile(outputPath, buffer);
      outputNames[profileName] = filename;
      runtimeAssets[profileName] = publicAssetUrl(paths, profileName, filename);
      outputs.push(path.relative(ROOT_DIR, outputPath));
    }

    runtimeItems.push({
      assetId: item.assetId,
      optionId: item.optionId,
      ...(item.attributeId ? { attributeId: item.attributeId } : {}),
      slug: item.slug,
      assetRevision: item.assetRevision,
      recolorMode: manifest.recolorMode,
      focalPoint: item.focalPoint,
      alt: item.alt,
      sourceHash: sha256(baseBuffer),
      assets: runtimeAssets
    });
  }

  const extensionResult = await materializeRuntimeExtensionItems({
    sharp,
    manifest,
    paths
  });
  const extensionItems = extensionResult.items;
  outputs.push(...extensionResult.outputs);
  const generatedOptionIds = new Set(runtimeItems.map(item => item.optionId));
  const runtimeManifest = {
    schemaVersion: 1,
    manifestId: manifest.manifestId,
    fieldId: manifest.fieldId,
    sectionId: manifest.sectionId,
    visualStyleVersion: manifest.visualStyleVersion,
    assetFamily: manifest.assetFamily,
    recolorMode: manifest.recolorMode,
    items: [
      ...runtimeItems,
      ...extensionItems.filter(item => !generatedOptionIds.has(item.optionId))
    ]
  };
  const runtimeManifestPath = path.join(paths.runtimeDirectory, 'manifest.json');
  await atomicWriteJson(runtimeManifestPath, runtimeManifest);

  const indexManifestPath = await writeManifestIndex(paths.style);
  const contactSheetPath = await createContactSheetFromRuntime(manifest, paths);

  return { outputs, runtimeManifestPath, indexManifestPath, contactSheetPath };
}

function resolveItemSourcePath(manifest, paths, sourceSheet) {
  const sourceFolder = sourceSheet.folder || manifest.sourceSheet.folder || paths.fieldSlug;
  return path.join(
    AUTHORING_DIR,
    'source-sets',
    paths.style,
    manifest.sectionId,
    sourceFolder,
    sourceSheet.filename
  );
}

function normalizeIcon(sharp, alphaBuffer, rawInfo, profile) {
  const safeArea = Math.round(Math.min(profile.width, profile.height) * 0.82);
  return sharp(alphaBuffer, { raw: rawInfo })
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
      .resize({
        width: safeArea,
        height: safeArea,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: Math.floor((profile.height - safeArea) / 2),
        bottom: Math.ceil((profile.height - safeArea) / 2),
        left: Math.floor((profile.width - safeArea) / 2),
        right: Math.ceil((profile.width - safeArea) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
}

function whiteToAlpha(data, info) {
  const output = Buffer.alloc(data.length);
  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = info.channels === 4 ? data[index + 3] : 255;
    const darkness = 255 - ((red + green + blue) / 3);
    const lineAlpha = Math.max(0, Math.min(255, Math.round(darkness * 1.35)));
    output[index] = 0;
    output[index + 1] = 0;
    output[index + 2] = 0;
    output[index + 3] = Math.round((lineAlpha * alpha) / 255);
  }
  return output;
}

function gridBounds(sourceSheet, metadata, item) {
  const cellWidth = Math.floor(metadata.width / sourceSheet.columns);
  const cellHeight = Math.floor(metadata.height / sourceSheet.rows);
  const left = (item.column - 1) * cellWidth;
  const top = (item.row - 1) * cellHeight;
  const isLastColumn = item.column === sourceSheet.columns;
  const isLastRow = item.row === sourceSheet.rows;
  return {
    left,
    top,
    width: isLastColumn ? metadata.width - left : cellWidth,
    height: isLastRow ? metadata.height - top : cellHeight
  };
}

function fullBounds(metadata) {
  return {
    left: 0,
    top: 0,
    width: metadata.width,
    height: metadata.height
  };
}

function validateBounds(bounds, metadata, optionId) {
  if (bounds.left < 0 || bounds.top < 0 || bounds.width < 1 || bounds.height < 1) {
    throw new Error(`${optionId} has invalid bounds.`);
  }
  if (bounds.left + bounds.width > metadata.width || bounds.top + bounds.height > metadata.height) {
    throw new Error(`${optionId} bounds exceed source image dimensions.`);
  }
}

function getBaseRuntimeProfileName(runtimeProfiles) {
  if (runtimeProfiles.master) return 'master';
  if (runtimeProfiles.preview) return 'preview';
  if (runtimeProfiles.thumb) return 'thumb';
  const [firstProfileName] = Object.keys(runtimeProfiles || {});
  if (!firstProfileName) throw new Error('Manifest must define at least one runtime profile.');
  return firstProfileName;
}

function assertPublishReady(manifest) {
  const blockedItems = getPublishBlockedItems(manifest);
  if (!blockedItems.length) return;
  const details = blockedItems.map(item => `${item.optionId}:${item.reviewStatus || 'missing'}`).join(', ');
  throw new Error(`Manifest is not ready to publish. Review these items first: ${details}`);
}

function getPublishReadinessWarnings(manifest) {
  const blockedItems = getPublishBlockedItems(manifest);
  if (!blockedItems.length) return [];
  const details = blockedItems.map(item => `${item.optionId}:${item.reviewStatus || 'missing'}`).join(', ');
  return [`Publish blocked until reviewStatus is approved/source-selected/override-approved for: ${details}`];
}

function getPublishBlockedItems(manifest) {
  return (manifest.items || []).filter(item =>
    !PUBLISH_READY_REVIEW_STATUSES.has(item.reviewStatus)
  );
}

async function createContactSheetFromRuntime(manifest, paths) {
  const sharp = (await import('sharp')).default;
  const profileName = manifest.runtimeProfiles.preview ? 'preview' : getBaseRuntimeProfileName(manifest.runtimeProfiles);
  const profile = manifest.runtimeProfiles[profileName];
  const gap = 32;
  const labelHeight = 36;
  const width = (profile.width * manifest.sourceSheet.columns) + (gap * (manifest.sourceSheet.columns + 1));
  const height = ((profile.height + labelHeight) * manifest.sourceSheet.rows) + (gap * (manifest.sourceSheet.rows + 1));
  const composites = [];

  for (const item of manifest.items) {
    const filename = `${item.slug}-r${item.assetRevision}.png`;
    const imagePath = path.join(paths.runtimeDirectory, profileName, filename);
    if (!await fileExists(imagePath)) continue;
    const left = gap + ((item.column - 1) * (profile.width + gap));
    const top = gap + ((item.row - 1) * (profile.height + labelHeight + gap));
    composites.push({ input: imagePath, left, top });
    composites.push({
      input: Buffer.from(`<svg width="${profile.width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><text x="${profile.width / 2}" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#111827">${escapeXml(item.slug)}</text></svg>`),
      left,
      top: top + profile.height
    });
  }

  await fs.mkdir(paths.reviewDirectory, { recursive: true });
  const contactSheetPath = path.join(paths.reviewDirectory, 'contact-sheet-r1.png');
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toBuffer();
  await atomicWriteFile(contactSheetPath, buffer);
  return contactSheetPath;
}

async function writeManifestIndex(style) {
  const styleDirectory = path.join(RUNTIME_ROOT, style);
  const indexPath = path.join(styleDirectory, 'manifest.index.json');
  const manifests = [];
  let visualStyleVersion = null;
  for (const manifest of RUNTIME_MANIFESTS) {
    const runtimeManifestPath = path.join(styleDirectory, manifest.sectionId, manifest.folder, 'manifest.json');
    if (!await fileExists(runtimeManifestPath)) continue;
    const runtimeManifest = await readJson(runtimeManifestPath);
    visualStyleVersion ||= runtimeManifest.visualStyleVersion;
    manifests.push({
      fieldId: runtimeManifest.fieldId || manifest.fieldId,
      manifestId: runtimeManifest.manifestId || manifest.manifestId,
      url: `/assets/visual-character-builder/${style}/${manifest.sectionId}/${manifest.folder}/manifest.json?v=${RUNTIME_MANIFEST_REVISION}`
    });
  }
  const index = {
    schemaVersion: 1,
    visualStyleVersion: visualStyleVersion || styleToVisualStyleVersion(style),
    manifests
  };
  await fs.mkdir(styleDirectory, { recursive: true });
  await atomicWriteJson(indexPath, index);
  return indexPath;
}

function publicAssetUrl(paths, profileName, filename) {
  const relative = path.relative(RUNTIME_ROOT, path.join(paths.runtimeDirectory, profileName, filename));
  return `/assets/visual-character-builder/${toPosix(relative)}`;
}

async function atomicWriteJson(filename, value) {
  await atomicWriteFile(filename, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'));
}

async function atomicWriteFile(filename, buffer) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporaryFile = path.join(path.dirname(filename), `.${path.basename(filename)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(temporaryFile, buffer);
  await fs.rename(temporaryFile, filename);
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function readKnownAttributeIds() {
  const ids = new Set();
  for (const filename of ATTRIBUTE_FILES) {
    if (!await fileExists(filename)) continue;
    const document = await readJson(filename);
    const items = Array.isArray(document) ? document : document.entries || [];
    for (const item of items) {
      if (item?.id) ids.add(item.id);
    }
  }
  return ids;
}

async function readRuntimeExtensionItems(fieldId) {
  if (!await fileExists(RUNTIME_EXTENSION_FILE)) return [];
  const document = await readJson(RUNTIME_EXTENSION_FILE);
  const items = document.fields?.[fieldId] || [];
  return Array.isArray(items) ? items : [];
}

async function materializeRuntimeExtensionItems({ sharp, manifest, paths }) {
  const extensionItems = await readRuntimeExtensionItems(manifest.fieldId);
  const items = [];
  const outputs = [];

  for (const item of extensionItems) {
    const sourceFilename = item.source?.filename;
    if (!sourceFilename) {
      items.push(item);
      continue;
    }

    const sourcePath = path.resolve(AUTHORING_DIR, sourceFilename);
    if (!sourcePath.startsWith(`${AUTHORING_DIR}${path.sep}`)) {
      throw new Error(`${item.optionId} has an unsafe extension source path.`);
    }
    if (!await fileExists(sourcePath)) {
      throw new Error(`${item.optionId} extension source is missing: ${sourcePath}`);
    }
    if (item.source.processing !== 'line-art-mask') {
      throw new Error(`${item.optionId} uses unsupported extension processing '${item.source.processing}'.`);
    }

    const extracted = await sharp(sourcePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaBuffer = whiteToAlpha(extracted.data, extracted.info);
    const baseProfileName = getBaseRuntimeProfileName(manifest.runtimeProfiles);
    const baseProfile = manifest.runtimeProfiles[baseProfileName];
    const baseBuffer = await normalizeIcon(sharp, alphaBuffer, extracted.info, baseProfile)
      .png()
      .toBuffer();
    const runtimeAssets = {};

    for (const [profileName, profile] of Object.entries(manifest.runtimeProfiles)) {
      const filename = `${item.slug}-r${item.assetRevision}.png`;
      const outputPath = path.join(paths.runtimeDirectory, profileName, filename);
      const buffer = profileName === baseProfileName
        ? baseBuffer
        : await sharp(baseBuffer)
          .resize({
            width: profile.width,
            height: profile.height,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
      await atomicWriteFile(outputPath, buffer);
      runtimeAssets[profileName] = publicAssetUrl(paths, profileName, filename);
      outputs.push(path.relative(ROOT_DIR, outputPath));
    }

    const { source: _source, assets: _assets, ...runtimeItem } = item;
    items.push({
      ...runtimeItem,
      recolorMode: 'mask',
      sourceHash: sha256(baseBuffer),
      assets: runtimeAssets
    });
  }

  return { items, outputs };
}

async function fileExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function toPosix(filename) {
  return filename.split(path.sep).join('/');
}

function styleToVisualStyleVersion(style) {
  return style.replace(/-v(\d+)$/, '-illustrated-v$1');
}

function fieldIdToFolderName(fieldId) {
  return FIELD_FOLDERS[fieldId] || fieldId.split('.').slice(1).join('-');
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function printReport(report) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(error => {
    process.stderr.write(`Visual asset slicing failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
