export function buildCommunityPostPublicView(post = {}) {
  const snapshot = post.sceneTemplateSnapshot && typeof post.sceneTemplateSnapshot === 'object'
    ? post.sceneTemplateSnapshot
    : null;
  const promptVisibility = post.promptVisibility || 'hidden';
  const sharedPrompt = post.sharedPromptSnapshot && typeof post.sharedPromptSnapshot === 'object'
    ? post.sharedPromptSnapshot
    : null;
  const promptPreview = ['full', 'partial'].includes(promptVisibility)
    ? trimPrompt(
      sharedPrompt?.publicPromptText
        || snapshot?.finalPromptSnapshot
        || snapshot?.manualPromptSnapshot
        || ''
    )
    : null;

  return {
    id: post.id,
    postType: publicPostType(post),
    creator: {
      username: post.ownerUsername || null,
      displayName: post.creatorDisplayName || post.ownerUsername || 'Creator',
      profileId: post.creatorProfileId || null,
      handle: creatorHandle(post.creatorHandle || post.ownerUsername)
    },
    title: post.title || '',
    description: post.description || '',
    imageUrl: post.imageUrl ? communityMediaUrl(post.id, 'image') : null,
    thumbnailUrl: (post.thumbnailUrl || post.imageUrl) ? communityMediaUrl(post.id, 'thumbnail') : null,
    officialTags: stringArray(post.officialTags),
    customTags: stringArray(post.customTags),
    taxonomy: {
      version: post.taxonomyVersion || null,
      assignments: publicTaxonomyAssignments(post.taxonomyAssignments),
      categoryCodes: stringArray(post.categoryCodes),
      trendingCategoryCodes: stringArray(post.trendingCategoryCodes),
      reviewStatus: post.taxonomyReviewStatus || 'unclassified'
    },
    promptVisibility,
    promptPreview,
    providerModelDisplay: providerModelDisplay(
      post.providerModelSnapshot || snapshot?.providerModelSnapshot
    ),
    remixAvailability: post.reusePolicy === 'remix_allowed',
    templateAvailability: Boolean(snapshot)
      && post.reusePolicy !== 'view_only'
      && promptVisibility !== 'private',
    comparisonSnapshot: publicComparisonSnapshot(post),
    collectionSnapshot: publicCollectionSnapshot(post),
    contentDisclosure: 'ai_generated',
    engagementSummary: publicEngagementSummary(post.engagementSummary, post.counts),
    counts: publicCounts(post.counts),
    createdAt: post.createdAt || null
  };
}

function publicComparisonSnapshot(post) {
  if (publicPostType(post) !== 'comparison') return null;
  const source = post.comparisonSnapshot || post.workflowSnapshot?.comparison;
  const slots = Array.isArray(source?.slots) ? source.slots : [];
  return {
    criteria: typeof source?.criteria === 'string' ? source.criteria : null,
    slots: slots.map(slot => ({
      slotId: String(slot.slotId || slot.id || ''),
      position: Number(slot.position) || null,
      providerDisplayName: displayLabel(slot.providerDisplayName || slot.provider),
      modelDisplayName: displayLabel(slot.modelDisplayName || slot.model),
      imageUrl: `/api/community/posts/${encodeURIComponent(post.id)}/comparison-slots/${encodeURIComponent(slot.slotId || slot.id)}/image`,
      generationDuration: slot.generationDuration || null
    })).filter(slot => slot.slotId)
  };
}

function publicCollectionSnapshot(post) {
  if (publicPostType(post) !== 'collection') return null;
  const source = post.collectionSnapshot || post.workflowSnapshot?.collection;
  const items = Array.isArray(source?.items) ? source.items : [];
  return {
    itemCount: items.length,
    items: items.map(item => ({
      itemId: String(item.itemId || ''),
      imageUrl: collectionItemMediaUrl(post.id, item.itemId, 'image'),
      thumbnailUrl: collectionItemMediaUrl(post.id, item.itemId, 'thumbnail'),
      providerDisplayName: displayLabel(item.providerDisplayName),
      modelDisplayName: displayLabel(item.modelDisplayName),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : null
    })).filter(item => item.itemId)
  };
}

function collectionItemMediaUrl(postId, itemId, kind) {
  return postId && itemId
    ? `/api/community/posts/${encodeURIComponent(postId)}/collection-items/${encodeURIComponent(itemId)}/${kind}`
    : null;
}

function displayLabel(value) {
  if (typeof value === 'string') return value;
  return value?.en || value?.th || value?.ja || null;
}

function creatorHandle(value) {
  const handle = String(value || '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return handle || null;
}

function publicPostType(post) {
  if (['image', 'template', 'comparison', 'collection'].includes(post.postType)) return post.postType;
  if (post.sourceCollectionId || post.collectionSnapshot) return 'collection';
  if (post.sourceComparisonSetId) return 'comparison';
  if (post.sourceType === 'scene_template' || post.sceneTemplateSnapshot) return 'template';
  return 'image';
}

function communityMediaUrl(postId, kind) {
  return postId ? `/api/scene-templates/shared/${encodeURIComponent(postId)}/${kind}` : null;
}

function trimPrompt(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized ? normalized.slice(0, 280) : null;
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
}

function providerModelDisplay(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const provider = typeof snapshot.providerDisplayName === 'string' ? snapshot.providerDisplayName : snapshot.providerId;
  const model = typeof snapshot.modelDisplayName === 'string' ? snapshot.modelDisplayName : snapshot.modelId;
  return [provider, model].filter(Boolean).join(' - ') || null;
}

function publicCounts(value) {
  const counts = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(['likes', 'votes', 'comments', 'remixes', 'uses']
    .map(key => [key, Number.isFinite(Number(counts[key])) ? Math.max(0, Number(counts[key])) : 0]));
}

function publicEngagementSummary(value, legacyCounts) {
  const summary = value && typeof value === 'object' ? value : {};
  const counts = legacyCounts && typeof legacyCounts === 'object' ? legacyCounts : {};
  return {
    viewCount: publicCount(summary.viewCount ?? counts.views),
    likeCount: publicCount(summary.likeCount ?? counts.likes),
    saveCount: publicCount(summary.saveCount ?? counts.saves),
    commentCount: publicCount(summary.commentCount ?? counts.comments),
    remixSuccessCount: publicCount(summary.remixSuccessCount ?? counts.remixes ?? counts.uses),
    comparisonVoteCount: publicCount(summary.comparisonVoteCount ?? counts.votes),
    updatedAt: typeof summary.updatedAt === 'string' ? summary.updatedAt : null
  };
}

function publicCount(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

function publicTaxonomyAssignments(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => item && typeof item === 'object').map(item => ({
    tagId: item.tagId,
    dimensionId: item.dimensionId,
    confidenceLevel: item.confidenceLevel,
    status: item.status,
    categoryEligible: item.categoryEligible === true,
    trendingEligible: item.trendingEligible === true
  }));
}
