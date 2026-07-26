import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CommunityClassificationService
} from '../server/domain/community/CommunityClassificationService.js';
import {
  toPublicCommunityTaxonomyCatalog,
  validateCommunityTaxonomyCatalog
} from '../server/config/communityTaxonomyCatalog.js';
import { CommunityPostAccessService } from '../server/domain/community/CommunityPostAccessService.js';
import { CommunityPostRepository } from '../server/repositories/community/CommunityPostRepository.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

const catalog = {
  schemaVersion: 1,
  taxonomyVersion: 'test-v1',
  thresholds: { high: 0.75, medium: 0.45, low: 0.25 },
  limits: { officialTagsPerPost: 4, customTagsPerPost: 2, customTagLength: 20 },
  dimensions: [
    {
      id: 'content_type',
      labels: { en: 'Content Type' },
      tags: [
        {
          id: 'content_type.fashion',
          labels: { en: 'Fashion' },
          aliases: ['fashion', 'outfit', 'dress'],
          workflowSignals: ['character-sheet']
        },
        {
          id: 'content_type.commercial',
          labels: { en: 'Commercial' },
          aliases: ['commercial', 'advertisement'],
          workflowSignals: []
        }
      ]
    },
    {
      id: 'market_context',
      labels: { en: 'Market Context' },
      tags: [
        {
          id: 'market_context.korean_style',
          labels: { en: 'Korean Style' },
          aliases: ['korean style', 'korean fashion'],
          workflowSignals: []
        }
      ]
    }
  ]
};

const service = new CommunityClassificationService({
  catalogLoader: async () => structuredClone(catalog)
});

test('taxonomy catalog validates unique stable ids and hides classifier signals from public clients', () => {
  assert.equal(validateCommunityTaxonomyCatalog(catalog), true);
  const publicCatalog = toPublicCommunityTaxonomyCatalog(catalog);
  assert.equal(publicCatalog.taxonomyVersion, 'test-v1');
  assert.equal(publicCatalog.dimensions[0].tags[0].id, 'content_type.fashion');
  assert.equal(publicCatalog.dimensions[0].tags[0].aliases, undefined);

  const duplicate = structuredClone(catalog);
  duplicate.dimensions[0].tags.push(structuredClone(duplicate.dimensions[0].tags[0]));
  assert.throws(() => validateCommunityTaxonomyCatalog(duplicate), /duplicated/);
});

test('structured selections and workflow signals outrank prompt-only fallback', async () => {
  const result = await service.classifyGeneration({
    mode: 'character-sheet',
    prompt: 'A commercial image',
    sceneTemplateSnapshot: {
      structuredSelectionsSnapshot: {
        'Outfit Base': { id: 'outfit.dress', value: 'fashion dress' }
      },
      finalPromptSnapshot: 'A commercial image'
    }
  });

  const fashion = result.assignments.find(item => item.tagId === 'content_type.fashion');
  const commercial = result.assignments.find(item => item.tagId === 'content_type.commercial');
  assert.equal(fashion.confidenceLevel, 'high');
  assert.deepEqual(fashion.sources.sort(), ['structured', 'workflow']);
  assert.equal(commercial.confidenceLevel, 'low');
  assert.equal(result.suggestions.some(item => item.tagId === 'content_type.commercial'), false);
});

test('publish selection accepts official ids only and user-added tags cannot force Trending', async () => {
  const classification = await service.classifyGeneration({
    mode: 'character-sheet',
    sceneTemplateSnapshot: {
      structuredSelectionsSnapshot: { Clothing: 'fashion outfit' }
    }
  });
  const prepared = await service.preparePublishTaxonomy(classification, {
    officialTags: ['content_type.fashion', 'market_context.korean_style'],
    customTags: ['Influencer', '#Wedding', 'third-tag-is-trimmed']
  });

  assert.deepEqual(prepared.categoryCodes, [
    'content_type.fashion',
    'market_context.korean_style'
  ]);
  assert.deepEqual(prepared.trendingCategoryCodes, ['content_type.fashion']);
  assert.deepEqual(prepared.customTags, ['Influencer', 'Wedding']);
  assert.equal(
    prepared.taxonomyAssignments.find(item => item.tagId === 'market_context.korean_style').sources[0],
    'user_selection'
  );

  await assert.rejects(
    () => service.preparePublishTaxonomy(classification, {
      officialTags: ['content_type.user-created']
    }),
    error => error.code === 'community_official_tag_invalid'
  );
});

