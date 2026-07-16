(() => {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
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
