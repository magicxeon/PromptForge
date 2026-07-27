(() => {
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, stats = {} } = {}) {
    if (!mount) return;
    const values = [
      ['total', Number(stats.totalOutputs || 0), t('character-profiles.stats.total', 'Generated images')],
      ['fashion', Number(stats.byUseCase?.fashion || 0), t('character-profiles.stats.fashion', 'Fashion')],
      ['scene', Number(stats.byUseCase?.sceneStory || 0), t('character-profiles.stats.scene', 'Scene / Story')],
      ['other', Number(stats.byUseCase?.other || 0), t('character-profiles.stats.other', 'Other')]
    ];
    const section = document.createElement('section');
    section.className = 'character-profile-stats';
    section.setAttribute('aria-label', t('character-profiles.stats.label', 'Character usage statistics'));
    values.forEach(([id, value, label]) => {
      const item = document.createElement('article');
      item.dataset.stat = id;
      const count = document.createElement('strong');
      count.textContent = compact(value);
      count.setAttribute('aria-label', String(value));
      const copy = document.createElement('span');
      copy.textContent = label;
      item.append(count, copy);
      section.appendChild(item);
    });
    mount.replaceChildren(section);
  }

  function compact(value) {
    return new Intl.NumberFormat(undefined, {
      notation: value >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1
    }).format(value);
  }

  window.ModelPromptForgeCharacterProfileStats = { render };
})();
