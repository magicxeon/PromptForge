(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function activate() {
    const page = document.getElementById('community-character-directory');
    if (!page) return;
    page.innerHTML = `<header class="community-character-directory-header">
      <div><span class="character-profile-kicker">${t('character-profiles.community.kicker', 'COMMUNITY CHARACTERS')}</span>
      <h1>${t('character-profiles.community.title', 'Choose a Character')}</h1>
      <p>${t('character-profiles.community.description', 'Open a Character to review its personality, creator and reuse rights before selecting it.')}</p></div>
      <button type="button" class="btn-neon-outline" data-route="/community">${t('character-profiles.community.back', 'Back to Community')}</button>
    </header>
    <form class="community-character-filters" data-character-filters>
      <label><span>${t('character-profiles.community.scopeFilter', 'Character library')}</span>
        <select name="scope">
          <option value="public">${t('character-profiles.community.scopePublic', 'Community Characters')}</option>
          <option value="own">${t('character-profiles.community.scopeOwn', 'My Characters')}</option>
        </select>
      </label>
      <label><span>${t('character-profiles.community.creatorFilter', 'Creator')}</span>
        <input name="creator" type="search" maxlength="80" placeholder="${t('character-profiles.community.creatorPlaceholder', 'Creator name')}">
      </label>
      <label><span>${t('character-profiles.community.useFilter', 'Best for')}</span>
        <select name="intendedUse">
          <option value="">${t('character-profiles.community.allUses', 'All uses')}</option>
          <option value="fashion">${t('character-profiles.uses.fashion', 'Fashion')}</option>
          <option value="scene_story">${t('character-profiles.uses.scene', 'Scene / Story')}</option>
          <option value="general">${t('character-profiles.uses.general', 'General')}</option>
        </select>
      </label>
      <label><span>${t('character-profiles.community.availabilityFilter', 'Availability')}</span>
        <select name="reusePolicy">
          <option value="">${t('character-profiles.community.allAvailability', 'All public Characters')}</option>
          <option value="public_reusable">${t('character-profiles.status.available', 'Available to use')}</option>
          <option value="view_only">${t('character-profiles.status.viewOnly', 'View only')}</option>
        </select>
      </label>
      <button type="submit" class="btn-neon-outline">${t('character-profiles.community.applyFilters', 'Apply filters')}</button>
    </form>
    <section data-community-character-list></section>`;
    const form = page.querySelector('[data-character-filters]');
    const list = page.querySelector('[data-community-character-list]');
    const load = () => window.ModelPromptForgeCommunityCharacterSection.render(list, {
      scope: form.elements.scope.value,
      creator: form.elements.creator.value,
      intendedUse: form.elements.intendedUse.value,
      reusePolicy: form.elements.reusePolicy.value
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      void load();
    });
    form.elements.scope.addEventListener('change', () => {
      const own = form.elements.scope.value === 'own';
      form.elements.creator.disabled = own;
      form.elements.intendedUse.disabled = own;
      form.elements.reusePolicy.disabled = own;
      void load();
    });
    void load();
  }

  window.addEventListener('modelpromptforge:route', event => {
    if (event.detail.pathname === '/community/characters') activate();
  });
  window.addEventListener('modelpromptforge:languagechange', () => {
    if (location.pathname === '/community/characters') activate();
  });
  window.ModelPromptForgeCommunityCharacterDirectory = { activate };
})();
