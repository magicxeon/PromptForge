import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
const AUTHORING_DIR = path.join(ROOT_DIR, 'visual-assets/character-builder');
const RUNTIME_ROOT = path.join(ROOT_DIR, 'client/assets/visual-character-builder');

const FIELD_MANIFESTS = {
  'face.shape': path.join(AUTHORING_DIR, 'manifests/headshot/face-structure/face-shape.manifest.json'),
  'eyes.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/eyes.manifest.json'),
  'eyebrows.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/eyebrows.manifest.json'),
  'nose.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/nose.manifest.json'),
  'lips.shape': path.join(AUTHORING_DIR, 'manifests/headshot/facial-features/lips.manifest.json'),
  'hair.length': path.join(AUTHORING_DIR, 'manifests/headshot/hair/length.manifest.json'),
  'hair.cut_style': path.join(AUTHORING_DIR, 'manifests/headshot/hair/cut-style.manifest.json'),
  'hair.texture': path.join(AUTHORING_DIR, 'manifests/headshot/hair/texture.manifest.json')
};
const FIELD_FOLDERS = {
  'face.shape': 'face-shape',
  'eyes.shape': 'eyes',
  'eyebrows.shape': 'eyebrows',
  'nose.shape': 'nose',
  'lips.shape': 'lips',
  'hair.length': 'length',
  'hair.cut_style': 'cut-style',
  'hair.texture': 'texture'
};
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
    contactSheet: argv.includes('--contact-sheet') || argv.includes('--slice')
  };
}

