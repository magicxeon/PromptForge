/* Shared prompt editor for manual-generation surfaces. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function createPromptEditor({ mount, value = {}, onChange } = {}) {
    if (!mount) throw new Error('PromptEditor requires a mount element.');
    const current = { prompt: value.prompt || '', negativePrompt: value.negativePrompt || '' };
    mount.innerHTML = `<label class="playground-editor-field"><span>${translate('playground.prompt.label', 'Prompt')}</span><textarea data-prompt-editor rows="10" placeholder="${translate('playground.prompt.placeholder', 'Describe the image you want to create...')}"></textarea></label><label class="playground-editor-field"><span>${translate('playground.negative.label', 'Avoid (optional)')}</span><textarea data-negative-editor rows="3" placeholder="${translate('playground.negative.placeholder', 'Elements to avoid in the image...')}"></textarea></label>`;
    const prompt = mount.querySelector('[data-prompt-editor]'); const negative = mount.querySelector('[data-negative-editor]');
    prompt.value = current.prompt; negative.value = current.negativePrompt;
    const publish = () => onChange?.({ ...current });
    prompt.addEventListener('input', () => { current.prompt = prompt.value; publish(); });
    negative.addEventListener('input', () => { current.negativePrompt = negative.value; publish(); });
    return { getValue: () => ({ ...current }), focus: () => prompt.focus() };
  }
  namespace.createPromptEditor = createPromptEditor;
  window.ModelPromptForgeGenerationControls = namespace;
})();
