import fs from 'node:fs/promises';
import { installCharacterDiscoveryLayoutFixture } from './characterDiscoveryLayoutFixture.mjs';

const asset = name => `/assets/scene-builder/shot-recipes/${name}.jpg`;
export const templateFixture = {
  id: 'template-original', postType: 'template', title: 'Window light / Everyday editorial',
  description: 'Quiet window light, a relaxed pose and a contemporary everyday setting.',
  creator: { username: 'sample_creator', displayName: 'Sample Creator' },
  status: 'published', visibility: 'public', imageUrl: asset('street-walk-editorial'),
  thumbnailUrl: asset('street-walk-editorial'), templateAvailability: true,
  templateId: 'template-fixture', templateVersionId: 'v1',
  generationMetadata: { aspectRatio: '2:3', width: 1024, height: 1536 },
  providerModelDisplay: 'Sample image model', engagementSummary: { likeCount: 35, viewCount: 160 },
  officialTags: ['visual_style.magazine', 'content_type.portrait'], templatePricing: { accessCredits: 0, currency: 'credits' }
};
export const creationFixtures = Array.from({ length: 14 }, (_, index) => ({
  id: `template-work-${index}`, postType: 'image', title: `Community variation ${index + 1}`,
  creator: { username: `creator_${index + 1}`, displayName: `Creator ${index + 1}` },
  status: 'published', visibility: 'public',
  imageUrl: asset(['sunlit-storefront', 'cafe-seated-lifestyle', 'window-shadow-lookbook', 'soft-character-portrait'][index % 4]),
  engagementSummary: { likeCount: 80 - index, viewCount: 250 - index },
  createdAt: `2026-08-${String(index + 1).padStart(2, '0')}T00:00:00Z`
}));

export async function installTemplateDetailLayoutFixture(context, origin) {
  const blocked = await installCharacterDiscoveryLayoutFixture(context, origin);
  const html = await fs.readFile(new URL('../../web/dist/index.html', import.meta.url));
  const posts = [templateFixture, ...creationFixtures, { ...creationFixtures[0], id: 'ordinary-image', title: 'Standalone image' }];
  await context.route('**/api/community/template-previews?*', route => route.fulfill({ json: {
    items: [{ templatePostId: templateFixture.id, items: creationFixtures.slice(0, 3), hasMore: true }]
  } }));
  await context.route(/\/explore\/templates(?:\/[^?]*)?(?:\?.*)?$/, route => route.fulfill({ body: html, contentType: 'text/html' }));
  await context.route(/\/posts\/[^/?]+(?:\?.*)?$/, route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fallback();
    return route.fulfill({ body: html, contentType: 'text/html' });
  });
  await context.route('**/api/community/posts**', route => {
    const request = route.request();
    const url = new URL(request.url());
    const [, id, action] = url.pathname.match(/^\/api\/community\/posts\/([^/]+)\/([^/]+)$/) || [];
    const post = posts.find(item => item.id === id);
    if (action === 'views' && request.method() === 'POST') return route.fulfill({ json: { recorded: true } });
    if (request.method() !== 'GET') { blocked.push(`${request.method()} ${url.pathname}`); return route.abort(); }
    if (action === 'template-detail') {
      const family = id !== 'ordinary-image';
      const sorted = url.searchParams.get('sort') === 'latest' ? [...creationFixtures].reverse() : creationFixtures;
      const limit = Number(url.searchParams.get('limit')) || 12;
      const offset = Number(url.searchParams.get('cursor')) || 0;
      return route.fulfill({ json: {
        template: family ? templateFixture : null,
        items: family ? sorted.slice(offset, offset + limit) : [],
        nextCursor: family && offset + limit < sorted.length ? String(offset + limit) : null,
        hasMore: family && offset + limit < sorted.length
      } });
    }
    if (action === 'engagement') return route.fulfill({ json: {
      postId: id, summary: post?.engagementSummary || {}, viewerState: { liked: false, saved: false }, voteSummary: { bySlot: [], leaderSlotIds: [] }
    } });
    if (action === 'comments') return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
    if (url.pathname === '/api/community/posts') return route.fulfill({ json: {
      items: url.searchParams.get('postType') === 'template' ? [templateFixture] : creationFixtures.slice(0, 4),
      nextCursor: null, hasMore: false, facets: { officialTags: [] },
      ranking: { sort: 'latest', period: 'week', windowStart: '', windowEnd: '', algorithmVersion: 'fixture', calculatedAt: '' }
    } });
    return route.fallback();
  });
  await context.route('**/api/scene-templates/shared/*', route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1);
    const post = posts.find(item => item.id === id);
    if (route.request().method() !== 'GET' || !post) { blocked.push(`Unexpected shared route ${id}`); return route.abort(); }
    return route.fulfill({ json: post });
  });
  return blocked;
}
