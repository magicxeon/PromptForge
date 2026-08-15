/**
 * Community-12 client API boundary.
 * Presentation remains owned by Community-05; this module contains no scoring.
 */
(() => {
  const api = (url, options = {}) =>
    window.ModelPromptForgeApiClient.apiJson(url, options);
  const postUrl = postId =>
    `/api/community/posts/${encodeURIComponent(postId)}`;

  const listPosts = ({
    sort = 'latest',
    period = 'week',
    officialTag = '',
    postType = 'all',
    search = '',
    limit = 24,
    cursor = ''
  } = {}) => {
    const params = new URLSearchParams({ sort, period, postType, limit: String(limit) });
    if (officialTag) params.set('officialTag', officialTag);
    if (search) params.set('search', search);
    if (cursor) params.set('cursor', cursor);
    return api(`/api/community/posts?${params}`);
  };

  const getPost = postId =>
    api(`/api/scene-templates/shared/${encodeURIComponent(postId)}`);
  const getTaxonomy = () =>
    api('/api/community/taxonomy');
  const getEngagement = postId =>
    api(`${postUrl(postId)}/engagement`);
  const recordView = postId =>
    api(`${postUrl(postId)}/views`, { method: 'POST', body: {} });
  const setReaction = (postId, reactionType, active) =>
    api(`${postUrl(postId)}/reactions/${encodeURIComponent(reactionType)}`, {
      method: active ? 'PUT' : 'DELETE',
      body: active ? {} : undefined
    });
  const listComments = (postId, { cursor = '', limit = 24 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return api(`${postUrl(postId)}/comments?${params}`);
  };
  const createComment = (postId, body) =>
    api(`${postUrl(postId)}/comments`, { method: 'POST', body: { body } });
  const removeComment = (postId, commentId) =>
    api(`${postUrl(postId)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE'
    });
  const reportComment = (postId, commentId, report) =>
    api(`${postUrl(postId)}/comments/${encodeURIComponent(commentId)}/report`, {
      method: 'POST',
      body: report
    });
  const setComparisonVote = (postId, comparisonSlotId) =>
    api(`${postUrl(postId)}/comparison-vote`, {
      method: 'PUT',
      body: { comparisonSlotId }
    });
  const removeComparisonVote = postId =>
    api(`${postUrl(postId)}/comparison-vote`, { method: 'DELETE' });

  window.ModelPromptForgeCommunityEngagementApi = {
    listPosts,
    getPost,
    getTaxonomy,
    getEngagement,
    recordView,
    setReaction,
    listComments,
    createComment,
    removeComment,
    reportComment,
    setComparisonVote,
    removeComparisonVote
  };
})();
