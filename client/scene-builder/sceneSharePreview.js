/**
 * ModelPromptForge - Scene Share Preview Modal Manager
 */
(function () {
  let activeDraft = null;

  async function openSharePreview(sourceGenerationId) {
    if (!sourceGenerationId) return;

    try {
      // 1. Fetch/Create Share Draft on Server
      const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
      const res = await apiFetch('/api/scene-templates/share-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceGenerationId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create share draft');
      }

      activeDraft = await res.json();
      renderSharePreviewModal(activeDraft);

    } catch (err) {
      if (window.AppDialog) {
        window.AppDialog.alert(err.message || 'Failed to open share preview', { title: 'Error' });
      } else {
        alert(err.message);
      }
    }
  }

  function renderSharePreviewModal(draft) {
    const modal = document.getElementById('share-template-modal');
    if (!modal) return;

    // Prefill modal elements
    const previewImg = document.getElementById('share-modal-img');
    if (previewImg) previewImg.src = draft.imageUrl || draft.thumbnailUrl || '';

    const titleInput = document.getElementById('share-modal-title');
    if (titleInput) {
      titleInput.value = `Template: ${draft.sceneTemplateSnapshot.title || 'Untitled'}`;
    }

    const descInput = document.getElementById('share-modal-desc');
    if (descInput) {
      descInput.value = draft.sceneTemplateSnapshot.description || '';
    }

    // Determine if manual mode to disable/block Remix Only (High)
    const isManual = draft.sceneTemplateSnapshot.authoringMode === 'manual';
    const visibilitySelect = document.getElementById('share-modal-visibility');
    const warningText = document.getElementById('share-manual-warning');

    if (visibilitySelect) {
      visibilitySelect.value = 'full'; // Default to full
      if (isManual) {
        // Enforce full or partial only on manual templates (Remix Only blocks manual prompts)
        if (warningText) warningText.style.display = 'block';
        
        // Remove remix_only option if present
        const remixOpt = visibilitySelect.querySelector('option[value="remix_only"]');
        if (remixOpt) remixOpt.disabled = true;
      } else {
        if (warningText) warningText.style.display = 'none';
        const remixOpt = visibilitySelect.querySelector('option[value="remix_only"]');
        if (remixOpt) remixOpt.disabled = false;
      }
    }

    // Render reference slot policies
    const policiesList = document.getElementById('share-modal-policies');
    if (policiesList) {
      policiesList.innerHTML = '';
      const mappings = draft.sceneTemplateSnapshot.referenceSlotMapping || {};
      
      if (Object.keys(mappings).length === 0) {
        policiesList.innerHTML = '<li class="sub-label">No reference slots defined</li>';
      } else {
        Object.entries(mappings).forEach(([slotId, mapping]) => {
          const li = document.createElement('li');
          li.style.padding = '0.2rem 0';
          
          let policyText = 'Replace required';
          if (mapping.sharePolicy === 'shared_as_reusable_reference') policyText = 'Reusable';
          if (mapping.sharePolicy === 'shared_preview_only') policyText = 'Preview only';

          // Format slot name
          const slotName = slotId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          li.innerHTML = `<strong>${slotName}</strong>: <span style="color: var(--neon-cyan);">${policyText}</span>`;
          policiesList.appendChild(li);
        });
      }
    }

    // Render variables list
    const varsList = document.getElementById('share-modal-variables');
    if (varsList) {
      varsList.innerHTML = '';
      const vars = draft.sceneTemplateSnapshot.replaceableVariables || [];
      const nonImageVars = vars.filter(v => v.type !== 'reference_image');

      if (nonImageVars.length === 0) {
        varsList.innerHTML = '<li class="sub-label">No replaceable text parameters</li>';
      } else {
        nonImageVars.forEach(v => {
          const li = document.createElement('li');
          li.style.padding = '0.2rem 0';
          li.innerHTML = `<strong>${v.label}</strong> (Default: ${v.defaultValue || 'none'})`;
          varsList.appendChild(li);
        });
      }
    }

    // Model summary
    const modelSummary = document.getElementById('share-modal-model-summary');
    if (modelSummary) {
      const pModel = draft.sceneTemplateSnapshot.providerModelSnapshot || {};
      const providerLabel = pModel.providerDisplayName || draft.sceneTemplateSnapshot.provider || 'default';
      const modelLabel = pModel.modelDisplayName || draft.sceneTemplateSnapshot.submodel || 'default';
      modelSummary.innerText = `Provider: ${providerLabel} (${modelLabel})`;
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.classList.add('app-dialog-open');
  }

  function closeSharePreviewModal() {
    const modal = document.getElementById('share-template-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('app-dialog-open');
    }
    activeDraft = null;
  }

  async function publishTemplate() {
    if (!activeDraft) return;

    const titleInput = document.getElementById('share-modal-title');
    const descInput = document.getElementById('share-modal-desc');
    const visibilitySelect = document.getElementById('share-modal-visibility');

    const title = titleInput ? titleInput.value : '';
    const description = descInput ? descInput.value : '';
    const promptVisibility = visibilitySelect ? visibilitySelect.value : 'full';

    if (!title.trim()) {
      if (window.AppDialog) {
        window.AppDialog.alert('Title is required to share this template.', { title: 'Missing Title' });
      }
      return;
    }

    try {
      const apiFetch = window.ModelPromptForgeApiClient?.apiFetch || fetch;
      const res = await apiFetch(`/api/scene-templates/share-drafts/${activeDraft.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, promptVisibility })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish template');
      }

      // Close modal
      closeSharePreviewModal();
      if (window.closeLightbox) window.closeLightbox();

      if (window.AppDialog) {
        window.AppDialog.alert('Template successfully shared to Local Shared list!', { title: 'Shared' });
      }

      // Refresh list
      if (window.ModelPromptForgeSharedTemplatesPanel?.refreshSharedTemplates) {
        window.ModelPromptForgeSharedTemplatesPanel.refreshSharedTemplates();
      }

    } catch (err) {
      if (window.AppDialog) {
        window.AppDialog.alert(err.message || 'Failed to publish template', { title: 'Error' });
      } else {
        alert(err.message);
      }
    }
  }

  // Wire buttons in DOM once ready
  document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('btn-share-modal-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeSharePreviewModal);

    const publishBtn = document.getElementById('btn-share-modal-publish');
    if (publishBtn) publishBtn.addEventListener('click', publishTemplate);
  });

  window.ModelPromptForgeSceneSharePreview = {
    openSharePreview,
    closeSharePreviewModal
  };
})();
