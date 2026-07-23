# Community-00-006 Localization and Language Extension Foundation

**Status:** Implemented - Client Localization Foundation  
**Feature type:** Shared client localization foundation  
**Depends on:** Application shell, current `window.state.language`, attribute metadata, Community public UI contracts  
**Must complete before:** Community-00-005 and Community feature UI expansion  
**Created:** 2026-07-23

## 1. Business Requirement

ModelPromptForge currently supports Thai and English through several separate
patterns:

- inline `{ en, th }` label objects,
- `state.language === "th"` conditions,
- feature-local dictionaries,
- static English text in HTML,
- listeners attached directly to the language selector.

This works for the current Studio but will become difficult to maintain when
Community, creator profiles, moderation, credits and commercial screens are
added. The application needs one localization contract before those surfaces
expand.

The localization foundation must:

- keep Thai and English behavior working during migration;
- allow a new language to be added without editing application business logic;
- make translation files easy for a human translator or AI agent to locate,
  understand and validate;
- keep UI translations separate from AI prompt text and provider payloads;
- support labels, descriptions, placeholders, tooltips, validation messages,
  dialog text, accessibility labels, dates, numbers and plural forms;
- provide deterministic fallback when a translation is missing;
- avoid forcing all feature translations into one very large file;
- work with the current browser-native, no-build-tool client architecture.

Community user-generated content is not automatically translated in this
phase. A post may record its source language, but title, description and prompt
content remain authored content.

## 2. Current-State Assessment

### 2.1 Existing Source of Language State

```text
window.state.language
localStorage key: model_prompt_forge_language
default locale: th
fallback locale: en
supported today: th, en
```

### 2.2 Existing Localization Patterns

```text
client/core/studioState.js
  window.getLocalizedLabel({ en, th })

client/app.js
  language pill click handler
  re-renders form/provider/model UI

client/shell/applicationShell.js
  reads localized navigation labels

client/comparisons/*
  owns a feature-local dictionary and language helper

client/core/formRenderer.js
client/visual-controls/visualOptionControls.js
  render localized attribute label and description objects

client/index.html
  contains many static strings that are not currently localized
```

### 2.3 Problems to Remove

- No central locale registry or translation API.
- No standard language-change event.
- Feature modules know the DOM ID of the language selector.
- Translation keys cannot be checked automatically for missing values.
- Static text, JavaScript dialogs and accessibility labels use different
  approaches.
- Adding a third language requires code edits and broad manual searching.
- UI translation and English AI prompt phrases are not formally separated.

## 3. Software Design

### 3.1 Ownership and File Structure

Localization is shared client infrastructure. Runtime logic belongs under
`client/core/`; translation source catalogs belong under a dedicated,
translator-friendly `client/i18n/` capability.

```text
client/
  core/
    i18nService.js
    localePreferenceService.js

  assets/vendor/i18next/
    i18next.min.js
    i18nextHttpBackend.min.js
    LICENSE-i18next.txt
    LICENSE-i18next-http-backend.txt

  i18n/
    README.md
    manifest.json
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
        common.json
        shell.json
        studio.json
        scene-builder.json
        character-builder.json
        comparisons.json
        community.json
        credits.json
        admin.json

scripts/
  sync-i18next-browser-assets.js
  validate-i18n-catalogs.js

test/
  i18nService.test.js
  i18nCatalogParity.test.js
```

No translation JSON is runtime user data. It must not be stored under
`server/data/`.

### 3.2 Locale Manifest Contract

`client/i18n/manifest.json` is the only supported-locale registry.

```json
{
  "schemaVersion": 1,
  "defaultLocale": "th",
  "fallbackLocale": "en",
  "locales": [
    {
      "code": "th",
      "label": "ไทย",
      "nativeLabel": "ไทย",
      "direction": "ltr",
      "enabled": true
    },
    {
      "code": "en",
      "label": "English",
      "nativeLabel": "English",
      "direction": "ltr",
      "enabled": true
    }
  ],
  "namespaces": [
    "common",
    "shell",
    "studio",
    "scene-builder",
    "character-builder",
    "comparisons",
    "community",
    "credits",
    "admin"
  ]
}
```

Rules:

- Locale codes use BCP 47-compatible values such as `en`, `th`, `ja`,
  `ko`, `zh-Hans`.
- The application must not hardcode the language selector to TH/EN.
- The selector is rendered from enabled manifest entries.
- `direction` prepares the shell for future RTL languages.
- Adding a locale requires a manifest entry and a matching locale directory,
  not JavaScript condition changes.

