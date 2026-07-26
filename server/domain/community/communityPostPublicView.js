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
      profileId: post.creatorProfileId || null
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
    contentDisclosure: 'ai_generated',
    engagementSummary: publicEngagementSummary(post.engagementSummary, post.counts),
    counts: publicCounts(post.counts),
    createdAt: post.createdAt || null
  };
}

function publicPostType(post) {
  if (['image', 'template', 'comparison'].includes(post.postType)) return post.postType;
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
