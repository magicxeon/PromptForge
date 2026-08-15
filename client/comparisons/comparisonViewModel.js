(() => {
  const namespace = window.ModelPromptForgeComparisons ||= {};

  function fromPrivateComparisonSet(set = {}) {
    const run = Array.isArray(set.runs) ? set.runs[0] : null;
    const results = (run?.slots || []).map((slot, index) => ({
      id: String(slot.id || slot.slotId || index),
      slotId: String(slot.id || slot.slotId || index),
      jobId: slot.jobId || null,
      imageUrl: slot.result?.imageUrl || slot.imageUrl || slot.thumbnailUrl || '',
      thumbnailUrl: slot.thumbnailUrl || slot.result?.imageUrl || slot.imageUrl || '',
      providerLabel: displayLabel(slot.providerDisplayName) || slot.provider || '',
      modelLabel: displayLabel(slot.modelDisplayName) || slot.model || '',
      status: slot.status || 'queued',
      credit: Number(slot.actualCredit ?? slot.estimatedCredit) || 0,
      generationDuration: slot.result?.generationDuration || slot.generationDuration || null,
      error: slot.error || null,
      isOwnerWinner: Boolean(set.winnerJobId && set.winnerJobId === slot.jobId),
      voteCount: 0,
      isVoteLeader: false,
      isActorVote: false
    }));
    return {
      id: set.id || null,
      context: 'private',
      title: set.name || 'Model comparison',
      creator: null,
      createdAt: set.createdAt || set.updatedAt || null,
      status: run?.status || set.status || 'queued',
      promptDisclosure: {
        visible: true,
        text: set.prompt || run?.sourcePrompt || run?.prompt || ''
      },
      results,
      ownerSelectedWinner: set.winnerJobId || null,
      communityVoteSummary: emptyVoteSummary(),
      engagementSummary: null,
      permissions: {
        canSelectPrivateWinner: true,
        canUseReference: true,
        canAddToCollection: true,
        canDownload: true,
        canVote: false
      }
    };
  }

  function fromPublicCommunityPost(post = {}, engagement = {}) {
    const voteSummary = normalizeVoteSummary(engagement.voteSummary, engagement.viewerState);
    const counts = new Map(voteSummary.bySlot.map(item => [item.slotId, item.count]));
    const leaders = new Set(voteSummary.leaderSlotIds);
    const results = (post.comparisonSnapshot?.slots || []).map((slot, index) => {
      const slotId = String(slot.slotId || slot.id || index);
      return {
        id: slotId,
        slotId,
        jobId: null,
        imageUrl: slot.imageUrl || '',
        thumbnailUrl: slot.thumbnailUrl || slot.imageUrl || '',
        providerLabel: slot.providerDisplayName || '',
        modelLabel: slot.modelDisplayName || '',
        status: slot.status || 'completed',
        credit: 0,
        generationDuration: slot.generationDuration || null,
        error: null,
        isOwnerWinner: false,
        voteCount: counts.get(slotId) || 0,
        isVoteLeader: leaders.has(slotId),
        isActorVote: voteSummary.actorSlotId === slotId
      };
    });
    return {
      id: post.id || null,
      context: 'community',
      title: post.title || 'Community comparison',
      creator: post.creator || null,
      createdAt: post.createdAt || null,
      status: 'completed',
      promptDisclosure: {
        visible: Boolean(post.promptPreview),
        text: post.promptPreview || ''
      },
      results,
      ownerSelectedWinner: null,
      communityVoteSummary: voteSummary,
      engagementSummary: engagement.summary || post.engagementSummary || null,
      permissions: {
        canSelectPrivateWinner: false,
        canUseReference: false,
        canAddToCollection: false,
        canDownload: false,
        canVote: post.viewer?.permissions?.canVoteComparison
          ?? (post.viewer?.isOwner !== true),
        canReport: post.viewer?.permissions?.canReport
          ?? (post.viewer?.isOwner !== true)
      }
    };
  }

  function normalizeVoteSummary(value = {}, viewerState = {}) {
    const bySlot = Array.isArray(value?.bySlot)
      ? value.bySlot.map(item => ({
          slotId: String(item.slotId || ''),
          count: Math.max(0, Number(item.count) || 0)
        })).filter(item => item.slotId)
      : [];
    const highestCount = Math.max(0, Number(value?.highestCount) || 0);
    return {
      total: Math.max(0, Number(value?.total) || 0),
      bySlot,
      highestCount,
      leaderSlotIds: highestCount > 0 && Array.isArray(value?.leaderSlotIds)
        ? value.leaderSlotIds.map(String)
        : [],
      actorSlotId: value?.actorSlotId
        || viewerState?.comparisonVoteSlotId
        || null
    };
  }

  function emptyVoteSummary() {
    return {
      total: 0,
      bySlot: [],
      highestCount: 0,
      leaderSlotIds: [],
      actorSlotId: null
    };
  }

  function displayLabel(value) {
    if (typeof value === 'string') return value;
    const locale = window.ModelPromptForgeI18n?.getLocale?.() || 'en';
    return value?.[locale] || value?.en || value?.th || '';
  }

  namespace.fromPrivateComparisonSet = fromPrivateComparisonSet;
  namespace.fromPublicCommunityPost = fromPublicCommunityPost;
})();
