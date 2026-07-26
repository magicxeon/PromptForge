(() => {
  const api = (url, options = {}) =>
    window.ModelPromptForgeApiClient.apiJson(url, options);
  const query = ({ limit = 24, cursor = '' } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return params;
  };

  window.ModelPromptForgeCommunityGalleryApi = {
    addGalleryItem: input => api('/api/community/gallery', {
      method: 'POST',
      body: input
    }),
    createCharacter: input => api('/api/community/characters', {
      method: 'POST',
      body: input
    }),
    listGallery: (handle, options) => api(
      `/api/community/creators/${encodeURIComponent(handle)}/gallery?${query(options)}`
    ),
    listCharacters: (handle, options) => api(
      `/api/community/creators/${encodeURIComponent(handle)}/characters?${query(options)}`
    )
  };
})();
