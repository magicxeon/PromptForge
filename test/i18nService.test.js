import assert from 'node:assert/strict';
import test from 'node:test';
import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';

// Setup minimal DOM mocks for Node test runner
function setupDOMEnvironment() {
  const documentListeners = new Map();
  const windowListeners = new Map();

  global.window = {
    state: { language: 'th' },
    dispatchEvent(event) {
      const handlers = windowListeners.get(event.type) || [];
      handlers.forEach(fn => fn(event));
    },
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    }
  };
  global.window.i18next = i18next.createInstance();
  global.window.i18nextHttpBackend = HttpBackend;

  global.document = {
    documentElement: { lang: 'en', dir: 'ltr' },
    getElementById() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(fn);
    }
  };
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'th', languages: ['th'] },
      configurable: true,
      writable: true
    });
  } catch {
    // Ignore if property cannot be redefined
  }

  const storageMap = new Map();
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem(key) { return storageMap.get(key) || null; },
        setItem(key, value) { storageMap.set(key, String(value)); },
        removeItem(key) { storageMap.delete(key); },
        clear() { storageMap.clear(); }
      },
      configurable: true,
      writable: true
    });
  } catch {
    // Ignore
  }

  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail || {};
    }
  };
}

setupDOMEnvironment();

test('i18nService catalog loading, lookup, fallback and event dispatching', async t => {
  // Mock fetch for testing
  const catalogs = {
    '/i18n/manifest.json': {
      schemaVersion: 1,
      defaultLocale: 'th',
      fallbackLocale: 'en',
      locales: [
        { code: 'th', label: 'ไทย', enabled: true },
        { code: 'en', label: 'English', enabled: true },
        { code: 'ja', label: '日本語', enabled: true }
      ],
      namespaces: ['common']
    },
    '/i18n/locales/th/common.json': {
      'common.action.cancel': 'ยกเลิก',
      'common.greeting': 'สวัสดีคุณ {name}'
    },
    '/i18n/locales/en/common.json': {
      'common.action.cancel': 'Cancel',
      'common.greeting': 'Hello {name}',
      'common.fallbackOnly': 'English Baseline Only'
    },
    '/i18n/locales/ja/common.json': {
      'common.action.cancel': 'キャンセル',
      'common.greeting': 'こんにちは {name}'
    }
  };

  global.fetch = async (url) => {
    const data = catalogs[url];
    if (!data) return { ok: false, status: 404 };
    return {
      ok: true,
      status: 200,
      json: async () => data,
      text: async () => JSON.stringify(data)
    };
  };

  await import('../client/core/localePreferenceService.js');
  await import('../client/core/i18nService.js');

  const i18n = window.ModelPromptForgeI18n;
  assert.ok(i18n, 'i18nService should be exported on window');

  await i18n.initialize();
  assert.equal(i18n.getLocale(), 'th');

  // Test primary translation lookup
  assert.equal(i18n.t('common.action.cancel'), 'ยกเลิก');

  // Test variable interpolation
  assert.equal(i18n.t('common.greeting', { name: 'Alice' }), 'สวัสดีคุณ Alice');

  // Test fallback to English when key is missing in active locale
  assert.equal(i18n.t('common.fallbackOnly'), 'English Baseline Only');

  // Test language change event dispatching
  let eventFired = false;
  let eventDetail = null;
  window.addEventListener('modelpromptforge:languagechange', event => {
    eventFired = true;
    eventDetail = event.detail;
  });

  await i18n.setLocale('ja');
  assert.equal(i18n.getLocale(), 'ja');
  assert.equal(i18n.t('common.action.cancel'), 'キャンセル');
  assert.equal(eventFired, true);
  assert.equal(eventDetail.locale, 'ja');
  assert.equal(eventDetail.previousLocale, 'th');

  // Test getLocalizedLabel backward compatibility
  assert.equal(i18n.getLocalizedLabel({ en: 'Hello', th: 'สวัสดี', ja: 'こんにちは' }), 'こんにちは');
});
