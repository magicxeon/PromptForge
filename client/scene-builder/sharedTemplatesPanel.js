/**
 * ModelPromptForge - Shared Templates Panel Controller
 */
(function () {
  async function refreshSharedTemplates() {
    const listContainer = document.getElementById('shared-templates-list');
    if (!listContainer) return;

    try {
      const res = await fetch('/api/scene-templates/shared');
      if (!res.ok) throw new Error('Failed to fetch shared templates');

      const posts = await res.json();
      renderSharedTemplatesList(posts);

    } catch (err) {
      console.error('[Shared Templates] Error refreshing list:', err);
    }
  }

  function renderSharedTemplatesList(posts) {
    const listContainer = document.getElementById('shared-templates-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (!posts || posts.length === 0) {
      listContainer.innerHTML = '<p class="sub-label" id="no-shared-placeholder" style="grid-column: 1 / -1; text-align: center; margin: 1rem 0;">No shared templates yet</p>';
      return;
    }

    posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'shared-template-card';
      card.style.position = 'relative';
      card.style.cursor = 'pointer';
      card.style.borderRadius = '4px';
      card.style.overflow = 'hidden';
      card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      card.style.background = 'rgba(255, 255, 255, 0.02)';
      card.style.transition = 'all 0.2s ease';
      card.title = `${post.title}\nCreator: ${post.ownerUsername}`;

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--neon-cyan)';
        card.style.boxShadow = '0 0 5px rgba(0, 243, 255, 0.3)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        card.style.boxShadow = 'none';
      });

      const img = document.createElement('img');
      img.src = post.thumbnailUrl || post.imageUrl || '';
      img.style.width = '100%';
      img.style.height = '70px';
      img.style.objectFit = 'cover';
      img.style.display = 'block';

      const titleLabel = document.createElement('div');
      titleLabel.innerText = post.title;
      titleLabel.style.fontSize = '0.62rem';
      titleLabel.style.padding = '0.2rem';
      titleLabel.style.whiteSpace = 'nowrap';
      titleLabel.style.overflow = 'hidden';
      titleLabel.style.textOverflow = 'ellipsis';
      titleLabel.style.color = '#ccc';

      card.appendChild(img);
      card.appendChild(titleLabel);

      card.addEventListener('click', () => loadSharedTemplate(post.id));
      listContainer.appendChild(card);
    });
  }

  async function loadSharedTemplate(postId) {
    if (!window.AppDialog) return;

    const confirm = await window.AppDialog.confirm(
      'Do you want to load this template into the Scene Builder replacement panel?',
      { title: 'Load Template' }
    );
    if (!confirm) return;

    try {
      const username = window.state?.username || 'user_demo';
      const res = await fetch(`/api/scene-templates/shared/${postId}/use-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load template payload');
      }

      const payload = await res.json();

      // Track active remix context globally on client for generation success logging
      window.activeRemixContext = {
        templateId: payload.sceneTemplateSnapshot.id || payload.postId,
        sourcePostId: payload.postId
      };

      // Load template into replacement checklist flow
      if (window.ModelPromptForgeSceneBuilder?.startTemplateWorkflow) {
        window.ModelPromptForgeSceneBuilder.startTemplateWorkflow(payload.sceneTemplateSnapshot);
      }

    } catch (err) {
      window.AppDialog.alert(err.message || 'Failed to load template', { title: 'Error' });
    }
  }

  function init() {
    const refreshBtn = document.getElementById('btn-refresh-shared');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', refreshSharedTemplates);
    }
    refreshSharedTemplates();
  }

  window.ModelPromptForgeSharedTemplatesPanel = {
    init,
    refreshSharedTemplates,
    loadSharedTemplate
  };
})();
