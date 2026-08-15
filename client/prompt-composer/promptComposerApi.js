(() => {
  async function composeIdea({ freeTextIdea, generationMode = 'playground', language = 'auto' }) {
    const result = await window.ModelPromptForgeApiClient.apiJson('/api/prompt-composer/proposals', {
      method: 'POST',
      body: { freeTextIdea, generationMode, language }
    });
    return result.proposal;
  }

  window.ModelPromptForgePromptComposerApi = { composeIdea };
})();
