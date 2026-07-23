import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.resolve(PROJECT_ROOT, 'client', 'i18n');
const MANIFEST_PATH = path.resolve(I18N_DIR, 'manifest.json');
const LOCALE_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

function extractVariables(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))].sort();
}

function hasHtmlTags(str) {
  if (typeof str !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(str);
}

export async function validateI18nCatalogs({ manifestPath = MANIFEST_PATH } = {}) {
  const errors = [];
  const warnings = [];

  let manifest;
  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    manifest = JSON.parse(content);
  } catch (err) {
    errors.push(`Failed to read or parse manifest.json at ${manifestPath}: ${err.message}`);
    return { valid: false, errors, warnings };
  }

  if (!manifest.defaultLocale || !manifest.fallbackLocale || !Array.isArray(manifest.locales) || !Array.isArray(manifest.namespaces)) {
    errors.push('Manifest is missing required root fields (defaultLocale, fallbackLocale, locales, namespaces)');
    return { valid: false, errors, warnings };
  }

  const enabledLocales = manifest.locales.filter(l => l.enabled !== false).map(l => l.code);
  const fallbackLocale = manifest.fallbackLocale;

  if (new Set(manifest.locales.map(locale => locale.code)).size !== manifest.locales.length) {
    errors.push('Manifest contains duplicate locale codes');
  }
  if (new Set(manifest.namespaces).size !== manifest.namespaces.length) {
    errors.push('Manifest contains duplicate namespace names');
  }
  manifest.locales.forEach(locale => {
    if (!LOCALE_CODE_PATTERN.test(locale.code || '')) {
      errors.push(`Locale code "${locale.code}" is not BCP 47-compatible`);
    }
  });

  if (!enabledLocales.includes(fallbackLocale)) {
    errors.push(`Fallback locale "${fallbackLocale}" is not listed among enabled locales`);
  }
  if (!enabledLocales.includes(manifest.defaultLocale)) {
    errors.push(`Default locale "${manifest.defaultLocale}" is not listed among enabled locales`);
  }

  const baselineCatalogs = new Map(); // namespace -> keyMap

  // 1. Load English / Fallback Baseline Catalogs
  for (const ns of manifest.namespaces) {
    const nsPath = path.resolve(I18N_DIR, 'locales', fallbackLocale, `${ns}.json`);
    try {
      const content = await fs.readFile(nsPath, 'utf8');
      const catalog = JSON.parse(content);
      if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') {
        throw new Error('Catalog root must be a JSON object');
      }
      baselineCatalogs.set(ns, catalog);
    } catch (err) {
      errors.push(`Fallback locale "${fallbackLocale}" missing namespace catalog "${ns}.json": ${err.message}`);
    }
  }

  // 2. Validate Catalogs for Every Enabled Locale
  for (const locale of enabledLocales) {
    for (const ns of manifest.namespaces) {
      const nsPath = path.resolve(I18N_DIR, 'locales', locale, `${ns}.json`);
      let catalog;
      try {
        const content = await fs.readFile(nsPath, 'utf8');
        catalog = JSON.parse(content);
        if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') {
          throw new Error('Catalog root must be a JSON object');
        }
      } catch (err) {
        errors.push(`Locale "${locale}" missing or invalid catalog "${ns}.json": ${err.message}`);
        continue;
      }

      const baseline = baselineCatalogs.get(ns) || {};

      // Check key parity against English baseline
      for (const [key, baseValue] of Object.entries(baseline)) {
        if (!Object.prototype.hasOwnProperty.call(catalog, key)) {
          errors.push(`Locale "${locale}" namespace "${ns}" missing key "${key}"`);
          continue;
        }

        const value = catalog[key];

        if (typeof value !== 'string') {
          errors.push(`Locale "${locale}" namespace "${ns}" key "${key}" must be a string`);
          continue;
        }

        if (value.trim() === '') {
          errors.push(`Locale "${locale}" namespace "${ns}" key "${key}" has empty translation value`);
        }

        if (hasHtmlTags(value)) {
          errors.push(`Locale "${locale}" namespace "${ns}" key "${key}" contains HTML tags: "${value}"`);
        }

        // Variable interpolation check
        const baseVars = extractVariables(baseValue);
        const targetVars = extractVariables(value);
        if (JSON.stringify(baseVars) !== JSON.stringify(targetVars)) {
          errors.push(`Locale "${locale}" namespace "${ns}" key "${key}" variable mismatch. Baseline: [${baseVars.join(', ')}], Target: [${targetVars.join(', ')}]`);
        }
      }

      // Extra keys create catalog drift and must be resolved before release.
      for (const key of Object.keys(catalog)) {
        if (!Object.prototype.hasOwnProperty.call(baseline, key)) {
          errors.push(`Locale "${locale}" namespace "${ns}" has unexpected key "${key}" not in baseline`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate-i18n-catalogs.js')) {
  validateI18nCatalogs().then(({ valid, errors, warnings }) => {
    if (warnings.length > 0) {
      console.warn('i18n Catalog Validation Warnings:');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }
    if (!valid) {
      console.error('i18n Catalog Validation Failed:');
      errors.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    } else {
      console.log('All i18n translation catalogs validated successfully.');
      process.exit(0);
    }
  }).catch(err => {
    console.error('Validator execution error:', err);
    process.exit(1);
  });
}
