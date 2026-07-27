/* Community-first application entry. Feed data is introduced by Community-05. */
(() => {
  let initialized = false;
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  function render() {
    const page = document.getElementById('community-home');
    if (!page) return;
    page.dataset.rendered = 'true';
    page.innerHTML = `
      <section class="community-home-hero">
        <div class="community-home-copy">
          <span class="community-home-kicker">${translate('community.home.kicker', 'COMMUNITY')}</span>
          <h2>${translate('community.home.title', 'Discover ideas, then make them yours.')}</h2>
          <p>${translate('community.home.description', 'Explore reusable image workflows, save inspiration and move directly into the right creation surface.')}</p>
          <div class="community-home-actions">
            <button type="button" class="btn-neon-outline" data-route="/community/characters">${translate('character-profiles.community.browse', 'Browse Characters')}</button>
            <button type="button" class="btn-neon-outline" data-route="/history">${translate('community.home.library', 'Open my library')}</button>
            <button type="button" class="btn-neon-outline" data-community-own-profile hidden>${translate('community.creator.myProfile', 'My creator profile')}</button>
          </div>
        </div>
        <aside class="community-create-panel">
          <div><span class="community-home-kicker">${translate('community.create.kicker', 'CREATE')}</span>
          <h3>${translate('community.create.title', 'Start a new image')}</h3>
          <p>${translate('community.create.description', 'Choose the amount of guidance you want.')}</p></div>
          <div class="community-create-actions">
            <button type="button" data-community-workflow="headshot">${translate('community.create.headshot', 'Headshot Grid')}</button>
            <button type="button" data-community-workflow="character">${translate('community.create.character', 'Build Character')}</button>
            <button type="button" data-community-workflow="scene">${translate('community.create.scene', 'Scene Builder')}</button>
            <button type="button" data-community-workflow="playground">${translate('community.create.playground', 'Open Playground')}</button>
          </div>
        </aside>
      </section>
       <section class="community-feed-section" data-community-feed></section>
      <section class="community-character-spotlight" data-community-character-spotlight hidden>
        <header>
          <div><span class="community-home-kicker">${translate('character-profiles.community.kicker', 'COMMUNITY CHARACTERS')}</span>
          <h2>${translate('character-profiles.community.rowTitle', 'Characters')}</h2>
          <p>${translate('character-profiles.community.rowDescription', 'Meet reusable models created by the community.')}</p></div>
          <button type="button" class="btn-neon-outline" data-route="/community/characters">${translate('character-profiles.community.viewAll', 'View all')}</button>
        </header>
        <div data-community-character-rail></div>
      </section>
     `;
    page.querySelectorAll('[data-community-workflow]').forEach(button => button.addEventListener('click', () => window.ModelPromptForgeCommunityCreateLauncher?.launch(button.dataset.communityWorkflow)));
    const profileButton = page.querySelector('[data-community-own-profile]');
    profileButton?.addEventListener('click', () =>
      window.ModelPromptForgeCreatorProfilePage?.openOwnProfile?.()
    );
    enableCreatorProfileButton(profileButton);
    enableCharacterButton(page.querySelector('[data-route="/community/characters"]'));
    enableCharacterSpotlight(
      page.querySelector('[data-community-character-spotlight]'),
      page.querySelector('[data-community-character-rail]')
    );
    window.ModelPromptForgeCommunityFeed?.initialize?.();
  }
  async function enableCharacterButton(button) {
    if (!button) return;
    await window.ModelPromptForgeCommunityFeatures?.initialize?.();
    button.hidden = window.ModelPromptForgeCommunityFeatures?.isEnabled?.(
      'community.characterProfilesEnabled'
    ) !== true;
  }
  async function enableCreatorProfileButton(button) {
    if (!button) return;
    await window.ModelPromptForgeCommunityFeatures?.initialize?.();
    button.hidden = window.ModelPromptForgeCommunityFeatures?.isEnabled?.(
      'community.creatorProfilesEnabled'
    ) !== true;
  }
  async function enableCharacterSpotlight(section, rail) {
    if (!section || !rail) return;
    await window.ModelPromptForgeCommunityFeatures?.initialize?.();
    const enabled = window.ModelPromptForgeCommunityFeatures?.isEnabled?.(
      'community.characterProfilesEnabled'
    ) === true;
    section.hidden = !enabled;
    if (enabled) {
      void window.ModelPromptForgeCommunityCharacterSection?.render?.(rail, {
        variant: 'rail',
        scope: 'public',
        limit: 8
      });
    }
  }
  function initialize() {
    if (initialized) return;
    initialized = true;
    render();
    window.addEventListener('modelpromptforge:languagechange', render);
    window.addEventListener('modelpromptforge:communityfeatureschange', render);
  }
  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeCommunityHome = { initialize, render };
})();
