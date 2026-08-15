(() => {
  let initialized = false;

  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function initialize() {
    if (initialized) return;
    const trigger = document.getElementById('account-profile-trigger');
    const menu = document.getElementById('account-profile-menu');
    if (!trigger || !menu) return;
    initialized = true;
    trigger.addEventListener('click', () => setOpen(menu.hidden));
    menu.querySelector('[data-profile-action="view"]')?.addEventListener('click', async () => {
      setOpen(false);
      await window.ModelPromptForgeCreatorProfilePage.openOwnProfile();
    });
    menu.querySelector('[data-profile-action="library"]')?.addEventListener('click', () => {
      setOpen(false);
      window.ModelPromptForgeRouter.navigate('/history');
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('#account-profile-control')) setOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setOpen(false);
    });
    window.addEventListener('modelpromptforge:actorchange', refresh);
    window.addEventListener('modelpromptforge:languagechange', refreshLabels);
    refreshLabels();
    refresh();

    function setOpen(open) {
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('button')?.focus();
    }
  }

  async function refresh() {
    const name = document.getElementById('account-profile-name');
    const avatar = document.getElementById('account-profile-avatar');
    if (!name || !avatar) return;
    try {
      const actor = await window.ModelPromptForgeApiClient.apiJson('/api/me');
      name.textContent = actor.displayName || actor.username || t('community.creator.myProfile', 'My profile');
      avatar.textContent = initials(actor.displayName || actor.username);
    } catch {
      name.textContent = t('community.creator.myProfile', 'My profile');
      avatar.textContent = 'ME';
    }
  }

  function refreshLabels() {
    const view = document.querySelector('[data-profile-action="view"]');
    const library = document.querySelector('[data-profile-action="library"]');
    if (view) view.textContent = t('community.creator.viewProfile', 'View profile');
    if (library) library.textContent = t('community.creator.myLibrary', 'My library');
  }

  function initials(value) {
    return String(value || 'ME').split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'ME';
  }

  window.addEventListener('modelpromptforge:ready', initialize);
  window.ModelPromptForgeAccountProfileMenu = { initialize, refresh };
})();
