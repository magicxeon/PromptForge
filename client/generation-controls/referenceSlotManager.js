/* Shared local reference-slot picker. Values are normalized before generation. */
(() => {
  const namespace = window.ModelPromptForgeGenerationControls || {};
  const translate = (key, fallback) => window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;
  const slotDefinitions = [['face', 'Face reference'], ['character', 'Character reference'], ['style', 'Style reference'], ['pose', 'Pose reference'], ['outfitFront', 'Outfit front'], ['outfitBack', 'Outfit back']];
  function createReferenceSlotManager({ mount, value = {}, onChange } = {}) {
    if (!mount) throw new Error('ReferenceSlotManager requires a mount element.');
    const current = { ...value };
    const publish = () => onChange?.({ ...current });
    const readFile = file => window.optimizeReferenceUpload
      ? window.optimizeReferenceUpload(file)
      : new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(reader.error || new Error('Unable to read reference image.')); reader.readAsDataURL(file); });
    function render() {
      mount.innerHTML = '';
      slotDefinitions.forEach(([key, fallback]) => {
        const card = document.createElement('article'); card.className = 'reference-slot-manager-card';
        const label = translate(`playground.reference.${key}`, fallback);
        card.innerHTML = `<div class="reference-slot-preview">${current[key] ? `<img src="${current[key]}" alt="${label}">` : '<span>+</span>'}</div><div><strong>${label}</strong><small>${current[key] ? 'Attached' : 'Optional'}</small></div><label class="reference-slot-upload"><input type="file" accept="image/*"><span>${current[key] ? 'Replace' : 'Browse'}</span></label>${current[key] ? '<button type="button" class="reference-slot-remove" aria-label="Remove reference">×</button>' : ''}`;
        card.querySelector('small').textContent = current[key]
          ? translate('playground.reference.attached', 'Attached')
          : translate('playground.reference.optional', 'Optional');
        card.querySelector('.reference-slot-upload span').textContent = current[key]
          ? translate('playground.reference.replace', 'Replace')
          : translate('playground.reference.browse', 'Browse');
        card.querySelector('.reference-slot-remove')?.setAttribute('aria-label', translate('playground.reference.remove', 'Remove reference'));
        const input = card.querySelector('input');
        input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; try { current[key] = await readFile(file); render(); publish(); } catch (error) { window.AppDialog?.alert?.(error.message, { title: 'Reference image' }); } });
        card.querySelector('.reference-slot-remove')?.addEventListener('click', () => { delete current[key]; render(); publish(); });
        mount.appendChild(card);
      });
    }
    render();
    return { getValue: () => ({ ...current }), setValue: patch => { Object.assign(current, patch || {}); render(); publish(); } };
  }
  namespace.createReferenceSlotManager = createReferenceSlotManager;
  window.ModelPromptForgeGenerationControls = namespace;
})();
