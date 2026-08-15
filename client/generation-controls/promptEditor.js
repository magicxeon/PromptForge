/* Shared prompt editor for manual-generation surfaces. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function createPromptEditor({ mount, value = {}, onChange } = {}) {
    if (!mount) throw new Error('PromptEditor requires a mount element.');
    const current = { prompt: value.prompt || '', negativePrompt: value.negativePrompt || '' };
    mount.innerHTML = `
      <section class="playground-editor-field is-primary">
        <div class="playground-editor-heading"><div><label for="playground-primary-prompt">${translate('playground.prompt.label', 'Prompt')}</label><small>${translate('playground.prompt.description', 'Describe the subject, setting, lighting and result you want.')}</small></div></div>
        <textarea id="playground-primary-prompt" data-prompt-editor maxlength="4000" rows="10" placeholder="${translate('playground.prompt.placeholder', 'Describe the image you want to create...')}"></textarea>
        <div class="playground-editor-footer"><span data-prompt-counter></span><button type="button" data-copy-prompt>${translate('playground.prompt.copy', 'Copy')}</button></div>
      </section>
      <section class="playground-editor-field is-negative">
        <div class="playground-editor-heading"><div><label for="playground-negative-prompt">${translate('playground.negative.label', 'Avoid (optional)')}</label><small>${translate('playground.negative.description', 'Describe elements that should not appear in the image.')}</small></div></div>
        <textarea id="playground-negative-prompt" data-negative-editor maxlength="1000" rows="3" placeholder="${translate('playground.negative.placeholder', 'Elements to avoid in the image...')}"></textarea>
        <div class="playground-editor-footer"><span data-negative-counter></span><button type="button" data-copy-negative>${translate('playground.prompt.copy', 'Copy')}</button></div>
      </section>`;
    const prompt = mount.querySelector('[data-prompt-editor]'); const negative = mount.querySelector('[data-negative-editor]');
    const promptCounter = mount.querySelector('[data-prompt-counter]');
    const negativeCounter = mount.querySelector('[data-negative-counter]');
    prompt.value = current.prompt; negative.value = current.negativePrompt;
    const publish = () => onChange?.({ ...current });
    const updateCounters = () => {
      promptCounter.textContent = `${prompt.value.length} / 4000`;
      negativeCounter.textContent = `${negative.value.length} / 1000`;
    };
    const copy = async (text, button) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = translate('playground.prompt.copied', 'Copied');
        window.setTimeout(() => { button.textContent = original; }, 1200);
      } catch {
        window.AppDialog?.alert?.(text, { title: translate('playground.prompt.copyTitle', 'Prompt text') });
      }
    };
    prompt.addEventListener('input', () => { current.prompt = prompt.value; updateCounters(); publish(); });
    negative.addEventListener('input', () => { current.negativePrompt = negative.value; updateCounters(); publish(); });
    mount.querySelector('[data-copy-prompt]').addEventListener('click', event => copy(prompt.value, event.currentTarget));
    mount.querySelector('[data-copy-negative]').addEventListener('click', event => copy(negative.value, event.currentTarget));
    updateCounters();
    return { getValue: () => ({ ...current }), focus: () => prompt.focus() };
  }
  namespace.createPromptEditor = createPromptEditor;
  window.ModelPromptForgeGenerationControls = namespace;
})();
