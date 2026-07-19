import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');
export const CLIENT_ROOT = path.resolve(PROJECT_ROOT, 'client');
export const OUTPUTS_DIR = path.resolve(CLIENT_ROOT, 'outputs');

export const DATA_ROOT = path.resolve(SERVER_ROOT, 'data');
export const IDENTITY_DATA_DIR = path.resolve(DATA_ROOT, 'identity');
export const GENERATION_DATA_DIR = path.resolve(DATA_ROOT, 'generation');
export const COLLECTIONS_DATA_DIR = path.resolve(DATA_ROOT, 'collections');
export const CREDITS_DATA_DIR = path.resolve(DATA_ROOT, 'credits');
export const COMMUNITY_DATA_DIR = path.resolve(DATA_ROOT, 'community');
export const COMPARISONS_DATA_DIR = path.resolve(DATA_ROOT, 'comparisons');
export const MIGRATIONS_DATA_DIR = path.resolve(DATA_ROOT, 'migrations');

export const DATA_FILES = {
  mockUsers: path.resolve(IDENTITY_DATA_DIR, 'mockUsers.json'),
  history: path.resolve(GENERATION_DATA_DIR, 'history.json'),
  collections: path.resolve(COLLECTIONS_DATA_DIR, 'collections.json'),
  database: path.resolve(CREDITS_DATA_DIR, 'database.json'),
  communityPosts: path.resolve(COMMUNITY_DATA_DIR, 'communityPosts.json'),
  remixEvents: path.resolve(COMMUNITY_DATA_DIR, 'remixEvents.json'),
  comparisons: path.resolve(COMPARISONS_DATA_DIR, 'comparisons.json')
};

export function resolveDataFile(name) {
  const filePath = DATA_FILES[name];
  if (!filePath) {
    throw new Error(`[paths] Unknown data file name key: ${name}`);
  }

  return filePath;
}
