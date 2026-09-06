import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const asset = name => `/assets/scene-builder/shot-recipes/${name}.jpg`;
const characters = [
  ['Nara', 'soft-character-portrait', true, 'scene_story'],
  ['Mali', 'street-walk-editorial', true, 'fashion'],
  ['Alexandra / Character with a longer display name', 'window-shadow-lookbook', false, 'general'],
  ['Arin', 'cafe-seated-lifestyle', true, 'scene_story']
].map(([displayName, image, handoffAvailable, intendedUse], index) => ({
  id: `fixture-character-${index}`, displayName,
  personalitySummary: 'Quiet confidence and a thoughtful presence in everyday scenes.',
  intendedUses: [intendedUse], ownerUsername: 'sample_creator',
  displayImageUrl: asset(image), displayImageSource: 'owner_generation', faceThumbnailUrl: asset('soft-character-portrait'),
  handoffAvailable, destinationCapabilities: ['fashion_blueprint', 'scene_builder'],
  reusePolicy: handoffAvailable ? 'public_reusable' : 'view_only',
  stats: { totalOutputs: 12 + index }
}));
const works = ['sunlit-storefront', 'cafe-seated-lifestyle', 'street-walk-editorial'].map((image, index) => ({
  id: `fixture-post-${index}`, postType: 'image', mediaType: 'image',
  title: ['An afternoon in the city', 'A quiet moment', 'Through the neighborhood'][index],
  creator: { username: 'sample_creator', displayName: 'Sample Creator' },
  status: 'active', visibility: 'public', imageUrl: asset(image), engagementSummary: {}
}));
const api = {
  '/api/me': { userId: 'usr_demo', username: 'demo', displayName: 'Layout fixture', role: 'user' },
  '/api/mock-users': { enabled: false, users: [] },
  '/api/community/features': {
    community: { enabled: true, exploreEnabled: true, galleryEnabled: true, characterProfilesEnabled: true, creatorProfilesEnabled: true },
    development: {}, routing: {}, cinematic: { enabled: true }
  },
  '/api/community/characters': { items: characters, hasMore: false },
  '/api/community/creator-profiles/me': { id: 'fixture-creator', handle: 'demo', displayName: 'Layout fixture' },
  '/api/credits/account': { account: { availableCredits: 0, reservedCredits: 0 } },
  '/api/health': { status: 'ok', time: '2026-09-06T00:00:00Z' },
  '/api/generation/job-center': { items: [], activeCount: 0, terminalCount: 0, polledAt: '2026-09-06T00:00:00Z' }
};
const contentTypes = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};

// Browser-only fixture: never forwards a request to the application or a provider.
export async function installCharacterDiscoveryLayoutFixture(context, origin) {
  const blockedRequests = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin || request.method() !== 'GET') {
      blockedRequests.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    let payload = api[url.pathname];
    if (/^\/api\/community\/characters\/fixture-character-\d\/works$/.test(url.pathname)) {
      payload = { items: works, hasMore: false };
    }
    const engagement = url.pathname.match(/^\/api\/community\/posts\/(fixture-post-\d)\/engagement$/);
    if (engagement) payload = {
      postId: engagement[1], summary: { likeCount: 12, viewCount: 120 },
      viewerState: { liked: false, saved: false }, voteSummary: { bySlot: [], leaderSlotIds: [] }
    };
    if (payload) return route.fulfill({ json: payload });
    let base;
    let relative;
    if (url.pathname.startsWith('/react-assets/')) {
      base = path.join(root, 'web/dist'); relative = url.pathname.slice(1);
    } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/i18n/')) {
      base = path.join(root, 'client'); relative = url.pathname.slice(1);
    } else if (url.pathname === '/explore/characters') {
      base = path.join(root, 'web/dist'); relative = 'index.html';
    }
    const file = base && path.resolve(base, decodeURIComponent(relative));
    if (!file || !file.startsWith(`${path.resolve(base)}${path.sep}`)) {
      blockedRequests.push(`Unmapped ${url.pathname}`);
      return route.fulfill({ status: 404, json: { message: 'Not available in the read-only layout fixture.' } });
    }
    try {
      return await route.fulfill({ body: await fs.readFile(file), contentType: contentTypes[path.extname(file)] || 'application/octet-stream' });
    } catch {
      blockedRequests.push(`Missing local asset ${url.pathname}`);
      return route.fulfill({ status: 404, body: '' });
    }
  });
  return blockedRequests;
}
