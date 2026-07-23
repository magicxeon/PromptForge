export function buildCommunityPostPublicView(post = {}) {
  const snapshot = post.sceneTemplateSnapshot && typeof post.sceneTemplateSnapshot === 'object'
    ? post.sceneTemplateSnapshot
    : null;
  const promptVisibility = post.promptVisibility || 'hidden';
  const promptPreview = promptVisibility === 'full'
    ? trimPrompt(snapshot?.finalPromptSnapshot || snapshot?.manualPromptSnapshot || '')
    : null;

  return {
    id: post.id,
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
    promptVisibility,
    promptPreview,
    providerModelDisplay: providerModelDisplay(snapshot?.providerModelSnapshot),
    remixAvailability: post.reusePolicy === 'remix_allowed',
    templateAvailability: Boolean(snapshot) && post.reusePolicy !== 'view_only',
    counts: publicCounts(post.counts),
    createdAt: post.createdAt || null
  };
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
