/* Actor-scoped persistence for the manual Playground surface. */
(() => {
  const schemaVersion = 2;
  const getActorId = () => window.ModelPromptForgeActorContext?.getActiveMockUserId?.() || 'usr_demo';
  const getKey = () => `model_prompt_forge_playground_${getActorId()}_v${schemaVersion}`;
  const defaults = () => ({ schemaVersion, prompt: '', negativePrompt: '', settings: { providerId: window.state?.providerCatalog?.defaultProvider || '', modelId: '', resolution: null, aspectRatio: '6:8', width: 768, height: 1024 }, references: {}, comparisonSlots: [], resultSurface: { status: 'idle', latest: null, recent: [], error: null } });
  let current = defaults();
  const listeners = new Set();
  const emit = () => listeners.forEach(listener => listener(getState()));
  function getState() { return JSON.parse(JSON.stringify(current)); }
  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(getKey()) || 'null');
      const compatible = stored?.schemaVersion === schemaVersion || stored?.schemaVersion === 1;
      current = compatible ? { ...defaults(), ...stored, schemaVersion, settings: { ...defaults().settings, ...(stored.settings || {}) }, references: { ...(stored.references || {}) }, comparisonSlots: Array.isArray(stored.comparisonSlots) ? stored.comparisonSlots : [], resultSurface: { ...defaults().resultSurface, ...(stored.resultSurface || {}), recent: Array.isArray(stored.resultSurface?.recent) ? stored.resultSurface.recent : [] } } : defaults();
    } catch { current = defaults(); }
    emit();
    return getState();
  }
  function patch(next = {}) {
    current = { ...current, ...next, settings: next.settings ? { ...current.settings, ...next.settings } : current.settings, references: next.references ? { ...next.references } : current.references };
    localStorage.setItem(getKey(), JSON.stringify(current));
    emit();
    return getState();
  }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  window.ModelPromptForgePlaygroundState = { getState, load, patch, subscribe, getStorageKey: getKey };
})();