### 3.3 Translation Catalog Contract

Each namespace file is a flat JSON object. Flat keys make parity checks,
searching, code review and AI translation more predictable.

Example `client/i18n/locales/en/community.json`:

```json
{
  "community.sharedTemplates.title": "Shared Templates",
  "community.sharedTemplates.empty": "No shared templates yet",
  "community.sharedTemplates.creator": "Creator: {name}",
  "community.template.use": "Use Template",
  "community.template.loadConfirm": "Load this template into Scene Builder?",
  "community.post.unavailable": "This community post is unavailable."
}
```

Equivalent Thai catalog:

```json
{
  "community.sharedTemplates.title": "เทมเพลตที่แชร์",
  "community.sharedTemplates.empty": "ยังไม่มีเทมเพลตที่แชร์",
  "community.sharedTemplates.creator": "ผู้สร้าง: {name}",
  "community.template.use": "ใช้เทมเพลต",
  "community.template.loadConfirm": "ต้องการนำเทมเพลตนี้ไปใช้ใน Scene Builder หรือไม่?",
  "community.post.unavailable": "โพสต์นี้ไม่พร้อมใช้งาน"
}
```

Catalog rules:

- English is the structural fallback and key-parity baseline.
- Every enabled locale must contain all required English keys before release.
- Values are plain text. HTML is not allowed in catalogs by default.
- Variables use named interpolation, for example `{name}` and `{count}`.
- A variable name must be identical across every locale.
- Keys use `<feature>.<section>.<meaning>` and describe intent rather than the
  original English sentence.
- Do not use generated numeric keys.
- Do not duplicate the same common action in every feature; use keys such as
  `common.action.cancel`, `common.action.save`, and `common.status.loading`.

### 3.4 Client Localization API

`client/core/i18nService.js` is the application adapter around self-hosted
`i18next` and `i18next-http-backend`. It owns catalog loading, translation
lookup and the app-specific language-change contract; feature modules must not
call the library global directly.

```text
window.ModelPromptForgeI18n.initialize(options)
window.ModelPromptForgeI18n.setLocale(localeCode)
window.ModelPromptForgeI18n.getLocale()
window.ModelPromptForgeI18n.getSupportedLocales()
window.ModelPromptForgeI18n.loadNamespaces(namespaceNames)
window.ModelPromptForgeI18n.t(key, variables?, options?)
window.ModelPromptForgeI18n.has(key, localeCode?)
window.ModelPromptForgeI18n.formatNumber(value, options?)
window.ModelPromptForgeI18n.formatDate(value, options?)
window.ModelPromptForgeI18n.subscribe(listener)
```

Lookup order:

```text
selected locale
  -> fallback locale (en)
  -> supplied defaultValue
  -> translation key
```

Missing keys must produce a development warning once per key and must not
break rendering.

`setLocale()` must:

1. validate the requested locale against the manifest;
2. load required namespaces;
3. update `window.state.language`;
4. persist the locale preference;
5. set `<html lang>` and `<html dir>`;
6. translate registered static DOM bindings;
7. dispatch `modelpromptforge:languagechange`;
8. notify subscribers.

Event contract:

```js
window.dispatchEvent(new CustomEvent("modelpromptforge:languagechange", {
  detail: {
    locale: "th",
    previousLocale: "en"
  }
}));
```

Feature modules must subscribe to this event or the service API. They must not
listen directly to `#language-pill-selector`.

### 3.5 Static DOM Binding Contract

Static HTML uses declarative attributes:

```html
<h2 data-i18n="community.sharedTemplates.title"></h2>

<input
  data-i18n-placeholder="community.search.placeholder"
  data-i18n-aria-label="community.search.label">

<button
  data-i18n="common.action.cancel"
  data-i18n-title="common.action.cancelHelp">
</button>
```

Supported attributes:

```text
data-i18n
data-i18n-placeholder
data-i18n-title
data-i18n-aria-label
data-i18n-alt
```

Rendering must use `textContent` or the corresponding safe DOM property.
Translation values must not be assigned to `innerHTML`.

### 3.6 Dynamic UI Contract

Feature modules call:

```js
const t = window.ModelPromptForgeI18n.t;
label.textContent = t("community.template.use");
```

Dynamic components that remain mounted across a language change must expose a
`localize()` or `render()` method and subscribe to the central language-change
event.

Modal, toast and validation code must pass translation keys, not hardcoded
sentences, wherever the user can see the result.

