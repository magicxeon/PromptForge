/**
 * ModelPromptForge - API client helper with automatic x-mpf-user-id headers
 */
(function () {
  async function apiFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };

    // Inject active actor user id header
    if (window.ModelPromptForgeActorContext?.getActorHeader) {
      Object.assign(headers, window.ModelPromptForgeActorContext.getActorHeader());
    }

    let body = options.body;
    
    // Automatically serialize plain object body and set content-type header
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const mergedOptions = {
      ...options,
      headers,
      body
    };

    return fetch(url, mergedOptions);
  }

  async function apiJson(url, options = {}) {
    const res = await apiFetch(url, options);
    if (!res.ok) {
      let message = `API Request failed: ${res.status} ${res.statusText}`;
      try {
        const errorBody = await res.json();
        if (errorBody && errorBody.error) {
          message = typeof errorBody.error === 'object' ? errorBody.error.message : errorBody.error;
        }
      } catch (_) {}
      throw new Error(message);
    }
    return res.json();
  }

  window.ModelPromptForgeApiClient = {
    apiFetch,
    apiJson
  };
})();