test('admin correction produces audited-ready high-confidence assignments', async () => {
  const prepared = await service.prepareAdminTaxonomy({
    officialTags: ['content_type.commercial'],
    customTags: ['Campaign']
  });
  assert.deepEqual(prepared.trendingCategoryCodes, ['content_type.commercial']);
  assert.equal(prepared.taxonomyAssignments[0].status, 'admin_confirmed');
  assert.equal(prepared.taxonomyReviewStatus, 'admin_confirmed');
});

test('published taxonomy correction is admin-only and records before/after audit state', async () => {
  const post = {
    id: 'post_1',
    ownerUserId: 'usr_creator',
    ownerUsername: 'creator',
    title: 'Look',
    visibility: 'public',
    status: 'published',
    officialTags: ['content_type.fashion'],
    customTags: [],
    categoryCodes: ['content_type.fashion'],
    trendingCategoryCodes: ['content_type.fashion']
  };
  const auditEvents = [];
  const postRepository = {
    async findById() {
      return structuredClone(post);
    },
    async updateTaxonomyById(_id, taxonomy) {
      return { ...structuredClone(post), ...structuredClone(taxonomy) };
    }
  };
  const auditRepository = {
    async appendEvent(event, actor) {
      auditEvents.push({ ...structuredClone(event), actorUserId: actor.userId });
    }
  };
  const accessService = new CommunityPostAccessService({
    postRepository,
    auditRepository,
    classificationService: service
  });

  await assert.rejects(
    () => accessService.updateTaxonomy('post_1', {
      officialTags: ['content_type.commercial'],
      reason: 'Correction'
    }, { userId: 'usr_creator', username: 'creator', role: 'creator' }),
    error => error.code === 'community_taxonomy_forbidden'
  );

  const updated = await accessService.updateTaxonomy('post_1', {
    officialTags: ['content_type.commercial'],
    reason: 'Corrected after review'
  }, { userId: 'usr_admin', username: 'admin', role: 'admin' });
  assert.deepEqual(updated.officialTags, ['content_type.commercial']);
  assert.equal(auditEvents.length, 1);
  assert.deepEqual(auditEvents[0].beforeSnapshot.officialTags, ['content_type.fashion']);
  assert.deepEqual(auditEvents[0].afterSnapshot.officialTags, ['content_type.commercial']);
});

test('public repository separates official category, custom search, and Trending eligibility', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'community-taxonomy-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const usersFile = path.join(directory, 'users.json');
  const postsFile = path.join(directory, 'posts.json');
  await fs.writeFile(usersFile, JSON.stringify([
    { id: 'usr_creator', username: 'creator', role: 'creator', status: 'active' }
  ]), 'utf8');

  const repository = new CommunityPostRepository({
    postsFile,
    userRepository: new MockUserRepository({ usersFile }),
    cursorSecret: 'taxonomy-test'
  });
  const actor = { userId: 'usr_creator', username: 'creator', role: 'creator' };
  await repository.create({
    title: 'Fashion campaign',
    officialTags: ['content_type.fashion'],
    customTags: ['Wedding'],
    categoryCodes: ['content_type.fashion'],
    trendingCategoryCodes: ['content_type.fashion']
  }, actor);
  await repository.create({
    title: 'User-selected commercial',
    officialTags: ['content_type.commercial'],
    customTags: ['Influencer'],
    categoryCodes: ['content_type.commercial'],
    trendingCategoryCodes: []
  }, actor);

  const official = await repository.listPublic({
    filters: { officialTag: 'content_type.commercial' }
  }, actor);
  assert.deepEqual(official.items.map(item => item.title), ['User-selected commercial']);

  const custom = await repository.listPublic({ filters: { customTag: 'wedding' } }, actor);
  assert.deepEqual(custom.items.map(item => item.title), ['Fashion campaign']);

  const search = await repository.listPublic({ filters: { search: 'influencer' } }, actor);
  assert.deepEqual(search.items.map(item => item.title), ['User-selected commercial']);

  const trending = await repository.listPublic({ sort: 'trending' }, actor);
  assert.deepEqual(trending.items.map(item => item.title), ['Fashion campaign']);
});