### 3.7 Attribute and Provider Metadata Compatibility

During migration, existing objects remain valid:

```json
{
  "label": {
    "en": "Oval Face",
    "th": "ใบหน้ารูปไข่"
  }
}
```

`window.getLocalizedLabel()` remains as a compatibility adapter and delegates
locale resolution to the central service.

New or migrated records should support key-based metadata:

```json
{
  "id": "face.shape.oval",
  "labelKey": "attributes.face.shape.oval.label",
  "descriptionKey": "attributes.face.shape.oval.description",
  "prompt": {
    "default": "oval face"
  }
}
```

Rules:

- `labelKey` and `descriptionKey` are UI localization fields.
- `prompt` remains provider-facing English prompt content and must not be
  translated by the UI localization service.
- Existing inline label objects are migrated gradually; a bulk rewrite is not
  required in the foundation task.
- Resolution order is translation key, legacy locale object, English value,
  then stable ID.

### 3.8 Server Error and API Contract

Server APIs must return stable machine-readable error codes:

```json
{
  "error": {
    "code": "community_post_unavailable",
    "message": "This community post is unavailable.",
    "details": {}
  }
}
```

The client maps `error.code` to:

```text
errors.community_post_unavailable
```

The server English message is a fallback for logs, old clients and unknown
codes. The server must not select UI language from a username or query string.

### 3.9 Locale Preference

MVP source:

```text
localStorage: model_prompt_forge_language
```

Future authenticated source:

```text
userProfile.preferences.locale
```

Resolution priority:

```text
authenticated profile preference
  -> localStorage
  -> browser-supported locale
  -> manifest default locale
```

Changing the locale while authenticated should update local state immediately
and may persist to the profile through a later user-preference endpoint.

### 3.10 Formatting, Plurals and Accessibility

- Use `Intl.NumberFormat`, `Intl.DateTimeFormat`, and
  `Intl.RelativeTimeFormat`.
- Dates stored in records remain ISO UTC; only display formatting is localized.
- Credit amounts and provider/model IDs are not translated.
- Plural text uses explicit `.one` and `.other` keys selected by
  `Intl.PluralRules`.
- All icon-only controls must have translated `aria-label` and `title`.
- Layout must tolerate longer translated text without overlap or truncation
  that hides essential meaning.

## 4. Translator and AI Contributor Workflow

`client/i18n/README.md` must provide one short, deterministic workflow:

1. Copy `client/i18n/locales/en/` to a new locale folder.
2. Add the locale to `manifest.json`.
3. Translate values only; do not change keys or interpolation variables.
4. Keep provider IDs, model IDs, attribute IDs and prompt phrases unchanged.
5. Run the catalog validator.
6. Review missing keys, unexpected keys and variable mismatches.
7. Test the new locale at desktop and mobile widths.

The README must include:

- key naming rules;
- namespace ownership table;
- protected technical terms;
- examples of correct interpolation;
- instructions for adding a new namespace;
- the validation command;
- a checklist suitable for a human translator or AI agent.

The validator must fail on:

- malformed JSON;
- locale missing from the manifest;
- missing or extra namespace files;
- missing English-baseline keys;
- unexpected keys unless explicitly allowed;
- interpolation variable mismatch;
- empty translations;
- HTML tags in plain-text catalogs;
- duplicate keys;
- unsupported locale codes.

## 5. Implementation Plan

### Phase 1: Foundation

Files:

```text
client/core/i18nService.js
client/core/localePreferenceService.js
client/assets/vendor/i18next/*
client/i18n/manifest.json
client/i18n/README.md
client/i18n/schema/*
client/i18n/locales/en/common.json
client/i18n/locales/en/shell.json
client/i18n/locales/th/common.json
client/i18n/locales/th/shell.json
scripts/validate-i18n-catalogs.js
scripts/sync-i18next-browser-assets.js
test/i18nService.test.js
test/i18nCatalogParity.test.js
```

Work:

1. Add `i18next` and `i18next-http-backend` as npm dependencies and sync their
   browser bundles plus licenses into `client/assets/vendor/i18next/`.
2. Implement the `i18next` adapter with manifest loading, namespace loading,
   fallback and interpolation.
3. Implement locale preference resolution.
4. Replace the hardcoded TH/EN selector with manifest-driven buttons/menu.
5. Dispatch the central language-change event.
6. Keep `getLocalizedLabel()` as a compatibility adapter.
7. Register vendor scripts before `i18nService.js` and before feature initialization in `client/index.html`.

