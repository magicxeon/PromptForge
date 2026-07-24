/* Community-first application entry. Feed data is introduced by Community-05. */
(() => {
  let initialized = false;
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function render() {
    const page = document.getElementById('community-home');
    if (!page) return;
    page.dataset.rendered = 'true';
    page.innerHTML = `<section class="community-home-hero"><div class="community-home-copy"><span class="community-home-kicker">${translate('community.home.kicker', 'COMMUNITY')}</span><h2>${translate('community.home.title', 'Discover ideas, then make them yours.')}</h2><p>${translate('community.home.description', 'Explore reusable image workflows, save inspiration and move directly into the right creation surface.')}</p><button type="button" class="btn-neon-outline" data-route="/history">${translate('community.home.library', 'Open my library')}</button></div><aside class="community-create-panel"><div><span class="community-home-kicker">${translate('community.create.kicker', 'CREATE')}</span><h3>${translate('community.create.title', 'Start a new image')}</h3><p>${translate('community.create.description', 'Choose the amount of guidance you want.')}</p></div><div class="community-create-actions"><button type="button" data-community-workflow="headshot">${translate('community.create.headshot', 'Headshot Grid')}</button><button type="button" data-community-workflow="character">${translate('community.create.character', 'Build Character')}</button><button type="button" data-community-workflow="scene">${translate('community.create.scene', 'Scene Builder')}</button><button type="button" data-community-workflow="playground">${translate('community.create.playground', 'Open Playground')}</button></div></aside></section><section class="community-empty-feed"><div><span class="community-home-kicker">${translate('community.explore.kicker', 'EXPLORE')}</span><h3>${translate('community.explore.title', 'Community discovery is arriving here.')}</h3><p>${translate('community.explore.description', 'Shared templates and creator posts will appear in this space as the Community feed rolls out.')}</p></div><button type="button" class="btn-neon-outline" data-route="/studio">${translate('community.explore.create', 'Create in Studio')}</button></section>`;
    page.querySelectorAll('[data-community-workflow]').forEach(button => button.addEventListener('click', () => window.ModelPromptForgeCommunityCreateLauncher?.launch(button.dataset.communityWorkflow)));
  }
  function initialize() {
    if (initialized) return;
    initialized = true;
    render();
    window.addEventListener('modelpromptforge:languagechange', render);
  }
  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCommunityHome = { initialize, render };
})();