export async function run(options = parseArgs(process.argv.slice(2))) {
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

function resolveManifestPaths(manifest) {
  const style = manifest.visualStyleVersion.replace('-illustrated', '');
  const fieldSlug = fieldIdToFolderName(manifest.fieldId);
  const sourceDirectory = path.join(
    AUTHORING_DIR,
    'source-sets',
    style,
    manifest.sectionId,
    fieldSlug
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

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (manifest.assetFamily !== 'illustrated-set') errors.push('assetFamily must be illustrated-set.');
  if (manifest.recolorMode !== 'mask') errors.push('Only mask recolorMode is supported.');

  for (const item of manifest.items || []) {
    const positionKey = `${item.row}:${item.column}`;
    if (positions.has(positionKey)) errors.push(`Duplicate row/column ${positionKey}.`);
    positions.add(positionKey);

    if (optionIds.has(item.optionId)) errors.push(`Duplicate optionId ${item.optionId}.`);
    optionIds.add(item.optionId);

    if (slugs.has(item.slug)) errors.push(`Duplicate slug ${item.slug}.`);
    slugs.add(item.slug);

    if (item.row > manifest.sourceSheet.rows || item.column > manifest.sourceSheet.columns) {
      errors.push(`${item.optionId} is outside the declared grid.`);
    }
    if (!item.alt?.en || !item.alt?.th) {
      errors.push(`${item.optionId} needs bilingual alt text.`);
    }
  }

  const expectedCount = manifest.sourceSheet.rows * manifest.sourceSheet.columns;
  if (manifest.items.length !== expectedCount) {
    warnings.push(`Item count ${manifest.items.length} differs from declared grid count ${expectedCount}.`);
  }

  if (!await fileExists(paths.sourcePath)) {
    warnings.push(`Source sheet not found yet: ${paths.sourcePath}`);
  }

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
  const sourceMetadata = await sharp(paths.sourcePath).metadata();
  const outputs = [];

  await fs.mkdir(paths.runtimeDirectory, { recursive: true });
  await fs.mkdir(paths.reviewDirectory, { recursive: true });
  for (const profileName of Object.keys(manifest.runtimeProfiles)) {
    await fs.mkdir(path.join(paths.runtimeDirectory, profileName), { recursive: true });
  }

  const runtimeItems = [];
  for (const item of manifest.items) {
    const sourcePath = item.overrideFilename
      ? path.join(paths.overrideDirectory, item.overrideFilename)
      : paths.sourcePath;
    const sourceForItemMetadata = item.overrideFilename
      ? await sharp(sourcePath).metadata()
      : sourceMetadata;
    const bounds = item.overrideFilename
      ? fullBounds(sourceForItemMetadata)
      : item.sourceBounds || gridBounds(manifest.sourceSheet, sourceMetadata, item);
    validateBounds(bounds, sourceForItemMetadata, item.optionId);

    const extracted = await sharp(sourcePath)
      .extract(bounds)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaBuffer = whiteToAlpha(extracted.data, extracted.info);

    const masterBuffer = await normalizeIcon(sharp, alphaBuffer, extracted.info, manifest.runtimeProfiles.master)
      .png()
      .toBuffer();

    const outputNames = {};
    for (const [profileName, profile] of Object.entries(manifest.runtimeProfiles)) {
      const filename = `${item.slug}-r${item.assetRevision}.png`;
      const outputPath = path.join(paths.runtimeDirectory, profileName, filename);
      const buffer = profileName === 'master'
        ? masterBuffer
        : await sharp(masterBuffer)
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
      outputs.push(path.relative(ROOT_DIR, outputPath));
    }

    runtimeItems.push({
      assetId: item.assetId,
      optionId: item.optionId,
      slug: item.slug,
      assetRevision: item.assetRevision,
      recolorMode: manifest.recolorMode,
      focalPoint: item.focalPoint,
      alt: item.alt,
      sourceHash: sha256(masterBuffer),
      assets: {
        master: publicAssetUrl(paths, 'master', outputNames.master),
        preview: publicAssetUrl(paths, 'preview', outputNames.preview),
        thumb: publicAssetUrl(paths, 'thumb', outputNames.thumb)
      }
    });
  }

  const runtimeManifest = {
    schemaVersion: 1,
    manifestId: manifest.manifestId,
    fieldId: manifest.fieldId,
    sectionId: manifest.sectionId,
    visualStyleVersion: manifest.visualStyleVersion,
    assetFamily: manifest.assetFamily,
    recolorMode: manifest.recolorMode,
    items: runtimeItems
  };
  const runtimeManifestPath = path.join(paths.runtimeDirectory, 'manifest.json');
  await atomicWriteJson(runtimeManifestPath, runtimeManifest);

  const indexManifestPath = await writeManifestIndex(paths.style);
  const contactSheetPath = await createContactSheetFromRuntime(manifest, paths);

  return { outputs, runtimeManifestPath, indexManifestPath, contactSheetPath };
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

async function createContactSheetFromRuntime(manifest, paths) {
  const sharp = (await import('sharp')).default;
  const profile = manifest.runtimeProfiles.preview;
  const gap = 32;
  const labelHeight = 36;
  const width = (profile.width * manifest.sourceSheet.columns) + (gap * (manifest.sourceSheet.columns + 1));
  const height = ((profile.height + labelHeight) * manifest.sourceSheet.rows) + (gap * (manifest.sourceSheet.rows + 1));
  const composites = [];

  for (const item of manifest.items) {
    const filename = `${item.slug}-r${item.assetRevision}.png`;
    const imagePath = path.join(paths.runtimeDirectory, 'preview', filename);
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
  for (const manifest of RUNTIME_MANIFESTS) {
    const runtimeManifestPath = path.join(styleDirectory, manifest.sectionId, manifest.folder, 'manifest.json');
    if (!await fileExists(runtimeManifestPath)) continue;
    manifests.push({
      fieldId: manifest.fieldId,
      manifestId: manifest.manifestId,
      url: `/assets/visual-character-builder/${style}/${manifest.sectionId}/${manifest.folder}/manifest.json`
    });
  }
  const index = {
    schemaVersion: 1,
    visualStyleVersion: 'headshot-illustrated-v1',
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
