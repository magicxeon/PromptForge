(() => {
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function createPromptComposerPanel({ mount, onUsePrompt, onApplySelections }) {
    if (!mount) return null;
    let disposed = false;
    mount.replaceChildren();

    const panel = document.createElement('section');
    panel.className = 'prompt-composer-panel';
    panel.append(Object.assign(document.createElement('p'), { className: 'prompt-composer-kicker', textContent: translate('promptComposer.kicker', 'PROMPT COMPOSER') }));
    panel.append(Object.assign(document.createElement('h3'), { textContent: translate('promptComposer.title', 'Start with an idea') }));
    panel.append(Object.assign(document.createElement('p'), { className: 'prompt-composer-description', textContent: translate('promptComposer.description', 'Describe what you want. We suggest only options that already exist in Studio.') }));

    const input = document.createElement('textarea');
    input.className = 'prompt-composer-input';
    input.rows = 4;
    input.maxLength = 2000;
    input.placeholder = translate('promptComposer.placeholder', 'Example: a fashion model in a cafe wearing a dress, commercial portrait');
    input.setAttribute('aria-label', translate('promptComposer.inputLabel', 'Describe your image idea'));
    panel.append(input);

    const controls = document.createElement('div');
    controls.className = 'prompt-composer-controls';
    const status = document.createElement('span');
    status.className = 'prompt-composer-status';
    status.setAttribute('aria-live', 'polite');
    controls.append(status);
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'playground-action-button is-primary is-compact';
    submit.textContent = translate('promptComposer.action.compose', 'Create proposal');
    controls.append(submit);
    panel.append(controls);

    const reviewMount = document.createElement('div');
    reviewMount.className = 'prompt-composer-review-mount';
    panel.append(reviewMount);
    mount.append(panel);

    async function compose() {
      const freeTextIdea = input.value.trim();
      if (freeTextIdea.length < 3) {
        status.textContent = translate('promptComposer.error.short', 'Write a little more detail before creating a proposal.');
        return;
      }
      submit.disabled = true;
      status.textContent = translate('promptComposer.status.composing', 'Preparing proposal...');
      try {
        const proposal = await window.ModelPromptForgePromptComposerApi.composeIdea({
          freeTextIdea,
          generationMode: 'playground',
          language: window.ModelPromptForgeI18n?.getLocale?.() || 'auto'
        });
        if (disposed) return;
        status.textContent = '';
        window.ModelPromptForgeStructuredProposalReview.render({ mount: reviewMount, proposal, onUsePrompt, onApplySelections });
      } catch (error) {
        if (!disposed) status.textContent = error.message || translate('promptComposer.error.unavailable', 'Prompt Composer is unavailable.');
      } finally {
        if (!disposed) submit.disabled = false;
      }
    }

    submit.addEventListener('click', compose);
    input.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') compose();
    });
    return { destroy: () => { disposed = true; } };
  }

  window.ModelPromptForgePromptComposer = { createPromptComposerPanel };
})();
