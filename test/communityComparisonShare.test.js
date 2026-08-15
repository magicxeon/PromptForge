import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityComparisonShareService } from '../server/domain/community/CommunityComparisonShareService.js';
import { buildCommunityPostPublicView } from '../server/domain/community/communityPostPublicView.js';

const alice = { userId: 'usr_alice', username: 'user_alice', role: 'creator' };

test('Community-05 publishes only completed comparison slots and exposes proxy media', async () => {
  let stored = null;
  const service = new CommunityComparisonShareService({
    comparisonOrchestrator: {
      get: async () => ({
        id: 'cmp_1',
        name: 'Model comparison',
        winnerJobId: 'job_a',
        runs: [{
          status: 'completed',
          sourcePrompt: 'fashion portrait',
          slots: [
            {
              id: 'slot_a',
              position: 1,
              status: 'completed',
              jobId: 'job_a',
              providerDisplayName: { en: 'Provider A' },
              modelDisplayName: { en: 'Model A' },
              result: { imageUrl: '/outputs/a.png' }
            },
            {
              id: 'slot_b',
              position: 2,
              status: 'completed',
              jobId: 'job_b',
              providerDisplayName: { en: 'Provider B' },
              modelDisplayName: { en: 'Model B' },
              result: { imageUrl: '/outputs/b.png' }
            }
          ]
        }]
      })
    },
    postRepository: {
      readAll: async () => [],
      create: async input => {
        stored = { ...structuredClone(input), id: 'post_cmp', ownerUserId: alice.userId };
        return stored;
      }
    },
    profileService: {
      ensureProfileForActor: async () => ({ id: 'creator_alice' })
    },
    classificationService: {
      classifyGeneration: async () => ({ suggestions: [] }),
      preparePublishTaxonomy: async () => ({
        officialTags: [],
        customTags: [],
        categoryCodes: [],
        trendingCategoryCodes: []
      })
    }
  });
  await service.publish('cmp_1', {
    title: 'Public comparison',
    promptVisibility: 'private'
  }, alice);
  assert.equal(stored.postType, 'comparison');
  assert.equal(stored.promptVisibility, 'private');
  assert.equal(stored.sharedPromptSnapshot.publicPromptText, null);
  assert.equal(stored.comparisonSnapshot.slots.length, 2);
  const publicView = buildCommunityPostPublicView(stored);
  assert.equal(publicView.comparisonSnapshot.slots[0].imageUrl.includes('/outputs/'), false);
  assert.match(publicView.comparisonSnapshot.slots[0].imageUrl, /comparison-slots\/slot_a\/image$/);
  assert.equal(JSON.stringify(publicView).includes('job_a'), false);
});

test('Community comparison sharing selects the latest publishable rerun', async () => {
  let stored = null;
  const failedRun = {
    id: 'run_failed',
    status: 'failed',
    sourcePrompt: 'old prompt',
    slots: []
  };
  const completedRun = {
    id: 'run_latest',
    status: 'completed',
    sourcePrompt: 'latest prompt',
    slots: ['a', 'b'].map((suffix, index) => ({
      id: `slot_${suffix}`,
      position: index + 1,
      status: 'completed',
      jobId: `job_${suffix}`,
      result: { imageUrl: `/outputs/${suffix}.png` }
    }))
  };
  const service = new CommunityComparisonShareService({
    comparisonOrchestrator: {
      get: async () => ({
        id: 'cmp_rerun',
        name: 'Rerun',
        runs: [failedRun, completedRun]
      })
    },
    postRepository: {
      readAll: async () => [],
      create: async input => {
        stored = input;
        return { ...input, id: 'post_rerun', ownerUserId: alice.userId };
      }
    },
    profileService: {
      ensureProfileForActor: async () => ({ id: 'creator_alice' })
    },
    classificationService: {
      classifyGeneration: async value => ({ suggestions: [], sourcePrompt: value.prompt }),
      preparePublishTaxonomy: async () => ({
        officialTags: [],
        customTags: [],
        categoryCodes: [],
        trendingCategoryCodes: []
      })
    }
  });

  await service.publish('cmp_rerun', {}, alice);
  assert.equal(stored.promptVisibility, 'full');
  assert.equal(stored.sharedPromptSnapshot.publicPromptText, 'latest prompt');
  assert.equal(stored.comparisonSnapshot.slots.length, 2);
});
