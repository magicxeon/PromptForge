import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDirectory = path.join(projectRoot, 'client', 'assets', 'vendor', 'i18next');
const bundles = [
  ['node_modules/i18next/dist/umd/i18next.min.js', 'i18next.min.js'],
  ['node_modules/i18next-http-backend/i18nextHttpBackend.min.js', 'i18nextHttpBackend.min.js'],
  ['node_modules/i18next/LICENSE', 'LICENSE-i18next.txt'],
  ['node_modules/i18next-http-backend/licence', 'LICENSE-i18next-http-backend.txt']
];

await mkdir(vendorDirectory, { recursive: true });
await Promise.all(bundles.map(([source, target]) => copyFile(
  path.join(projectRoot, source),
  path.join(vendorDirectory, target)
)));

console.log(`Synced ${bundles.length} i18next browser assets.`);
