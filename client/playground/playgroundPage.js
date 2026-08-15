/* Playground page shell. Feature controls are composed by playgroundController. */
(() => {
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function render() {
    const page = document.getElementById('playground-page');
    if (!page) return;
    page.dataset.rendered = 'true';
    page.innerHTML = `
      <header class="playground-workspace-header">
        <div><span class="playground-kicker">PLAYGROUND</span><h2>${translate('playground.title', 'Freeform image generation')}</h2><p>${translate('playground.description', 'Write the prompt yourself, add references, choose a model and render through the same protected generation pipeline.')}</p></div>
        <button type="button" class="playground-action-button is-secondary" data-route="/studio">${translate('playground.action.openStudio', 'Open Guided Studio')}</button>
      </header>
      <section class="playground-layout">
        <div class="playground-main-column">
          <section class="playground-panel playground-prompt-panel"><div id="playground-prompt-editor"></div></section>
          <div id="playground-prompt-composer"></div>
          <section class="playground-panel playground-reference-panel"><div id="playground-reference-slots"></div></section>
        </div>
        <aside class="playground-side-column">
          <section id="playground-generation-result" class="playground-generation-result" aria-label="${translate('playground.result.title', 'Render result')}"></section>
          <section class="playground-panel playground-engine-panel"><div id="playground-engine-target-panel"></div></section>
          <section class="playground-panel playground-action-panel"><div id="playground-generation-actions"></div></section>
        </aside>
      </section>`;
    page.querySelector('[data-go-to-playground-prompt]')?.addEventListener('click', () => {
      document.getElementById('playground-prompt-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  window.ModelPromptForgePlaygroundPage = { render };
})();
