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

  const updateOwnPresentation = input =>
    apiJson('/api/community/creator-profiles/me/presentation', {
      method: 'PATCH',
      body: input
    });

  const getProfile = handle =>
    apiJson(`/api/community/creators/${encodeURIComponent(handle)}`);

  const getPage = (handle, query = {}) => {
    const params = new URLSearchParams();
    if (query.tab) params.set('tab', query.tab);
    if (query.cursor) params.set('cursor', query.cursor);
    if (query.limit) params.set('limit', String(query.limit));
    const suffix = params.size ? `?${params}` : '';
    return apiJson(`/api/community/creators/${encodeURIComponent(handle)}/page${suffix}`);
  };

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
    updateOwnPresentation,
    getProfile,
    getPage,
    getPortfolio,
    follow,
    unfollow
  };
})();
