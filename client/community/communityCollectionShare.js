(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function initialize() {
    const button = document.getElementById('btn-share-community-collection');
    if (!button || button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', publishSelectedCollection);
    window.addEventListener('modelpromptforge:communityfeatureschange', update);
    window.addEventListener('modelpromptforge:actorchange', update);
    window.addEventListener('modelpromptforge:languagechange', update);
    update();
  }

  function update() {
    const button = document.getElementById('btn-share-community-collection');
    if (!button) return;
    const collection = selectedCollection();
    const sharingEnabled = window.ModelPromptForgeCommunityFeatures?.isEnabled?.(
      'community.shareEnabled'
    ) === true;
    button.textContent = t('community.collection.share', 'Share');
    button.hidden = !sharingEnabled || !collection;
    button.disabled = !collection || Number(collection.imageCount) < 1;
    button.title = collection && Number(collection.imageCount) < 1
      ? t('community.collection.empty', 'Add at least one image before sharing.')
      : t('community.collection.share', 'Share Collection');
  }

  async function publishSelectedCollection() {
    const button = document.getElementById('btn-share-community-collection');
    const collection = selectedCollection();
    if (!collection?.id || Number(collection.imageCount) < 1) return;

    const title = await window.AppDialog.prompt(
      t('community.collection.titlePrompt', 'Name this public Collection.'),
      {
        title: t('community.collection.share', 'Share Collection'),
        inputLabel: t('community.share.title', 'Post title'),
        value: collection.name || 'Image Collection',
        required: true,
        confirmLabel: t('community.share.publish', 'Publish')
      }
    );
    if (!title) return;

    button.disabled = true;
    try {
      const post = await window.ModelPromptForgeApiClient.apiJson(
        `/api/community/collections/${encodeURIComponent(collection.id)}/publish`,
        {
          method: 'POST',
          body: {
            title,
            description: collection.description || ''
          }
        }
      );
      window.ModelPromptForgeRouter.navigate(`/community/${encodeURIComponent(post.id)}`);
    } catch (error) {
      await window.AppDialog.alert(
        error.message || t(
          'community.collection.shareFailed',
          'The Collection could not be shared.'
        ),
        { title: t('community.share.errorTitle', 'Share failed') }
      );
    } finally {
      button.disabled = false;
      update();
    }
  }

  function selectedCollection() {
    const id = window.state?.selectedCollectionId;
    return id && id !== 'all' ? window.getCollectionById?.(id) : null;
  }

  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCommunityCollectionShare = {
    initialize,
    update,
    publishSelectedCollection
  };
})();
