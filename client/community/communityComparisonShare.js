(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function initialize() {
    const button = document.getElementById('btn-share-community-comparison');
    if (!button || button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.textContent = t('community.comparison.share', 'Share comparison');
    button.addEventListener('click', publishActiveComparison);
    update();
    window.addEventListener('modelpromptforge:comparison-opened', update);
    window.addEventListener('modelpromptforge:communityfeatureschange', update);
    window.addEventListener('modelpromptforge:languagechange', () => {
      button.textContent = t('community.comparison.share', 'Share comparison');
    });
  }

  function update() {
    const button = document.getElementById('btn-share-community-comparison');
    const set = window.ModelPromptForgeComparison?.getActiveSet?.();
    const completed = set?.runs?.[0]?.slots?.filter(slot => slot.status === 'completed').length || 0;
    if (button) {
      button.hidden = window.ModelPromptForgeCommunityFeatures?.isEnabled?.(
        'community.shareEnabled'
      ) !== true || completed < 2;
    }
  }

  async function publishActiveComparison() {
    const button = document.getElementById('btn-share-community-comparison');
    const set = window.ModelPromptForgeComparison?.getActiveSet?.();
    if (!set?.id) return;
    const title = await window.AppDialog.prompt(
      t('community.comparison.titlePrompt', 'Name this public comparison.'),
      {
        title: t('community.comparison.share', 'Share comparison'),
        inputLabel: t('community.share.title', 'Post title'),
        value: set.name || 'AI model comparison',
        required: true,
        confirmLabel: t('community.share.publish', 'Publish')
      }
    );
    if (!title) return;
    button.disabled = true;
    try {
      const post = await window.ModelPromptForgeApiClient.apiJson(
        `/api/community/comparisons/${encodeURIComponent(set.id)}/publish`,
        { method: 'POST', body: { title, promptVisibility: 'partial' } }
      );
      window.ModelPromptForgeRouter.navigate(`/community/${encodeURIComponent(post.id)}`);
    } catch (error) {
      await window.AppDialog.alert(error.message || t(
        'community.comparison.shareFailed',
        'The comparison could not be shared.'
      ), { title: t('community.share.errorTitle', 'Share failed') });
    } finally {
      button.disabled = false;
    }
  }

  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCommunityComparisonShare = { initialize, update };
})();
