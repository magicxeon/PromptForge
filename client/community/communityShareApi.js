/**
 * Community generated-image publishing API.
 */
(function () {
  async function request(url, options = {}) {
    const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
    const response = await apiFetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = payload?.error;
      const exception = new Error(
        typeof error === 'object' ? error.message : error || 'Community share request failed.'
      );
      exception.code = typeof error === 'object' ? error.code : 'community_share_failed';
      throw exception;
    }
    return payload;
  }

  function createDraft(sourceGenerationId) {
    return request('/api/community/share-drafts', {
      method: 'POST',
      body: { sourceGenerationId }
    });
  }

  function updateDraft(draftId, input) {
    return request(`/api/community/share-drafts/${encodeURIComponent(draftId)}`, {
      method: 'PATCH',
      body: input
    });
  }

  function publishDraft(draftId, input) {
    return request(`/api/community/share-drafts/${encodeURIComponent(draftId)}/publish`, {
      method: 'POST',
      body: input
    });
  }

  window.ModelPromptForgeCommunityShareApi = {
    createDraft,
    updateDraft,
    publishDraft
  };
})();
