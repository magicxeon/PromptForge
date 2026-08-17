import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CLIENT_ROOT } from '../../config/paths.js';
import { getAttributeLocalizationPolicy } from '../../config/attribute-localization-policy.js';
import { OpenAITextProvider } from '../../providers/OpenAITextProvider.js';

export class AttributeLocalizationService {
  constructor({
    policyLoader = getAttributeLocalizationPolicy,
    providerFactory = policy => new OpenAITextProvider(policy.apiKey),
    localeLoader = loadEnabledLocales,
    now = () => new Date().toISOString()
  } = {}) {
    this.policyLoader = policyLoader;
    this.providerFactory = providerFactory;
    this.localeLoader = localeLoader;
    this.now = now;
  }

  async localize({ englishLabel, previousLabels = null }) {
    const source = String(englishLabel || '').trim();
    const enabledLocales = await this.localeLoader();
    const targetLocales = enabledLocales.filter(locale => locale !== 'en');
    const previous = previousLabels && typeof previousLabels === 'object' ? previousLabels : {};
    if (!targetLocales.length) {
      return { labels: { ...previous, en: source }, metadata: localizationMetadata('not_required', source, [], this.now()) };
    }
    if (previous.en === source && targetLocales.every(locale => String(previous[locale] || '').trim())) {
      return {
        labels: { ...previous, en: source },
        metadata: localizationMetadata('preserved', source, targetLocales, this.now())
      };
    }

    const policy = this.policyLoader();
    if (!policy.enabled) {
      return {
        labels: fallbackLabels(source, targetLocales, previous),
        metadata: {
          ...localizationMetadata('fallback', source, targetLocales, this.now()),
          warning: policy.requestedEnabled
            ? 'attribute_localization_provider_unavailable'
            : 'attribute_localization_disabled'
        }
      };
    }

    try {
      const result = await this.providerFactory(policy).localizeAttribute({
        englishLabel: source,
        locales: targetLocales,
        model: policy.model,
        reasoningEffort: policy.reasoningEffort,
        maxOutputTokens: policy.maxOutputTokens,
        timeoutMs: policy.timeoutMs
      });
      return {
        labels: { en: source, ...result.translations },
        metadata: {
          ...localizationMetadata('generated', source, targetLocales, this.now()),
          provider: policy.provider,
          model: policy.model,
          responseId: result.responseId || null
        }
      };
    } catch (error) {
      return {
        labels: fallbackLabels(source, targetLocales, previous),
        metadata: {
          ...localizationMetadata('fallback', source, targetLocales, this.now()),
          warning: error?.code || 'attribute_localization_failed'
        }
      };
    }
  }
}

async function loadEnabledLocales() {
  const manifestPath = path.join(CLIENT_ROOT, 'i18n', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  return (manifest.locales || [])
    .filter(locale => locale?.enabled === true)
    .map(locale => String(locale.code || '').trim())
    .filter(Boolean);
}

function fallbackLabels(source, locales, previous) {
  return {
    en: source,
    ...Object.fromEntries(locales.map(locale => [locale, String(previous[locale] || '').trim() || source]))
  };
}

function localizationMetadata(status, sourceEnglish, locales, generatedAt) {
  return { schemaVersion: 1, status, sourceEnglish, locales, generatedAt };
}

export const attributeLocalizationService = new AttributeLocalizationService();
