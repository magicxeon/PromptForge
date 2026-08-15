import assert from 'node:assert/strict';
import test from 'node:test';

test('public comparison view model exposes vote leaders without private actions', async () => {
  globalThis.window = {
    ModelPromptForgeI18n: {
      getLocale: () => 'en'
    }
  };
  try {
    await import(`../client/comparisons/comparisonViewModel.js?test=${Date.now()}`);
    const viewModel = globalThis.window.ModelPromptForgeComparisons.fromPublicCommunityPost({
      id: 'post_1',
      title: 'Public comparison',
      viewer: {
        isOwner: false,
        permissions: {
          canVoteComparison: true,
          canReport: true,
          canUsePrivateReferences: false
        }
      },
      comparisonSnapshot: {
        slots: [
          { slotId: 'slot_a', imageUrl: '/public/a', modelDisplayName: 'A' },
          { slotId: 'slot_b', imageUrl: '/public/b', modelDisplayName: 'B' }
        ]
      }
    }, {
      viewerState: { comparisonVoteSlotId: 'slot_b' },
      voteSummary: {
        total: 3,
        bySlot: [
          { slotId: 'slot_a', count: 1 },
          { slotId: 'slot_b', count: 2 }
        ],
        highestCount: 2,
        leaderSlotIds: ['slot_b'],
        actorSlotId: 'slot_b'
      }
    });

    assert.equal(viewModel.permissions.canVote, true);
    assert.equal(viewModel.permissions.canUseReference, false);
    assert.equal(viewModel.permissions.canDownload, false);
    assert.equal(viewModel.results[1].isVoteLeader, true);
    assert.equal(viewModel.results[1].isActorVote, true);
    assert.equal(viewModel.results[1].voteCount, 2);
    assert.equal(Object.hasOwn(viewModel.results[0], 'ownerUserId'), false);
    assert.equal(Object.hasOwn(viewModel.results[0], 'referenceImage'), false);
  } finally {
    delete globalThis.window;
  }
});

test('private comparison view model keeps owner actions separate from Community votes', async () => {
  globalThis.window = {
    ModelPromptForgeI18n: {
      getLocale: () => 'en'
    }
  };
  try {
    await import(`../client/comparisons/comparisonViewModel.js?test=${Date.now()}-private`);
    const viewModel = globalThis.window.ModelPromptForgeComparisons.fromPrivateComparisonSet({
      id: 'set_1',
      winnerJobId: 'job_b',
      runs: [{
        sourcePrompt: 'studio prompt',
        slots: [
          { id: 'slot_a', jobId: 'job_a', status: 'completed' },
          { id: 'slot_b', jobId: 'job_b', status: 'completed' }
        ]
      }]
    });

    assert.equal(viewModel.permissions.canSelectPrivateWinner, true);
    assert.equal(viewModel.permissions.canUseReference, true);
    assert.equal(viewModel.permissions.canVote, false);
    assert.equal(viewModel.results[1].isOwnerWinner, true);
    assert.equal(viewModel.results[1].isVoteLeader, false);
    assert.equal(viewModel.promptDisclosure.text, 'studio prompt');
  } finally {
    delete globalThis.window;
  }
});
