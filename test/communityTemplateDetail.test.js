import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityTemplateDetailService } from '../server/domain/community/CommunityTemplateDetailService.js';
import { registerCommunityShareRoutes } from '../server/app/routes/communityShareRoutes.js';
import { RepositoryContractError } from '../server/repositories/repositoryContracts.js';
import { GenerationResultRepository } from '../server/repositories/generation/GenerationResultRepository.js';

const actor = { userId: 'viewer', username: 'viewer', role: 'user' };
const root = { id: 'root', postType: 'template', ownerUserId: 'creator', visibility: 'public', status: 'published', title: 'Original', templateId: 'tpl', templateVersionId: 'v2', imageUrl: '/private/source.jpg' };
const makePost = (id, overrides = {}) => ({ id, postType: 'image', ownerUserId: id, visibility: 'public', status: 'published', sourceGenerationId: `job-${id}`, imageUrl: `/private/${id}.jpg`, engagementSummary: { likeCount: 2 }, createdAt: '2026-09-01', ...overrides });
const makeJob = (post, overrides = {}) => ({ id: post.sourceGenerationId, ownerUserId: post.ownerUserId, status: 'completed', templateUseContext: { templateId: 'tpl', templateVersionId: 'v1', sourceCommunityPostId: 'root', secret: 'DO_NOT_EXPOSE' }, ...overrides });
function setup(posts, jobs = posts.filter(p => p.postType === 'image').map(p => makeJob(p))) {
  let reads = 0;
  return { service: new CommunityTemplateDetailService({
    postRepository: { findById: async id => posts.find(p => p.id === id), readAll: async () => posts },
    generationRepository: { findByIds: async ids => { reads++; return jobs.filter(j => ids.includes(j.id)); } }
  }), reads: () => reads };
}

test('template family sorts all public creators by likes before pagination; latest remains separate', async () => {
  const a = makePost('a', { engagementSummary: { likeCount: 9 } });
  const b = makePost('b', { createdAt: '2026-09-03' });
  const c = makePost('c', { engagementSummary: { likeCount: 9 } });
  const { service, reads } = setup([root, a, b, c]);
  const first = await service.getForPost('root', { limit: 1 }, actor);
  assert.equal(first.items[0].id, 'c');
  assert.equal(first.template.id, 'root');
  assert.equal(first.hasMore, true);
  const next = await service.getForPost('root', { limit: 1, cursor: first.nextCursor }, actor);
  assert.equal(next.items[0].id, 'a');
  assert.equal((await service.getForPost('root', { sort: 'latest' }, actor)).items[0].id, 'b');
  assert.equal(reads(), 3);
  assert.ok(!JSON.stringify(first).includes('/private/'));
  assert.ok(!JSON.stringify(first).includes('DO_NOT_EXPOSE'));
});

test('existing shared image resolves original even across canonical template versions', async () => {
  const image = makePost('image');
  const page = await setup([root, image]).service.getForPost('image', {}, actor);
  assert.equal(page.template.id, 'root');
  assert.deepEqual(page.items.map(p => p.id), ['image']);
});

for (const patch of [{ visibility: 'private' }, { visibility: 'unlisted' }, { status: 'hidden' }, { status: 'removed' }, { status: 'owner_unpublished' }, { deletedAt: '2026-09-04' }]) {
  test(`never lists non-public/retired work: ${JSON.stringify(patch)}`, async () => {
    const image = makePost('image', patch);
    const page = await setup([root, image]).service.getForPost('root', {}, actor);
    assert.equal(page.items.length, 0);
  });
}

for (const patch of [{ ownerUserId: 'other' }, { status: 'failed' }, { deletedAt: '2026-09-04' }, { templateUseContext: null }, { templateUseContext: { templateId: 'other', templateVersionId: 'v1', sourceCommunityPostId: 'root' } }]) {
  test(`ignores unverified lineage: ${JSON.stringify(patch)}`, async () => {
    const image = makePost('image', { templateId: 'tpl' });
    const { service } = setup([root, image], [makeJob(image, patch)]);
    assert.equal((await service.getForPost('image', {}, actor)).template, null);
    assert.equal((await service.getForPost('root', {}, actor)).items.length, 0);
  });
}

test('missing history/legacy template is inspectable but does not invent variations', async () => {
  const image = makePost('image');
  const { service } = setup([{ ...root, templateId: null }, image], []);
  assert.equal((await service.getForPost('root', {}, actor)).template.id, 'root');
  assert.equal((await service.getForPost('image', {}, actor)).template, null);
});

