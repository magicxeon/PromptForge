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
export const ASSETS_DATA_DIR = path.resolve(DATA_ROOT, 'assets');
export const AUDIT_DATA_DIR = path.resolve(DATA_ROOT, 'audit');
export const SCENE_TEMPLATES_DATA_DIR = path.resolve(DATA_ROOT, 'scene-templates');

export const DATA_FILES = {
  mockUsers: path.resolve(IDENTITY_DATA_DIR, 'mockUsers.json'),
  history: path.resolve(GENERATION_DATA_DIR, 'history.json'),
  collections: path.resolve(COLLECTIONS_DATA_DIR, 'collections.json'),
  database: path.resolve(CREDITS_DATA_DIR, 'database.json'),
  communityPosts: path.resolve(COMMUNITY_DATA_DIR, 'communityPosts.json'),
  remixEvents: path.resolve(COMMUNITY_DATA_DIR, 'remixEvents.json'),
  communityCharacters: path.resolve(COMMUNITY_DATA_DIR, 'communityCharacters.json'),
  communityGallery: path.resolve(COMMUNITY_DATA_DIR, 'communityGallery.json'),
  comparisons: path.resolve(COMPARISONS_DATA_DIR, 'comparisons.json'),
  assets: path.resolve(ASSETS_DATA_DIR, 'assets.json'),
  auditLogs: path.resolve(AUDIT_DATA_DIR, 'auditLogs.json'),
  sceneTemplateSnapshots: path.resolve(SCENE_TEMPLATES_DATA_DIR, 'sceneTemplateSnapshots.json')
};

export function resolveDataFile(name) {
  const filePath = DATA_FILES[name];
  if (!filePath) {
    throw new Error(`[paths] Unknown data file name key: ${name}`);
  }

  return filePath;
}
