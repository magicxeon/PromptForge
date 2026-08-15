(() => {
  let previewAsVisitor = false;
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function isPreviewing() {
    return previewAsVisitor;
  }

  function reset() {
    previewAsVisitor = false;
  }

  function render({ mount, isOwner, onChange } = {}) {
    if (!mount) return;
    mount.replaceChildren();
    const context = document.createElement('span');
    context.className = 'character-profile-view-context';
    context.textContent = previewAsVisitor
      ? t('character-profiles.view.visitor', 'Visitor View')
      : isOwner
        ? t('character-profiles.view.owner', 'Owner View')
        : t('character-profiles.view.visitor', 'Visitor View');
    mount.appendChild(context);
    if (!isOwner) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-profile-preview-toggle';
    button.setAttribute('aria-pressed', String(previewAsVisitor));
    button.textContent = previewAsVisitor
      ? t('character-profiles.view.returnOwner', 'Return to owner view')
      : t('character-profiles.view.previewVisitor', 'Preview as visitor');
    button.addEventListener('click', () => {
      previewAsVisitor = !previewAsVisitor;
      onChange?.(previewAsVisitor);
    });
    mount.appendChild(button);
  }

  window.addEventListener('modelpromptforge:actorchange', reset);
  window.ModelPromptForgeCharacterProfileViewMode = { isPreviewing, reset, render };
})();
