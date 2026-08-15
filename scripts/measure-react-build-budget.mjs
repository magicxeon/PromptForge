import { gzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDirectory = path.join(root, 'web', 'dist');
const indexPath = path.join(distDirectory, 'index.html');
const maxInitialChunkBytes = 500 * 1024;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  }));
  return nested.flat();
}

function normalizeAssetPath(value) {
  return value.replace(/^\//, '').replaceAll('/', path.sep);
}

const indexHtml = await readFile(indexPath, 'utf8').catch(() => {
  throw new Error('web/dist is missing. Run npm run build:web before measuring the bundle.');
});
const initialAssetPaths = new Set(
  [...indexHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map(match => normalizeAssetPath(match[1]))
);
const files = (await listFiles(distDirectory))
  .filter(filePath => /\.(?:js|css)$/i.test(filePath));

const assets = await Promise.all(files.map(async filePath => {
  const contents = await readFile(filePath);
  const relativePath = path.relative(distDirectory, filePath);
  return {
    path: relativePath.replaceAll(path.sep, '/'),
    type: path.extname(filePath).slice(1),
    initial: initialAssetPaths.has(relativePath),
    minifiedBytes: contents.byteLength,
    gzipBytes: gzipSync(contents).byteLength
  };
}));
assets.sort((left, right) => right.minifiedBytes - left.minifiedBytes);

const violations = assets
  .filter(asset => asset.type === 'js' && asset.initial && asset.minifiedBytes > maxInitialChunkBytes)
  .map(asset => ({
    path: asset.path,
    minifiedBytes: asset.minifiedBytes,
    budgetBytes: maxInitialChunkBytes
  }));
const report = {
  generatedAt: new Date().toISOString(),
  budget: { maxInitialJavaScriptChunkBytes: maxInitialChunkBytes },
  status: violations.length === 0 ? 'pass' : 'fail',
  assets,
  violations
};

const outputArgument = process.argv.find(argument => argument.startsWith('--output='));
if (outputArgument) {
  const outputPath = path.resolve(root, outputArgument.slice('--output='.length));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(report, null, 2));
if (violations.length > 0) process.exitCode = 1;
