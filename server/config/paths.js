import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SERVER_ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');
export const CLIENT_ROOT = path.resolve(PROJECT_ROOT, 'client');
export const WEB_ROOT = path.resolve(PROJECT_ROOT, 'web');
export const WEB_DIST_ROOT = path.resolve(WEB_ROOT, 'dist');
export const OUTPUTS_DIR = path.resolve(CLIENT_ROOT, 'outputs');
export const ATTRIBUTES_ROOT = path.resolve(PROJECT_ROOT, 'attributes');
export const VISUAL_CHARACTER_ASSETS_ROOT = path.resolve(
  CLIENT_ROOT,
  'assets',
  'visual-character-builder'
);

export const DATA_ROOT = path.resolve(SERVER_ROOT, 'data');
export const IDENTITY_DATA_DIR = path.resolve(DATA_ROOT, 'identity');
export const GENERATION_DATA_DIR = path.resolve(DATA_ROOT, 'generation');
export const PROMPT_REFINEMENT_AUDIT_DIR = path.resolve(
  GENERATION_DATA_DIR,
  'output',
  'prompt-refinement'
);
export const COLLECTIONS_DATA_DIR = path.resolve(DATA_ROOT, 'collections');
export const CREDITS_DATA_DIR = path.resolve(DATA_ROOT, 'credits');
export const COMMUNITY_DATA_DIR = path.resolve(DATA_ROOT, 'community');
export const COMPARISONS_DATA_DIR = path.resolve(DATA_ROOT, 'comparisons');
export const MIGRATIONS_DATA_DIR = path.resolve(DATA_ROOT, 'migrations');
export const ASSETS_DATA_DIR = path.resolve(DATA_ROOT, 'assets');
export const AUDIT_DATA_DIR = path.resolve(DATA_ROOT, 'audit');
export const SCENE_TEMPLATES_DATA_DIR = path.resolve(DATA_ROOT, 'scene-templates');
export const CHARACTER_PROFILES_DATA_DIR = path.resolve(DATA_ROOT, 'character-profiles');
export const FASHION_BLUEPRINT_DATA_DIR = path.resolve(DATA_ROOT, 'fashion-blueprint');
export const TEMPLATES_DATA_DIR = path.resolve(DATA_ROOT, 'templates');
export const TEMPLATE_POSE_PROXY_DATA_DIR = path.resolve(DATA_ROOT, 'template-pose-proxy');
export const ATTRIBUTE_CATALOG_DATA_DIR = path.resolve(DATA_ROOT, 'attribute-catalog');

export const DATA_FILES = {
  mockUsers: path.resolve(IDENTITY_DATA_DIR, 'mockUsers.json'),
  history: path.resolve(GENERATION_DATA_DIR, 'history.json'),
  generationGroups: path.resolve(GENERATION_DATA_DIR, 'groups.json'),
  collections: path.resolve(COLLECTIONS_DATA_DIR, 'collections.json'),
  database: path.resolve(CREDITS_DATA_DIR, 'database.json'),
  communityPosts: path.resolve(COMMUNITY_DATA_DIR, 'communityPosts.json'),
  creatorProfiles: path.resolve(COMMUNITY_DATA_DIR, 'creatorProfiles.json'),
  creatorFollows: path.resolve(COMMUNITY_DATA_DIR, 'creatorFollows.json'),
  communityReports: path.resolve(COMMUNITY_DATA_DIR, 'communityReports.json'),
  remixEvents: path.resolve(COMMUNITY_DATA_DIR, 'remixEvents.json'),
  communityCharacters: path.resolve(COMMUNITY_DATA_DIR, 'communityCharacters.json'),
  communityGallery: path.resolve(COMMUNITY_DATA_DIR, 'communityGallery.json'),
  communityEngagementEvents: path.resolve(COMMUNITY_DATA_DIR, 'engagementEvents.json'),
  communityReactions: path.resolve(COMMUNITY_DATA_DIR, 'reactions.json'),
  communityComments: path.resolve(COMMUNITY_DATA_DIR, 'comments.json'),
  communityComparisonVotes: path.resolve(COMMUNITY_DATA_DIR, 'comparisonVotes.json'),
  communityEngagementDailyAggregates: path.resolve(COMMUNITY_DATA_DIR, 'engagementDailyAggregates.json'),
  comparisons: path.resolve(COMPARISONS_DATA_DIR, 'comparisons.json'),
  assets: path.resolve(ASSETS_DATA_DIR, 'assets.json'),
  auditLogs: path.resolve(AUDIT_DATA_DIR, 'auditLogs.json'),
  sceneTemplateSnapshots: path.resolve(SCENE_TEMPLATES_DATA_DIR, 'sceneTemplateSnapshots.json'),
  characterProfiles: path.resolve(CHARACTER_PROFILES_DATA_DIR, 'profiles.json'),
  characterProfileVersions: path.resolve(CHARACTER_PROFILES_DATA_DIR, 'versions.json'),
  characterUsageEvents: path.resolve(CHARACTER_PROFILES_DATA_DIR, 'usageEvents.json'),
  fashionBlueprintQuotes: path.resolve(FASHION_BLUEPRINT_DATA_DIR, 'quotes.json'),
  fashionBlueprintRuns: path.resolve(FASHION_BLUEPRINT_DATA_DIR, 'runs.json'),
  templates: path.resolve(TEMPLATES_DATA_DIR, 'templates.json'),
  templateVersions: path.resolve(TEMPLATES_DATA_DIR, 'versions.json'),
  templateUseSessions: path.resolve(TEMPLATES_DATA_DIR, 'useSessions.json'),
  templateUsageEvents: path.resolve(TEMPLATES_DATA_DIR, 'usageEvents.json'),
  templatePoseProxies: path.resolve(TEMPLATE_POSE_PROXY_DATA_DIR, 'poseProxies.json'),
  attributeCatalogDrafts: path.resolve(ATTRIBUTE_CATALOG_DATA_DIR, 'drafts.json'),
  attributeCatalogReleases: path.resolve(ATTRIBUTE_CATALOG_DATA_DIR, 'releases.json'),
  attributeCatalogState: path.resolve(ATTRIBUTE_CATALOG_DATA_DIR, 'state.json')
};

export function resolveDataFile(name) {
  const filePath = DATA_FILES[name];
  if (!filePath) {
    throw new Error(`[paths] Unknown data file name key: ${name}`);
  }

  return filePath;
}
