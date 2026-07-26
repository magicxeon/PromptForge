/**
 * Client read model for server-owned Community delivery flags.
 */
(() => {
  const CLOSED_FLAGS = Object.freeze({
    schemaVersion: 1,
    community: Object.freeze({
      enabled: false,
      shareEnabled: false,
      exploreEnabled: false,
      engagementEnabled: false,
      creatorProfilesEnabled: false,
      galleryEnabled: false,
      moderationEnabled: false,
      privateBeta: false
    }),
    development: Object.freeze({ mockActorSwitcherEnabled: false }),
    routing: Object.freeze({ automaticSimpleModeEnabled: false })
  });

  let flags = null;
  let loadingPromise = null;
  let loadError = null;

  function initialize({ forceReload = false } = {}) {
    if (loadingPromise && !forceReload) return loadingPromise;
    loadingPromise = loadFlags()
      .then(nextFlags => {
        flags = normalizeFlags(nextFlags);
        loadError = null;
        dispatchChange();
        return getSnapshot();
      })
      .catch(error => {
        flags = structuredClone(CLOSED_FLAGS);
        loadError = error;
        dispatchChange();
        return getSnapshot();
      });
    return loadingPromise;
  }

  async function loadFlags() {
    if (!window.ModelPromptForgeApiClient?.apiJson) {
      throw new Error('Community feature API client is unavailable.');
    }
    return window.ModelPromptForgeApiClient.apiJson('/api/community/features');
  }

  function normalizeFlags(input = {}) {
    return {
      schemaVersion: Number(input.schemaVersion) || 1,
      community: normalizeBooleanGroup(CLOSED_FLAGS.community, input.community),
      development: normalizeBooleanGroup(CLOSED_FLAGS.development, input.development),
      routing: normalizeBooleanGroup(CLOSED_FLAGS.routing, input.routing)
    };
  }

  function normalizeBooleanGroup(defaults, input) {
    return Object.fromEntries(
      Object.keys(defaults).map(key => [key, input?.[key] === true])
    );
  }

  function getSnapshot() {
    return flags ? structuredClone(flags) : null;
  }

  function isEnabled(featurePath, { defaultValue = false } = {}) {
    if (!flags) return defaultValue;
    return readPath(flags, featurePath) === true;
  }

  function isRouteEnabled(pathname, { defaultValue = true } = {}) {
    const path = String(pathname || '').replace(/\/$/, '') || '/community';
    if (path === '/community' || path.startsWith('/community/')) {
      return isEnabled('community.enabled', { defaultValue });
    }
    if (path.startsWith('/creators/')) {
      return isEnabled('community.enabled', { defaultValue })
        && isEnabled('community.creatorProfilesEnabled', { defaultValue });
    }
    return true;
  }

  function isLoaded() {
    return flags !== null;
  }

  function getLoadError() {
    return loadError;
  }

  function dispatchChange() {
    window.dispatchEvent(new CustomEvent('modelpromptforge:communityfeatureschange', {
      detail: { flags: getSnapshot(), error: loadError }
    }));
  }

  function readPath(value, featurePath) {
    return String(featurePath).split('.').reduce(
      (current, key) => current && typeof current === 'object' ? current[key] : undefined,
      value
    );
  }

  document.addEventListener('DOMContentLoaded', () => initialize());

  window.ModelPromptForgeCommunityFeatures = {
    initialize,
    getSnapshot,
    isEnabled,
    isRouteEnabled,
    isLoaded,
    getLoadError
  };
})();