### Phase 2: Application Shell and Shared UI

Files:

```text
client/index.html
client/app.js
client/shell/applicationShell.js
client/core/lightboxService.js
client/core/generationService.js
client/i18n/locales/*/common.json
client/i18n/locales/*/shell.json
client/i18n/locales/*/studio.json
```

Work:

1. Convert static shell text to `data-i18n` bindings.
2. Move shared actions, statuses, dialogs and accessibility labels to catalogs.
3. Replace direct language-pill listeners with the central event.
4. Preserve current form state and open accordion state during language change.

### Phase 3: Existing Feature Migration

Files:

```text
client/comparisons/*
client/scene-builder/*
client/visual-controls/*
client/clothing/*
client/i18n/locales/*/comparisons.json
client/i18n/locales/*/scene-builder.json
client/i18n/locales/*/character-builder.json
```

Work:

1. Move feature-local dictionaries into namespace catalogs.
2. Replace inline Thai/English branches with translation keys.
3. Keep prompt compilation output unchanged.
4. Add localized accessibility labels and empty/error/loading states.

### Phase 4: Community, Credits and Admin Readiness

Files:

```text
client/community/*
client/credits/*
client/admin/*
client/i18n/locales/*/community.json
client/i18n/locales/*/credits.json
client/i18n/locales/*/admin.json
```

Work:

1. Require translation keys for all new Community UI.
2. Map API error codes to localized messages.
3. Localize Community dates, counts, visibility and moderation statuses.
4. Record authored-content locale separately without translating user content.

### Phase 5: Additional Language

Use one additional locale such as `ja` or `ko` as the architecture proof:

```text
client/i18n/locales/ja/*
```

No application JavaScript should require modification. Only the locale
manifest and locale catalog files may change.

The Japanese catalogs in the foundation change are a structural proof only.
Keep `ja.enabled` set to `false` until Phase 2 and Phase 3 migrate every
visible shared and feature-specific UI string. An enabled locale must never
present a mixed Japanese/Thai/English experience to end users.

## 6. Impact and Migration Concerns

- The first implementation must preserve `window.state.language` because many
  existing modules still read it.
- Catalog loading is asynchronous; app initialization must wait for required
  namespaces before first render.
- Failed locale fetch must fall back to English without blocking the Studio.
- Re-rendering must not reset user selections, uploads, template workflow or
  active generation state.
- Locale JSON should be cached per session and not fetched on every render.
- Community content language is metadata, not a request to machine-translate
  creator content.
- Translation changes must not alter prompt snapshots or make old templates
  incompatible.
- Keep the selected `i18next` integration browser-native through self-hosted
  UMD bundles; do not introduce a framework or a CDN dependency.

## 7. Testing

### Automated

```text
TC-I18N-001 manifest default and fallback locales are valid
TC-I18N-002 every enabled locale contains every required namespace
TC-I18N-003 locale catalogs have key parity with English
TC-I18N-004 interpolation variables match across locales
TC-I18N-005 missing selected-locale key falls back to English
TC-I18N-006 unknown key returns the key and warns once
TC-I18N-007 setLocale updates state, storage, html lang and html dir
TC-I18N-008 language-change event contains old and new locale
TC-I18N-009 translation values cannot inject HTML
TC-I18N-010 locale formatting uses the selected locale
TC-I18N-011 legacy { en, th } labels continue to resolve
TC-I18N-012 AI prompt values remain unchanged when UI locale changes
```

### Manual

1. Change Thai to English while form selections and references are active.
2. Confirm selections, uploads, accordions and Template workflow remain intact.
3. Confirm shell, Studio, Scene Builder, Comparison and Community visible text
   changes without reload.
4. Confirm tooltips, placeholders and screen-reader labels change.
5. Simulate a missing Thai key and confirm English fallback.
6. Add a proof locale using only manifest/catalog changes.
7. Verify mobile and desktop layouts with long translated strings.

## 8. Definition of Done

- One manifest defines all supported locales.
- One service owns language state, translation lookup and language-change
  notification.
- Translation catalogs are organized by locale and feature namespace.
- A translator or AI agent can add a language by following `README.md`.
- Catalog parity and interpolation are machine-validated.
- Existing Thai and English behavior remains compatible during migration.
- Community-00-005 and subsequent UI requirements reference this localization
  contract for every new user-facing string.
- Provider prompt text and saved Scene Template prompts are unaffected by UI
  language changes.
