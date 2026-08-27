import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

const LOCALE_KEY = 'model_prompt_forge_language';
// Shell-owned namespaces are loaded at bootstrap. Feature namespaces are
// requested lazily by react-i18next when their route mounts.
const bootstrapNamespaces = [
  'common',
  'shell',
  'community',
  'credits'
];

export async function initializeI18n() {
  if (i18n.isInitialized) return i18n;
  await i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      lng: localStorage.getItem(LOCALE_KEY) || 'th',
      fallbackLng: 'en',
      supportedLngs: ['th', 'en'],
      ns: bootstrapNamespaces,
      defaultNS: 'common',
      fallbackNS: ['common'],
      keySeparator: false,
      interpolation: {
        escapeValue: false,
        prefix: '{',
        suffix: '}'
      },
      backend: {
        loadPath: '/i18n/locales/{{lng}}/{{ns}}.json'
      },
      react: {
        useSuspense: true
      }
    });
  document.documentElement.lang = i18n.resolvedLanguage || 'th';
  return i18n;
}

export async function changeLocale(locale: 'th' | 'en') {
  localStorage.setItem(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

export function resolveSupportedLocale(locale?: string): 'th' | 'en' {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'th';
}

export { i18n };
