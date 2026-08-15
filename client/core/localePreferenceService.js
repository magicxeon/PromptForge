(() => {
  const STORAGE_KEY = 'model_prompt_forge_language';

  function getBrowserLocales() {
    if (typeof navigator === 'undefined') return [];
    const languages = navigator.languages || [navigator.language || navigator.userLanguage];
    return languages.filter(Boolean).map(lang => lang.toLowerCase());
  }

  function getPreferredLocale(manifest = {}) {
    const supportedCodes = new Set(
      (manifest.locales || []).filter(l => l.enabled !== false).map(l => l.code)
    );
    const defaultLocale = manifest.defaultLocale || 'th';
    const fallbackLocale = manifest.fallbackLocale || 'en';

    // 1. Authenticated User Profile Preference (if set in window.state or user context)
    const profileLocale = window.state?.userProfile?.preferences?.locale;
    if (profileLocale && supportedCodes.has(profileLocale)) {
      return profileLocale;
    }

    // 2. localStorage preference
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && supportedCodes.has(stored)) {
        return stored;
      }
    } catch {
      // Storage access blocked or unavailable
    }

    // 3. Browser supported locale matching
    const browserLanguages = getBrowserLocales();
    for (const browserLang of browserLanguages) {
      if (supportedCodes.has(browserLang)) {
        return browserLang;
      }
      const primaryTag = browserLang.split('-')[0];
      if (supportedCodes.has(primaryTag)) {
        return primaryTag;
      }
    }

    // 4. Manifest Default Locale -> Fallback
    if (supportedCodes.has(defaultLocale)) return defaultLocale;
    if (supportedCodes.has(fallbackLocale)) return fallbackLocale;
    return Array.from(supportedCodes)[0] || 'en';
  }

  function savePreferredLocale(localeCode) {
    try {
      localStorage.setItem(STORAGE_KEY, localeCode);
    } catch {
      // Storage access blocked
    }
  }

  window.ModelPromptForgeLocalePreference = {
    getPreferredLocale,
    savePreferredLocale,
    STORAGE_KEY
  };
})();
