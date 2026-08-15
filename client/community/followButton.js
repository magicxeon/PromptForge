(() => {
  const translate = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function render({ mount, profile, onChanged } = {}) {
    if (!mount) return;
    mount.replaceChildren();
    if (!profile || profile.viewer?.isOwner) return;

    const button = document.createElement('button');
    const error = document.createElement('p');
    error.className = 'creator-profile-action-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    button.type = 'button';
    button.className = profile.viewer?.isFollowing
      ? 'creator-follow-button is-following'
      : 'creator-follow-button';
    button.textContent = profile.viewer?.isFollowing
      ? translate('community.creator.following', 'Following')
      : translate('community.creator.follow', 'Follow');
    button.addEventListener('click', async () => {
      button.disabled = true;
      error.hidden = true;
      try {
        const updated = profile.viewer?.isFollowing
          ? await window.ModelPromptForgeCommunityCreatorApi.unfollow(profile.id)
          : await window.ModelPromptForgeCommunityCreatorApi.follow(profile.id);
        onChanged?.(updated);
      } catch (requestError) {
        error.textContent = requestError?.message || translate(
          'community.creator.actionFailed',
          'The creator profile could not be updated.'
        );
        error.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
    mount.append(button, error);
  }

  window.ModelPromptForgeFollowButton = { render };
})();
