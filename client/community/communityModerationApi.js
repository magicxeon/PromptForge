(() => {
  const apiJson = (url, options = {}) =>
    window.ModelPromptForgeApiClient.apiJson(url, options);

  const reportPost = (postId, input) =>
    apiJson(`/api/community/posts/${encodeURIComponent(postId)}/reports`, {
      method: 'POST',
      body: input
    });

  window.ModelPromptForgeCommunityModerationApi = {
    reportPost
  };
})();
