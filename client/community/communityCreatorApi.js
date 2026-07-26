(() => {
  const apiJson = (url, options = {}) =>
    window.ModelPromptForgeApiClient.apiJson(url, options);

  const getOwnProfile = () =>
    apiJson('/api/community/creator-profiles/me');

  const updateOwnProfile = input =>
    apiJson('/api/community/creator-profiles/me', {
      method: 'PATCH',
      body: input
    });

  const getProfile = handle =>
    apiJson(`/api/community/creators/${encodeURIComponent(handle)}`);

  const getPortfolio = (handle, query = {}) => {
    const params = new URLSearchParams();
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.sort) params.set('sort', query.sort);
    const suffix = params.size ? `?${params}` : '';
    return apiJson(`/api/community/creators/${encodeURIComponent(handle)}/posts${suffix}`);
  };

  const follow = profileId =>
    apiJson(`/api/community/creators/${encodeURIComponent(profileId)}/follow`, {
      method: 'POST'
    });

  const unfollow = profileId =>
    apiJson(`/api/community/creators/${encodeURIComponent(profileId)}/follow`, {
      method: 'DELETE'
    });

  window.ModelPromptForgeCommunityCreatorApi = {
    getOwnProfile,
    updateOwnProfile,
    getProfile,
    getPortfolio,
    follow,
    unfollow
  };
})();