test('hidden recorded source fails closed instead of resolving another public post for same template', async () => {
  const image = makePost('image');
  const { service } = setup([{ ...root, visibility: 'private' }, { ...root, id: 'public-copy' }, image]);
  assert.equal((await service.getForPost('image', {}, actor)).template, null);
  await assert.rejects(service.getForPost('root', {}, actor), { code: 'community_post_unavailable' });
});

test('canonical fallback requires an absent source post and validates completed ownership', async () => {
  const image = makePost('image');
  const job = makeJob(image, { templateUseContext: { templateId: 'tpl', templateVersionId: 'v1' } });
  assert.equal((await setup([root, image], [job]).service.getForPost('image', {}, actor)).template.id, 'root');
});

test('signed cursor rejects tampering and cross actor/template/sort; limits are bounded', async () => {
  const { service } = setup([root, { ...root, id: 'second-root', templateId: 'second' }, makePost('a'), makePost('b')]);
  const page = await service.getForPost('root', { limit: 1 }, actor);
  for (const [id, query, viewer] of [
    ['root', { cursor: `${page.nextCursor}x` }, actor],
    ['root', { cursor: page.nextCursor, sort: 'latest' }, actor],
    ['root', { cursor: page.nextCursor }, { ...actor, userId: 'other' }],
    ['second-root', { cursor: page.nextCursor }, actor]
  ]) await assert.rejects(service.getForPost(id, query, viewer), { code: 'invalid_repository_cursor' });
  for (const query of [{ limit: 25 }, { limit: 0 }, { limit: 'NaN' }, { sort: 'random' }]) {
    await assert.rejects(service.getForPost('root', query, actor), { code: 'template_detail_query_invalid' });
  }
});

test('HTTP route gates reads, passes actor and sanitizes unexpected failures', async () => {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post', 'patch', 'delete'].map(method => [method, (path, fn) => routes.set(`${method} ${path}`, fn)]));
  let enabled = true;
  let args;
  let fail = false;
  registerCommunityShareRoutes(app, {
    communityFeaturePolicyService: { assertEnabled: async key => { assert.equal(key, 'community.enabled'); if (!enabled) throw new RepositoryContractError('disabled', 'Disabled', 404); } },
    communityShareService: { getTemplateDetail: async (...input) => { args = input; if (fail) throw Object.assign(new Error('private secret path'), { code: 'EACCES' }); return { template: root }; } }
  });
  const handler = routes.get('get /api/community/posts/:postId/template-detail');
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const req = { params: { postId: 'root' }, query: { limit: '4' }, actorContext: actor };
  await handler(req, res);
  assert.deepEqual(args, ['root', req.query, actor]);
  enabled = false; args = null;
  await handler(req, res);
  assert.equal(res.statusCode, 404); assert.equal(args, null);
  enabled = true; fail = true;
  await handler(req, res);
  assert.equal(res.statusCode, 500);
  assert.ok(!JSON.stringify(res.body).includes('private secret'));
  assert.equal(res.body.error.code, 'template_detail_failed');
});

test('real history adapter normalizes legacy username/status and preserves trusted context without exposing private inputs', async () => {
  const image = makePost('image');
  const raw = { id: image.sourceGenerationId, username: 'image', timestamp: 1788000000000,
    templateUseContext: { templateId: 'tpl', templateVersionId: 'v1', sourceCommunityPostId: 'root', templateUseSessionId: 'PRIVATE_SESSION', replacementSummary: ['PRIVATE_REPLACEMENT'] },
    prompt: 'PRIVATE_PROMPT', references: ['PRIVATE_REFERENCE'] };
  const generationRepository = new GenerationResultRepository({ historyStore: { readAll: async () => [raw] }, userRepository: { findByUsername: async username => ({ id: username, username }) } });
  const posts = [root, image];
  const service = new CommunityTemplateDetailService({ postRepository: { findById: async id => posts.find(p => p.id === id), readAll: async () => posts }, generationRepository });
  const page = await service.getForPost(image.id, {}, actor);
  assert.equal(page.template.id, root.id);
  assert.equal(page.items.length, 1);
  assert.ok(!JSON.stringify(page).includes('PRIVATE_'));
});

test('source denial does not read history and visibility is rechecked after a cursor was issued', async () => {
  const a = makePost('a', { engagementSummary: { likeCount: 9 } });
  const b = makePost('b');
  const localRoot = { ...root };
  const { service, reads } = setup([localRoot, a, b]);
  const first = await service.getForPost('root', { limit: 1 }, actor);
  b.status = 'hidden';
  assert.equal((await service.getForPost('root', { cursor: first.nextCursor }, actor)).items.length, 0);
  localRoot.visibility = 'private';
  const before = reads();
  await assert.rejects(service.getForPost('root', { cursor: first.nextCursor }, actor), { code: 'community_post_unavailable' });
  assert.equal(reads(), before);
});
