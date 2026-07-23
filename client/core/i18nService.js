(() => {
  let manifest = null;
  let activeLocale = 'th';
  let fallbackLocale = 'en';
  const loadedCatalogs = new Map(); // key: `${locale}:${namespace}` -> object
  const subscribers = new Set();
  const missingWarnings = new Set();
  let initialized = false;
  let i18nEngine = null;

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[i18n] Failed to fetch ${url}: HTTP ${response.status}`);
    }
    return response.json();
  }

  function requireI18nEngine() {
    if (!window.i18next || !window.i18nextHttpBackend) {
      return null;
    }
    return i18nEngine;
  }

  async function loadManifest(manifestUrl = '/i18n/manifest.json') {
    try {
      manifest = await fetchJson(manifestUrl);
    } catch {
      // Fallback inline manifest if network fetch fails
      manifest = {
        schemaVersion: 1,
        defaultLocale: 'th',
        fallbackLocale: 'en',
        locales: [
          { code: 'th', label: 'ไทย', nativeLabel: 'ไทย', direction: 'ltr', enabled: true },
          { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr', enabled: true }
        ],
        namespaces: ['common', 'shell', 'studio', 'scene-builder', 'character-builder', 'comparisons', 'community', 'credits', 'admin']
      };
    }
    fallbackLocale = manifest.fallbackLocale || 'en';
    return manifest;
  }

  async function loadNamespace(locale, namespace) {
    const key = `${locale}:${namespace}`;
    if (loadedCatalogs.has(key)) return loadedCatalogs.get(key);

    try {
      const engine = requireI18nEngine();
      if (engine) {
        await engine.loadLanguages(locale);
      }
      const data = engine
        ? engine.getResourceBundle(locale, namespace) || {}
        : await fetchJson(`/i18n/locales/${locale}/${namespace}.json`);
      loadedCatalogs.set(key, data || {});
      return data;
    } catch (error) {
      if (locale !== fallbackLocale) {
        // Retry with fallback locale if primary fails
        try {
          const engine = requireI18nEngine();
          if (engine) {
            await engine.loadLanguages(fallbackLocale);
          }
          const fallbackData = engine
            ? engine.getResourceBundle(fallbackLocale, namespace) || {}
            : await fetchJson(`/i18n/locales/${fallbackLocale}/${namespace}.json`);
          loadedCatalogs.set(key, fallbackData || {});
          return fallbackData;
        } catch {
          // Empty fallback catalog
        }
      }
      loadedCatalogs.set(key, {});
      return {};
    }
  }

  async function loadNamespaces(namespaceNames = [], locale = activeLocale) {
    const namespaces = Array.isArray(namespaceNames) && namespaceNames.length > 0
      ? namespaceNames
      : (manifest?.namespaces || ['common', 'shell']);

    const promises = [];
    namespaces.forEach(ns => {
      promises.push(loadNamespace(locale, ns));
      if (locale !== fallbackLocale) {
        promises.push(loadNamespace(fallbackLocale, ns));
      }
    });

    await Promise.all(promises);
  }

  function interpolate(template, variables = {}) {
    if (typeof template !== 'string') return '';
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, varName) => {
      return Object.prototype.hasOwnProperty.call(variables, varName)
        ? String(variables[varName])
        : match;
    });
  }

  function getRawTranslation(key, locale) {
    const namespaces = manifest?.namespaces || ['common', 'shell', 'studio', 'scene-builder', 'character-builder', 'comparisons', 'community', 'credits', 'admin'];
    for (const ns of namespaces) {
      const catalog = loadedCatalogs.get(`${locale}:${ns}`);
      if (catalog && Object.prototype.hasOwnProperty.call(catalog, key)) {
        return catalog[key];
      }
    }
    return null;
  }

  function t(key, variables = {}, options = {}) {
    if (!key) return '';

    // 1. Check active locale
    let raw = getRawTranslation(key, activeLocale);

    // 2. Check fallback locale
    if (raw === null && activeLocale !== fallbackLocale) {
      raw = getRawTranslation(key, fallbackLocale);
    }

    // 3. Check defaultValue option
    if (raw === null && options.defaultValue !== undefined) {
      raw = options.defaultValue;
    }

    // 4. Return key as final fallback and warn once in development
    if (raw === null) {
      if (!missingWarnings.has(key)) {
        missingWarnings.add(key);
        console.warn(`[i18n] Missing key "${key}" for locale "${activeLocale}"`);
      }
      return key;
    }

    const engine = requireI18nEngine();
    if (!engine) return interpolate(raw, variables);
    return engine.t(key, {
      ...options,
      ...variables,
      lng: activeLocale,
      ns: manifest?.namespaces || ['common']
    });
  }

  function has(key, locale = activeLocale) {
    if (!key) return false;
    const engine = requireI18nEngine();
    if (!engine) return getRawTranslation(key, locale) !== null;
    return engine.exists(key, {
      lng: locale,
      ns: manifest?.namespaces || ['common']
    });
  }

  function formatNumber(value, options = {}) {
    try {
      return new Intl.NumberFormat(activeLocale, options).format(value);
    } catch {
      return String(value);
    }
  }

  function formatDate(value, options = {}) {
    try {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(activeLocale, options).format(date);
    } catch {
      return String(value);
    }
  }

  function formatRelativeTime(value, unit, options = {}) {
    try {
      return new Intl.RelativeTimeFormat(activeLocale, options).format(value, unit);
    } catch {
      return String(value);
    }
  }

  function translateStaticBindings(root = document) {
    if (typeof root.querySelectorAll !== 'function') return;

    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });

    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (key) el.setAttribute('aria-label', t(key));
    });

    root.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      if (key) el.alt = t(key);
    });
  }

  let dropdownListenersBound = false;

  function openLanguageDropdown() {
    const container = document.getElementById('language-dropdown-container');
    const trigger = document.getElementById('lang-dropdown-trigger');
    const menu = document.getElementById('lang-dropdown-menu');
    if (!container || !menu) return;

    container.classList.add('open');
    document.querySelector('.app-header')?.classList.add('language-dropdown-open');
    menu.style.display = 'flex';
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function closeLanguageDropdown() {
    const container = document.getElementById('language-dropdown-container');
    const trigger = document.getElementById('lang-dropdown-trigger');
    const menu = document.getElementById('lang-dropdown-menu');
    if (!container || !menu) return;

    container.classList.remove('open');
    document.querySelector('.app-header')?.classList.remove('language-dropdown-open');
    menu.style.display = 'none';
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function setupDropdownEvents() {
    if (dropdownListenersBound) return;
    const trigger = document.getElementById('lang-dropdown-trigger');
    const container = document.getElementById('language-dropdown-container');

    if (!trigger || !container) return;

    dropdownListenersBound = true;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = container.classList.contains('open');
      if (isOpen) {
        closeLanguageDropdown();
      } else {
        openLanguageDropdown();
      }
    });

    if (typeof document.addEventListener === 'function') {
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          closeLanguageDropdown();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeLanguageDropdown();
        }
      });
    }
  }

  function renderLanguageSelector() {
    if (!manifest) return;
    setupDropdownEvents();

    const enabledLocales = (manifest.locales || []).filter(l => l.enabled !== false);
    const activeObj = enabledLocales.find(l => l.code === activeLocale) || enabledLocales[0];

    // 1. Render Custom Glassmorphism Dropdown
    const dropdownMenu = document.getElementById('lang-dropdown-menu');
    const currentCodeEl = document.getElementById('lang-current-code');

    if (dropdownMenu) {
      dropdownMenu.innerHTML = '';
      if (currentCodeEl && activeObj) {
        currentCodeEl.textContent = (activeObj.code || 'th').toUpperCase();
      }

      enabledLocales.forEach(loc => {
        const item = document.createElement('button');
        item.type = 'button';
        item.role = 'option';
        item.className = `lang-dropdown-item ${loc.code === activeLocale ? 'active' : ''}`;
        item.setAttribute('data-value', loc.code);

        const labelSpan = document.createElement('span');
        labelSpan.textContent = loc.nativeLabel || loc.label || loc.code.toUpperCase();
        item.appendChild(labelSpan);

        if (loc.code === activeLocale) {
          const checkSpan = document.createElement('span');
          checkSpan.className = 'lang-check';
          checkSpan.textContent = '✓';
          item.appendChild(checkSpan);
        }

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          setLocale(loc.code);
          closeLanguageDropdown();
        });

        dropdownMenu.appendChild(item);
      });
    }

    // 2. Render Legacy Pill Selector (Backward Compatibility)
    const pillContainer = document.getElementById('language-pill-selector');
    if (pillContainer) {
      pillContainer.innerHTML = '';
      enabledLocales.forEach(loc => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `pill-btn ${loc.code === activeLocale ? 'active' : ''}`;
        button.setAttribute('data-value', loc.code);
        button.textContent = loc.nativeLabel || loc.label || loc.code.toUpperCase();
        button.addEventListener('click', () => {
          setLocale(loc.code);
        });
        pillContainer.appendChild(button);
      });
    }
  }

  async function setLocale(localeCode) {
    const available = (manifest?.locales || []).filter(l => l.enabled !== false).map(l => l.code);
    const targetLocale = available.includes(localeCode) ? localeCode : fallbackLocale;

    if (activeLocale === targetLocale && initialized) return activeLocale;

    const previousLocale = activeLocale;
    activeLocale = targetLocale;

    // Load all namespaces for target locale
    await requireI18nEngine()?.changeLanguage(activeLocale);
    await loadNamespaces([], activeLocale);

    // Update global state & persistence
    if (window.state) {
      window.state.language = activeLocale;
    }
    window.ModelPromptForgeLocalePreference?.savePreferredLocale(activeLocale);

    // Update document metadata
    document.documentElement.lang = activeLocale;
    const localeObj = (manifest?.locales || []).find(l => l.code === activeLocale);
    document.documentElement.dir = localeObj?.direction || 'ltr';

    // Update UI elements
    renderLanguageSelector();
    translateStaticBindings();

    // Dispatch global custom event
    window.dispatchEvent(new CustomEvent('modelpromptforge:languagechange', {
      detail: {
        locale: activeLocale,
        previousLocale
      }
    }));

    // Notify listeners
    subscribers.forEach(cb => {
      try {
        cb(activeLocale, previousLocale);
      } catch (err) {
        console.error('[i18n] Listener error:', err);
      }
    });

    return activeLocale;
  }

  function getLocale() {
    return activeLocale;
  }

  function getSupportedLocales() {
    return (manifest?.locales || []).filter(l => l.enabled !== false);
  }

  function subscribe(listener) {
    if (typeof listener === 'function') {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    }
    return () => {};
  }

  function getLocalizedLabel(labelObj) {
    if (typeof labelObj === 'object' && labelObj !== null) {
      return labelObj[activeLocale] || labelObj[fallbackLocale] || labelObj.en || labelObj.th || '';
    }
    return labelObj || '';
  }

  async function initialize(options = {}) {
    if (initialized) return;
    await loadManifest(options.manifestUrl);

    const initialLocale = window.ModelPromptForgeLocalePreference?.getPreferredLocale(manifest) || manifest.defaultLocale || 'th';
    const supportedLocales = (manifest.locales || [])
      .filter(locale => locale.enabled !== false)
      .map(locale => locale.code);
    if (window.i18next && window.i18nextHttpBackend) {
      i18nEngine = window.i18next.createInstance();
      i18nEngine.use(window.i18nextHttpBackend);
      await i18nEngine.init({
        lng: initialLocale,
        fallbackLng: fallbackLocale,
        supportedLngs: supportedLocales,
        ns: manifest.namespaces || ['common'],
        defaultNS: 'common',
        fallbackNS: false,
        load: 'currentOnly',
        returnNull: false,
        returnEmptyString: false,
        keySeparator: false,
        interpolation: {
          escapeValue: true,
          prefix: '{',
          suffix: '}'
        },
        backend: {
          loadPath: '/i18n/locales/{{lng}}/{{ns}}.json'
        }
      });
    } else {
      console.warn('[i18n] Vendor bundles are unavailable; using the built-in catalog fallback.');
    }
    await loadNamespaces(options.namespaces || [], initialLocale);

    activeLocale = initialLocale;
    if (window.state) {
      window.state.language = activeLocale;
    }

    document.documentElement.lang = activeLocale;
    const localeObj = (manifest.locales || []).find(l => l.code === activeLocale);
    document.documentElement.dir = localeObj?.direction || 'ltr';

    renderLanguageSelector();
    translateStaticBindings();

    initialized = true;
    window.dispatchEvent(new CustomEvent('modelpromptforge:languagechange', {
      detail: { locale: activeLocale, previousLocale: null }
    }));
  }

  // Export global API
  window.ModelPromptForgeI18n = {
    initialize,
    setLocale,
    getLocale,
    getSupportedLocales,
    loadNamespaces,
    t,
    has,
    formatNumber,
    formatDate,
    formatRelativeTime,
    translateStaticBindings,
    subscribe,
    getLocalizedLabel
  };

  // Expose backward compatibility alias
  window.getLocalizedLabel = getLocalizedLabel;
})();
