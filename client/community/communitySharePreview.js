/**
 * Reusable Community share preview for generated images.
 */
(function () {
  let activeDraft = null;
  let returnFocus = null;
  let eventsBound = false;

  const translate = (key, fallback, variables = {}) =>
    window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback }) || fallback;

  async function openSharePreview(sourceGenerationId, { triggerElement = null } = {}) {
    if (!sourceGenerationId) return;
    await window.ModelPromptForgeCommunityFeatures?.initialize?.();
    if (window.ModelPromptForgeCommunityFeatures?.isEnabled?.('community.shareEnabled') !== true) {
      return;
    }
    returnFocus = triggerElement || document.activeElement;

    try {
      await window.ModelPromptForgeI18n?.loadNamespaces?.(['community']);
      window.ModelPromptForgeI18n?.translateDom?.(
        document.getElementById('share-template-modal')
      );
      activeDraft = await window.ModelPromptForgeCommunityShareApi.createDraft(sourceGenerationId);
      await render(activeDraft);
      setOpen(true);
    } catch (error) {
      showError(error);
    }
  }

  async function render(draft) {
    const image = document.getElementById('share-modal-img');
    if (image) image.src = draft.thumbnailUrl || draft.imageUrl || '';

    const title = document.getElementById('share-modal-title');
    if (title) {
      title.value = draft.title || translate('community.share.defaultTitle', 'Generated image');
    }

    const description = document.getElementById('share-modal-desc');
    if (description) description.value = draft.description || '';

    const promptVisibility = document.getElementById('share-modal-visibility');
    const remixOption = promptVisibility?.querySelector('option[value="remix_only"]');
    const canRemix = draft.sourceType === 'scene_template'
      && draft.sharedPromptSnapshot?.authoringMode !== 'manual';
    if (remixOption) remixOption.disabled = !canRemix;
    if (promptVisibility) promptVisibility.value = draft.promptVisibility || 'full';

    const warning = document.getElementById('share-manual-warning');
    if (warning) warning.hidden = canRemix;

    const postVisibility = document.getElementById('share-modal-post-visibility');
    if (postVisibility) postVisibility.value = draft.visibility || 'public';

    renderTemplateDetails(draft);
    renderProviderModel(draft);

    await window.ModelPromptForgeCommunityTaxonomyPicker?.initialize?.({
      mountElement: document.getElementById('share-modal-taxonomy-picker'),
      suggestion: draft.taxonomySuggestion || {}
    });
  }

  function renderTemplateDetails(draft) {
    const templateDetails = document.getElementById('share-modal-template-details');
    const snapshot = draft.sceneTemplateSnapshot;
    if (templateDetails) templateDetails.hidden = !snapshot;
    if (!snapshot) return;

    const policies = document.getElementById('share-modal-policies');
    if (policies) {
      policies.replaceChildren();
      const mappings = Object.entries(snapshot.referenceSlotMapping || {});
      if (!mappings.length) {
        policies.appendChild(listItem(translate('community.share.noReferences', 'No reference slots defined')));
      } else {
        mappings.forEach(([slotId, mapping]) => {
          const policyKey = mapping.sharePolicy || mapping.policy || 'required_user_replacement';
          const policy = translate(
            `community.share.referencePolicy.${policyKey}`,
            policyKey.replaceAll('_', ' ')
          );
          policies.appendChild(listItem(`${formatLabel(slotId)}: ${policy}`));
        });
      }
    }

    const variables = document.getElementById('share-modal-variables');
    if (variables) {
      variables.replaceChildren();
      const values = (snapshot.replaceableVariables || []).filter(item => item?.type !== 'reference_image');
      if (!values.length) {
        variables.appendChild(listItem(translate('community.share.noVariables', 'No replaceable parameters')));
      } else {
        values.forEach(variable => {
          const label = String(variable.label || variable.id || '').trim();
          variables.appendChild(listItem(label));
        });
      }
    }
  }

  function renderProviderModel(draft) {
    const summary = document.getElementById('share-modal-model-summary');
    if (!summary) return;
    const providerModel = draft.providerModelSnapshot || {};
    const provider = providerModel.providerDisplayName || providerModel.providerId;
    const model = providerModel.modelDisplayName || providerModel.modelId || providerModel.resolvedModelId;
    summary.textContent = [provider, model].filter(Boolean).join(' / ')
      || translate('community.share.modelUnavailable', 'Model information unavailable');
  }

  async function publish() {
    if (!activeDraft) return;
    const publishButton = document.getElementById('btn-share-modal-publish');
    const input = {
      title: document.getElementById('share-modal-title')?.value || '',
      description: document.getElementById('share-modal-desc')?.value || '',
      promptVisibility: document.getElementById('share-modal-visibility')?.value || 'full',
      visibility: document.getElementById('share-modal-post-visibility')?.value || 'public',
      ...(window.ModelPromptForgeCommunityTaxonomyPicker?.getSelection?.() || {
        officialTags: [],
        customTags: []
      })
    };

    if (!input.title.trim()) {
      return showDialog(
        translate('community.share.titleRequired', 'Enter a title before publishing.'),
        translate('community.share.missingTitle', 'Missing title')
      );
    }

    try {
      if (publishButton) publishButton.disabled = true;
      const post = await window.ModelPromptForgeCommunityShareApi.publishDraft(activeDraft.id, input);
      close();
      window.closeLightbox?.();
      window.dispatchEvent(new CustomEvent('modelpromptforge:community-post-published', {
        detail: { post }
      }));
      window.ModelPromptForgeSharedTemplatesPanel?.refreshSharedTemplates?.();
      await showDialog(
        translate('community.post.publishSuccess', 'Image published successfully to Community!'),
        translate('community.share.published', 'Published')
      );
    } catch (error) {
      showError(error);
    } finally {
      if (publishButton) publishButton.disabled = false;
    }
  }

  function close() {
    setOpen(false);
    activeDraft = null;
    const focusTarget = returnFocus;
    returnFocus = null;
    focusTarget?.focus?.({ preventScroll: true });
  }

  function setOpen(open) {
    const modal = document.getElementById('share-template-modal');
    if (!modal) return;
    modal.style.display = open ? 'flex' : 'none';
    document.body.classList.toggle('app-dialog-open', open);
    if (open) requestAnimationFrame(() => document.getElementById('share-modal-title')?.focus());
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    document.getElementById('btn-share-modal-cancel')?.addEventListener('click', close);
    document.getElementById('btn-share-modal-publish')?.addEventListener('click', publish);
    document.getElementById('share-template-modal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) close();
    });
  }

  function showError(error) {
    const fallback = error?.message || translate('community.share.failed', 'This image could not be shared.');
    showDialog(fallback, translate('community.share.errorTitle', 'Share failed'));
  }

  function showDialog(message, title) {
    if (window.AppDialog) return window.AppDialog.alert(message, { title });
    window.alert(message);
    return Promise.resolve();
  }

  function listItem(text) {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }

  function formatLabel(value) {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  document.addEventListener('DOMContentLoaded', bindEvents);

  window.ModelPromptForgeCommunitySharePreview = {
    openSharePreview,
    closeSharePreview: close
  };
  window.ModelPromptForgeSceneSharePreview = window.ModelPromptForgeCommunitySharePreview;
})();
