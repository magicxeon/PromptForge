(() => {
  async function request(url, options = {}) {
    const apiClient = window.ModelPromptForgeApiClient;
    const fallbackOptions = {
      ...options,
      headers: options.body
        ? { 'Content-Type': 'application/json', ...(options.headers || {}) }
        : options.headers,
      body: options.body && typeof options.body === 'object'
        ? JSON.stringify(options.body)
        : options.body
    };
    const response = apiClient?.apiFetch
      ? await apiClient.apiFetch(url, options)
      : await fetch(url, fallbackOptions);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error?.message || payload.error || `Request failed with HTTP ${response.status}`);
      error.status = response.status;
      error.code = payload.error?.code || null;
      throw error;
    }
    return payload;
  }

  window.ModelPromptForgeComparisonApi = { request };
})();
