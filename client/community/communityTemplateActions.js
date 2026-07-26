(() => {
  const api = (url, options = {}) =>
    window.ModelPromptForgeApiClient.apiJson(url, options);

  function openSceneBuilder(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('This Community item has no reusable Scene Builder snapshot.');
    }
    window.ModelPromptForgeRouter.navigate('/studio');
    window.setTimeout(() => {
      window.ModelPromptForgeSceneReplacementChecklist?.startTemplateWorkflow?.(snapshot);
    }, 0);
  }

  async function usePostTemplate(postId) {
    const handoff = await api(
      `/api/scene-templates/shared/${encodeURIComponent(postId)}/use-template`,
      { method: 'POST', body: {} }
    );
    openSceneBuilder(handoff?.sceneTemplateSnapshot);
    return handoff;
  }

  async function useHandoff(url) {
    const handoff = await api(url, { method: 'POST', body: {} });
    openSceneBuilder(handoff?.sceneTemplateSnapshot);
    return handoff;
  }

  window.ModelPromptForgeCommunityTemplateActions = {
    usePostTemplate,
    useGalleryItem: galleryId => useHandoff(
      `/api/community/gallery/${encodeURIComponent(galleryId)}/use-template`
    ),
    useCharacter: characterId => useHandoff(
      `/api/community/characters/${encodeURIComponent(characterId)}/use-character`
    )
  };
})();
