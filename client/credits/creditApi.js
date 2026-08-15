/**
 * Client API Wrapper for Credit Services
 */
window.CreditApi = {
  async fetchAccount() {
    const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
    const res = await apiFetch('/api/credits/account');
    if (!res.ok) throw new Error('Failed to fetch credit account');
    return res.json();
  },

  async requestEstimate(params) {
    const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
    const res = await apiFetch('/api/credits/estimate', {
      method: 'POST',
      body: params
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error?.message || 'Estimate request failed');
      err.code = data.error?.code;
      err.details = data.error?.details;
      throw err;
    }
    return data;
  },

  async fetchLedger(query = {}) {
    const params = new URLSearchParams(query);
    const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
    const res = await apiFetch(`/api/credits/ledger?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch credit ledger');
    return res.json();
  },

  async mockGrant(amountCredits = 10) {
    const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
    const res = await apiFetch('/api/credits/mock-grants', {
      method: 'POST',
      headers: {
        'Idempotency-Key': `grant_ui_${Date.now()}`
      },
      body: { amountCredits }
    });
    if (!res.ok) {
      throw new Error('Grant failed');
    }
    return res.json();
  }
};
