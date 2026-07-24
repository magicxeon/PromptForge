/* Playground page shell. Feature controls are composed by playgroundController. */
(() => {
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function render() {
    const page = document.getElementById('playground-page');
    if (!page) return;
    page.dataset.rendered = 'true';
    page.innerHTML = `<section class="playground-hero"><div><span class="playground-kicker">PLAYGROUND</span><h2>${translate('playground.title', 'Freeform image generation')}</h2><p>${translate('playground.description', 'Write the prompt yourself, add references, choose a model and render through the same protected generation pipeline.')}</p></div><button type="button" class="btn-neon-outline" data-route="/studio">${translate('playground.action.openStudio', 'Open Guided Studio')}</button></section><section class="playground-layout"><div class="playground-main-column"><section class="playground-panel"><h3>${translate('playground.section.prompt', 'Prompt')}</h3><div id="playground-prompt-editor"></div></section><section class="playground-panel"><h3>${translate('playground.section.references', 'References')}</h3><div id="playground-reference-slots"></div></section></div><aside class="playground-side-column"><section class="playground-panel"><div id="playground-engine-target-panel"></div></section><section class="playground-panel"><div id="playground-generation-actions"></div></section></aside></section>`;
  }
  window.ModelPromptForgePlaygroundPage = { render };
})();
