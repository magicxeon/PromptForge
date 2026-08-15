(() => {
  const api = (path, options) => window.ModelPromptForgeApiClient.apiJson(path, options);

  window.ModelPromptForgeAdminApi = {
    getOverview: () => api('/api/admin/overview'),
    listUsers: () => api('/api/admin/users'),
    listGenerations: () => api('/api/admin/generations?limit=12'),
    listPosts: () => api('/api/admin/community/posts?limit=24'),
    listAuditEvents: () => api('/api/admin/audit-events?limit=24'),
    getLedger: userId => api(`/api/admin/credits/${encodeURIComponent(userId)}/ledger?limit=24`),
    moderatePost: (postId, action, reason) => api(`/api/admin/community/posts/${encodeURIComponent(postId)}/moderation`, {
      method: 'POST', body: { action, reason }
    }),
    adjustCredits: (userId, deltaCredits, reason) => api(`/api/admin/credits/${encodeURIComponent(userId)}/adjustments`, {
      method: 'POST',
      body: { deltaCredits: Number(deltaCredits), reason, idempotencyKey: `admin-ui:${userId}:${Date.now()}` }
    })
  };
})();
