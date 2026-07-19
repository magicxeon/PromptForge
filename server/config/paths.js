import path from 'path';
import fs from 'fs';
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
  mockUsers: {
    newPath: path.resolve(IDENTITY_DATA_DIR, 'mockUsers.json'),
    oldPath: path.resolve(SERVER_ROOT, 'identity/mockUsers.json')
  },
  history: {
    newPath: path.resolve(GENERATION_DATA_DIR, 'history.json'),
    oldPath: path.resolve(SERVER_ROOT, 'history.json')
  },
  collections: {
    newPath: path.resolve(COLLECTIONS_DATA_DIR, 'collections.json'),
    oldPath: path.resolve(SERVER_ROOT, 'collections.json')
  },
  database: {
    newPath: path.resolve(CREDITS_DATA_DIR, 'database.json'),
    oldPath: path.resolve(SERVER_ROOT, 'database.json')
  },
  communityPosts: {
    newPath: path.resolve(COMMUNITY_DATA_DIR, 'communityPosts.json'),
    oldPath: path.resolve(SERVER_ROOT, 'communityPosts.json')
  },
  remixEvents: {
    newPath: path.resolve(COMMUNITY_DATA_DIR, 'remixEvents.json'),
    oldPath: path.resolve(SERVER_ROOT, 'remixEvents.json')
  },
  comparisons: {
    newPath: path.resolve(COMPARISONS_DATA_DIR, 'comparisons.json'),
    oldPath: path.resolve(SERVER_ROOT, 'comparisons.json')
  }
};

export function resolveDataFile(name) {
  const config = DATA_FILES[name];
  if (!config) {
    throw new Error(`[paths] Unknown data file name key: ${name}`);
  }

  // Compatibility Path Rule
  if (fs.existsSync(config.newPath)) {
    return config.newPath;
  } else if (fs.existsSync(config.oldPath)) {
    return config.oldPath;
  } else {
    // Ensure parent directory of new path exists
    const dir = path.dirname(config.newPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return config.newPath;
  }
}
