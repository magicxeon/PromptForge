(() => {
  const namespace = window.ModelPromptForgeComparisons ||= {};
  const DEFAULT_VIEW = Object.freeze({ zoom: 1, x: 0, y: 0 });

  function createWorkspace({
    mount,
    viewModel,
    options = {},
    permissions = {},
    actions = {}
  } = {}) {
    if (!mount) throw new TypeError('Comparison workspace mount is required.');
    let model = viewModel || { results: [] };
    let resolvedPermissions = { ...(model.permissions || {}), ...permissions };
    let resolvedActions = actions;
    let sharedView = { ...DEFAULT_VIEW };
    const slotViews = new Map();
    let synced = true;
    let drag = null;
    let zoomLabel = null;

    const root = document.createElement('section');
    root.className = `shared-comparison-workspace is-${options.context || model.context || 'private'}`;

    const toolbar = buildToolbar();
    const grid = document.createElement('div');
    grid.className = 'comparison-result-grid shared-comparison-result-grid';
    grid.setAttribute('aria-live', 'polite');
    if (options.showToolbar !== false) root.appendChild(toolbar);
    root.appendChild(grid);
    const promptRegion = document.createElement('section');
    promptRegion.className = 'comparison-workspace-prompt';
    root.appendChild(promptRegion);
    mount.replaceChildren(root);
    render();

    function buildToolbar() {
      const region = document.createElement('div');
      region.className = 'comparison-workspace-toolbar shared-comparison-toolbar';
      region.setAttribute('role', 'toolbar');
      region.setAttribute('aria-label', translate('comparisons.viewer.controls', 'Comparison viewport controls'));

      const syncLabel = document.createElement('label');
      syncLabel.className = 'comparison-sync-toggle';
      const sync = document.createElement('input');
      sync.type = 'checkbox';
      sync.checked = true;
      sync.addEventListener('change', () => {
        synced = sync.checked;
        applyTransforms();
      });
      syncLabel.append(sync, document.createTextNode(` ${translate('comparisons.viewer.sync', 'Sync view')}`));
      region.appendChild(syncLabel);
      [
        ['zoom-out', '-'],
        ['zoom-in', '+'],
        ['fit', translate('comparisons.viewer.fit', 'Fit')],
        ['actual', '100%'],
        ['reset', translate('comparisons.viewer.reset', 'Reset')],
        ['fullscreen', translate('comparisons.viewer.fullscreen', 'Fullscreen')]
      ].forEach(([commandName, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'comparison-tool-button';
        button.textContent = label;
        button.addEventListener('click', () => command(commandName));
        region.appendChild(button);
        if (commandName === 'zoom-out') {
          zoomLabel = document.createElement('span');
          zoomLabel.className = 'comparison-zoom-label';
          zoomLabel.textContent = 'Fit';
          region.appendChild(zoomLabel);
        }
      });
      return region;
    }

    function render() {
      grid.replaceChildren();
      const results = Array.isArray(model.results) ? model.results : [];
      grid.dataset.slots = Math.min(4, Math.max(1, results.length));
      results.forEach(result => grid.appendChild(createResultCard(result)));
      renderPrompt();
      applyTransforms();
    }

    function renderPrompt() {
      promptRegion.replaceChildren();
      promptRegion.hidden = options.showPrompt === false;
      if (promptRegion.hidden) return;
      const heading = document.createElement('h3');
      heading.textContent = translate('community.detail.prompt', 'Prompt');
      const prompt = document.createElement('textarea');
      prompt.className = 'comparison-prompt-textarea';
      prompt.readOnly = true;
      prompt.rows = 8;
      prompt.setAttribute('aria-label', heading.textContent);
      prompt.value = model.promptDisclosure?.visible && model.promptDisclosure?.text
        ? model.promptDisclosure.text
        : translate('community.detail.promptHidden', 'Prompt text is hidden by the creator.');
      promptRegion.append(heading, prompt);
    }

    function createResultCard(result) {
      const card = document.createElement('article');
      card.className = 'comparison-result-card';
      card.dataset.slotId = result.slotId;
      card.classList.toggle('winner', result.isOwnerWinner === true);
      card.classList.toggle('community-vote-leader', result.isVoteLeader === true);
      card.classList.toggle('community-vote-selected', result.isActorVote === true);

      const header = document.createElement('header');
      header.className = 'comparison-result-header';
      const identity = document.createElement('div');
      const provider = document.createElement('span');
      provider.textContent = result.providerLabel || '';
      const modelName = document.createElement('strong');
      modelName.textContent = result.modelLabel || translate('comparisons.viewer.model', 'Model');
      identity.append(provider, modelName);
      const status = document.createElement('span');
      status.className = `comparison-status-pill status-${result.status || 'completed'}`;
      status.textContent = statusLabel(result.status);
      header.append(identity, status);

      const viewport = document.createElement('div');
      viewport.className = 'comparison-image-viewport';
      viewport.tabIndex = 0;
      viewport.setAttribute('aria-label', `${result.modelLabel || 'Model'} comparison image`);
      if (result.imageUrl) {
        const image = document.createElement('img');
        image.src = result.imageUrl;
        image.alt = result.modelLabel || 'Comparison result';
        image.draggable = false;
        viewport.appendChild(image);
        bindViewport(viewport, result, image);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = `comparison-slot-placeholder${result.status === 'failed' ? ' failed' : ''}`;
        placeholder.textContent = result.error?.message || statusLabel(result.status);
        viewport.appendChild(placeholder);
      }

      const footer = document.createElement('footer');
      footer.className = 'comparison-result-footer';
      const metadata = document.createElement('span');
      metadata.textContent = result.generationDuration
        ? `${result.generationDuration}s`
        : result.credit ? `${result.credit} credits` : '';
      const actionRegion = document.createElement('div');
      actionRegion.className = 'comparison-result-actions';
      appendActions(actionRegion, result);
      footer.append(metadata, actionRegion);

      if (model.context === 'community') {
        const voteSummary = document.createElement('div');
        voteSummary.className = 'comparison-community-vote-summary';
        const count = document.createElement('strong');
        count.textContent = translate(
          'community.comparison.voteCount',
          '{count} votes',
          { count: result.voteCount || 0 }
        );
        voteSummary.appendChild(count);
        if (result.isVoteLeader) {
          const leader = document.createElement('span');
          const tied = (model.communityVoteSummary?.leaderSlotIds?.length || 0) > 1;
          leader.textContent = tied
            ? translate('community.comparison.jointLeader', 'Joint leader')
            : translate('community.comparison.leader', 'Community leader');
          voteSummary.appendChild(leader);
        }
        footer.appendChild(voteSummary);
      }
      card.append(header, viewport, footer);
      return card;
    }

    function appendActions(region, result) {
      if (result.imageUrl && resolvedActions.onOpenResult) {
        region.appendChild(actionButton(
          translate('comparisons.viewer.detail', 'Detail'),
          () => resolvedActions.onOpenResult(result, region)
        ));
      }
      if (resolvedPermissions.canSelectPrivateWinner && resolvedActions.onSelectPrivateWinner) {
        region.appendChild(actionButton(
          result.isOwnerWinner
            ? translate('comparisons.viewer.clearWinner', 'Clear winner')
            : translate('comparisons.viewer.winner', 'Winner'),
          () => resolvedActions.onSelectPrivateWinner(result)
        ));
      }
      if (resolvedPermissions.canUseReference && resolvedActions.onUseReference) {
        [
          ['face', translate('comparisons.viewer.faceRef', 'Face Ref')],
          ['style', translate('comparisons.viewer.styleRef', 'Style Ref')],
          ['character', translate('comparisons.viewer.characterRef', 'Character Ref')]
        ].forEach(([type, label]) => region.appendChild(actionButton(
          label,
          () => resolvedActions.onUseReference(type, result)
        )));
      }
      if (resolvedPermissions.canAddToCollection && resolvedActions.onAddToCollection) {
        region.appendChild(actionButton(
          translate('comparisons.viewer.collection', 'Collection'),
          () => resolvedActions.onAddToCollection(result)
        ));
      }
      if (resolvedPermissions.canDownload && result.imageUrl) {
        const download = document.createElement('a');
        download.href = result.imageUrl;
        download.download = `${result.jobId || result.slotId}.png`;
        download.textContent = translate('comparisons.viewer.download', 'Download');
        region.appendChild(download);
      }
      if (model.context === 'community' && resolvedPermissions.canVote && resolvedActions.onVote) {
        const vote = actionButton(
          result.isActorVote
            ? translate('community.comparison.voted', 'Your vote')
            : translate('community.comparison.vote', 'Vote for this result'),
          () => resolvedActions.onVote(result)
        );
        vote.classList.toggle('active', result.isActorVote === true);
        vote.dataset.voteSlotId = result.slotId;
        region.appendChild(vote);
      }
    }

    function bindViewport(viewport, result, image) {
      let didDrag = false;
      viewport.addEventListener('wheel', event => {
        event.preventDefault();
        updateView(result.slotId, view => ({
          ...view,
          zoom: clamp(view.zoom * (event.deltaY < 0 ? 1.12 : 0.89), 1, 6)
        }));
      }, { passive: false });
      viewport.addEventListener('pointerdown', event => {
        viewport.setPointerCapture(event.pointerId);
        didDrag = false;
        drag = { slotId: result.slotId, x: event.clientX, y: event.clientY };
        viewport.classList.add('dragging');
      });
      viewport.addEventListener('pointermove', event => {
        if (!drag || drag.slotId !== result.slotId) return;
        const rect = viewport.getBoundingClientRect();
        const dx = (event.clientX - drag.x) / Math.max(1, rect.width);
        const dy = (event.clientY - drag.y) / Math.max(1, rect.height);
        if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) didDrag = true;
        drag.x = event.clientX;
        drag.y = event.clientY;
        updateView(result.slotId, view => ({
          ...view,
          x: clamp(view.x + dx, -1, 1),
          y: clamp(view.y + dy, -1, 1)
        }));
      });
      const finish = open => {
        drag = null;
        viewport.classList.remove('dragging');
        if (open && !didDrag) resolvedActions.onOpenResult?.(result, viewport);
      };
      viewport.addEventListener('pointerup', () => finish(true));
      viewport.addEventListener('pointercancel', () => finish(false));
      viewport.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        resolvedActions.onOpenResult?.(result, viewport);
      });
      image.addEventListener('load', applyTransforms);
    }

    function updateView(slotId, updater) {
      if (synced) sharedView = updater(sharedView);
      else slotViews.set(slotId, updater(slotViews.get(slotId) || { ...sharedView }));
      requestAnimationFrame(applyTransforms);
    }

    function applyTransforms() {
      root.querySelectorAll('.comparison-result-card').forEach(card => {
        const image = card.querySelector('.comparison-image-viewport img');
        if (!image) return;
        const view = synced
          ? sharedView
          : slotViews.get(card.dataset.slotId) || sharedView;
        image.style.transform = `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.zoom})`;
      });
      const value = sharedView.zoom === 1 ? 'Fit' : `${Math.round(sharedView.zoom * 100)}%`;
      if (zoomLabel) zoomLabel.textContent = value;
      const externalLabel = document.getElementById('comparison-zoom-label');
      if (options.showToolbar === false && externalLabel) externalLabel.textContent = value;
    }

    function command(name) {
      if (name === 'fullscreen') {
        if (!document.fullscreenElement) root.requestFullscreen?.();
        else document.exitFullscreen?.();
        return;
      }
      if (name === 'zoom-in') sharedView.zoom = clamp(sharedView.zoom * 1.2, 1, 6);
      if (name === 'zoom-out') sharedView.zoom = clamp(sharedView.zoom / 1.2, 1, 6);
      if (name === 'actual') sharedView = { zoom: 2, x: 0, y: 0 };
      if (name === 'fit' || name === 'reset') {
        sharedView = { ...DEFAULT_VIEW };
        if (name === 'reset') slotViews.clear();
      }
      requestAnimationFrame(applyTransforms);
    }

    return {
      update(nextViewModel, nextPermissions = {}, nextActions = null) {
        model = nextViewModel || model;
        resolvedPermissions = { ...(model.permissions || {}), ...nextPermissions };
        if (nextActions) resolvedActions = nextActions;
        render();
      },
      command,
      setSynced(value) {
        synced = value !== false;
        toolbar.querySelector('input[type="checkbox"]').checked = synced;
        applyTransforms();
      },
      focus() {
        root.querySelector('.comparison-image-viewport')?.focus();
      },
      destroy() {
        root.remove();
      }
    };
  }

  function actionButton(label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function statusLabel(status = 'completed') {
    return String(status || 'completed').replaceAll('_', ' ');
  }

  function translate(key, fallback, variables = {}) {
    return window.ModelPromptForgeI18n?.t?.(key, variables, { defaultValue: fallback })
      || fallback.replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? `{${name}}`);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  namespace.createWorkspace = createWorkspace;
})();
