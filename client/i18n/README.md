# ModelPromptForge Localization & Translation Guide

This directory contains the locale manifest and translation catalogs for ModelPromptForge.

## Directory Structure

```text
client/i18n/
  manifest.json
  README.md
  schema/
    locale-manifest.schema.json
    translation-catalog.schema.json
  locales/
    en/
      common.json
      shell.json
      studio.json
      scene-builder.json
      character-builder.json
      comparisons.json
      community.json
      credits.json
      admin.json
    th/
      ... (same namespaces)
    ja/
      ... (same namespaces)
```

## Adding a New Language

To add a new language (e.g. `ko` for Korean):

1. **Copy baseline folder**: Copy `client/i18n/locales/en/` to `client/i18n/locales/ko/`.
2. **Register in manifest**: Add an entry to `client/i18n/manifest.json`:
   ```json
   {
     "code": "ko",
     "label": "한국어",
     "nativeLabel": "한국어",
     "direction": "ltr",
     "enabled": true
   }
   ```
3. **Translate values**: Translate only the string values in the JSON files.
   - Do **NOT** change translation keys.
   - Do **NOT** alter interpolation variables like `{name}` or `{count}`.
   - Do **NOT** translate AI prompt text, provider IDs (`openai`, `grok`), or model names (`dall-e-3`).
4. **Run Validator**: Run `node scripts/validate-i18n-catalogs.js` to ensure key parity and variable alignment.

## Protected Technical Terms (Do Not Translate)
- Model & Provider IDs (`gpt-4o`, `grok-imagine`, `dall-e-3`, `midjourney`)
- Attribute IDs (`hair.style.bob`, `face.shape.oval`)
- AI Prompt compilation tokens

## Catalog Rules
- Translation keys use `<feature>.<section>.<meaning>` (e.g. `community.sharedTemplates.title`).
- HTML is not allowed inside catalog values. HTML interpolation must use DOM properties safely.
