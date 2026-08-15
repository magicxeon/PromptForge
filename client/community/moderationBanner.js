(() => {
  const translate = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, contentDisclosure, moderationState, canSeeModeration = false } = {}) {
    if (!mount) return;
    mount.replaceChildren();

    if (contentDisclosure === 'ai_generated') {
      mount.appendChild(createBanner(
        'is-disclosure',
        translate('community.safety.aiDisclosure', 'AI-generated content')
      ));
    }
    if (canSeeModeration && moderationState === 'reported') {
      mount.appendChild(createBanner(
        'is-review',
        translate('community.safety.underReview', 'This post has been reported and may be reviewed.')
      ));
    }
  }

  function createBanner(className, text) {
    const banner = document.createElement('p');
    banner.className = `community-moderation-banner ${className}`;
    banner.textContent = text;
    return banner;
  }

  window.ModelPromptForgeModerationBanner = { render };
})();
