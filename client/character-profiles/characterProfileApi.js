(() => {
  const api = (url, options = {}) => window.ModelPromptForgeApiClient.apiJson(url, options);
  const query = options => {
    const params = new URLSearchParams();
    Object.entries(options || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    return params.toString();
  };

  window.ModelPromptForgeCharacterProfileApi = {
    create: input => api('/api/character-profiles', { method: 'POST', body: input }),
    listOwn: options => api(`/api/character-profiles?${query(options)}`),
    getOwn: id => api(`/api/character-profiles/${encodeURIComponent(id)}`),
    update: (id, input) => api(`/api/character-profiles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input
    }),
    archive: id => api(`/api/character-profiles/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      body: {}
    }),
    createVersion: (id, input) => api(
      `/api/character-profiles/${encodeURIComponent(id)}/versions`,
      { method: 'POST', body: input }
    ),
    createCastingPlan: (id, input = {}) => api(
      `/api/character-profiles/${encodeURIComponent(id)}/casting-export-plan`,
      { method: 'POST', body: input }
    ),
    convertToReusable: id => api(
      `/api/character-profiles/${encodeURIComponent(id)}/convert-to-reusable`,
      { method: 'POST', body: {} }
    ),
    approve: (id, input) => api(`/api/character-profiles/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: input
    }),
    updateSharing: (id, input) => api(`/api/character-profiles/${encodeURIComponent(id)}/sharing`, {
      method: 'POST',
      body: input
    }),
    listPublic: options => api(`/api/community/characters?${query(options)}`),
    getPublic: id => api(`/api/community/characters/${encodeURIComponent(id)}`),
    listWorks: (id, options) => api(
      `/api/community/characters/${encodeURIComponent(id)}/works?${query(options)}`
    ),
    createHandoff: (id, destination) => api(
      `/api/community/characters/${encodeURIComponent(id)}/handoffs`,
      { method: 'POST', body: { destination } }
    )
  };
})();
