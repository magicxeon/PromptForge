# Community-00-004 Ownership, Visibility Policy and Public Snapshot

**Status:** Implemented - Validation Pending
**Feature type:** Authorization, privacy and public read model contract  
**Depends on:** Actor Context, repository schema, Scene Builder reference policy  
**Created:** 2026-07-19

## 1. Business Requirement

Community must let users share and remix work without leaking private prompts, references or generated assets. Ownership and visibility must be enforced on the server before public Community screens are built.

## 2. System Design

### 2.1 Ownership Policy

Ownership fields:

```text
ownerUserId
creatorProfileId
sourceGenerationResultId
sourceAssetId
```

Rules:

- Owners can edit presentation fields of their own drafts/posts.
- Owners cannot mutate immutable published snapshots except by creating a new revision.
- Viewers can read only public/unlisted allowed fields.
- Admin/support can hide/remove with audit reason.
- Community does not grant access to the original private generation result.

### 2.2 Visibility Policy

```text
private
unlisted
public
```

Status:

```text
draft
published
reported
hidden
removed
owner_unpublished
```

Rules:

- `private` is owner/admin only.
- `unlisted` requires direct link and still returns sanitized public data.
- `public` can appear in feed, gallery and creator profile.
- `hidden` and `removed` are excluded from feed/trending.
- `removed` returns generic unavailable state for non-admin viewers.

### 2.3 Public Snapshot Contract

Public APIs must return read models, not raw records:

```text
CommunityPostPublicView
- id
- creator
- title
- description
- imageUrl
- thumbnailUrl
- officialTags
- customTags
- promptVisibility
- promptPreview
- providerModelDisplay
- remixAvailability
- templateAvailability
- counts
- createdAt
```

Must not expose:

- private source asset URL
- base64 image data
- raw provider payload
- API keys
- hidden prompt sections
- owner private reference image URLs
- billing ledger details

### 2.4 Scene Builder Reference Policy Compatibility

Use the policies from Scene-007:

```text
required_user_replacement
shared_preview_only
shared_as_reusable_reference
not_shared
```

Rules:

- Face/character references default to `required_user_replacement`.
- Style references may be `shared_as_reusable_reference`.
- Preview-only assets are visible only as sanitized thumbnails and must not be sent to providers for another user.

## 3. Software Development Specification

### Owning Files

```text
server/domain/community/communityPostPolicy.js
server/domain/community/communityPostPublicView.js
server/domain/community/CommunityPostAccessService.js
server/domain/community/CommunityShareService.js
server/domain/scene-templates/sceneReferenceSlotPolicy.js
server/domain/scene-templates/sceneTemplateSanitizer.js
server/repositories/community/CommunityPostRepository.js
server/repositories/audit/AuditLogRepository.js
server/app/routes/sceneTemplateRoutes.js
server/app/routes/generationRoutes.js
server/domain/generation/generationRequestService.js
test/communityOwnershipPolicy.test.js
test/communityPublicSnapshot.test.js
test/sceneReferenceSlotPolicy.test.js
```

`server/domain/community/` owns authorization decisions and public read-model
construction. `server/repositories/community/` owns only persistence mutation.
Routes must never return a raw community post record to a non-owner-facing
Community endpoint.

### Process

1. Route receives actor context.
2. Service loads raw record.
3. Ownership policy checks action permission.
4. Visibility policy checks read permission.
5. Sanitizer builds public read model.
6. Route returns sanitized read model only.

## 4. Implementation Plan

1. Add ownership and visibility policy services.
2. Add public snapshot sanitizer.
3. Update Community post/template/gallery services to call policy services before returning data.
4. Reuse Scene Builder reference policy for template handoff.
5. Add tests for owner, viewer and admin reads.

### 4.1 Implemented API Contract

```text
GET   /api/scene-templates/shared
GET   /api/scene-templates/shared/:postId
GET   /api/scene-templates/shared/:postId/image
GET   /api/scene-templates/shared/:postId/thumbnail
POST  /api/scene-templates/shared/:postId/use-template
PATCH /api/scene-templates/shared/:postId
POST  /api/scene-templates/shared/:postId/moderate
```

- The two `GET` endpoints return `CommunityPostPublicView` only.
- `imageUrl` and `thumbnailUrl` in that view are controlled Community media
  endpoints. They do not reveal the original `/outputs/...` source URL.
- `use-template` loads the raw record inside the domain service, checks the
  actor and emits a separately sanitized Scene Builder snapshot.
- `PATCH` accepts only presentation fields: title, description, tags,
  categories and visibility. It cannot alter a published snapshot.
- `moderate` accepts `{ action: "hide" | "remove", reason }`, requires an
  `admin` or `support` actor, persists moderation metadata and appends an
  audit event.

### 4.2 Snapshot Boundary Rules

- Ownership is evaluated using `ownerUserId` first, with `ownerUsername` only
  as a compatibility fallback for existing local data.
- Public request payloads never grant ownership based on client-supplied
  `sourceOwnership`. Generation sanitizes template references as cross-user
  unless a future server-issued capability proves the relationship.
- `shared_preview_only` keeps a `thumbnailUrl` for UI display only; it removes
  source IDs and `imageUrl` from both mapping and variable defaults.
- `not_shared` and `required_user_replacement` remove all asset identifiers.
- Only an explicit `shared_as_reusable_reference` can retain a provider-usable
  reference for another user.

### 4.3 Localization Implementation Decision for Public Community UI

This section resolves the implementation questions for the user-facing
Community read model and template-sharing UI. The canonical localization
contract is:

```text
requirements/005-implementation-community-plan/
  Community-00-006-localization-and-language-extension-foundation.md
```

All Community UI implemented from this requirement must follow that contract.

#### Questions Resolved

**Question: Can a library be used instead of implementing the full i18n engine
manually?**

Yes. Use:

```text
i18next
i18next-http-backend
```

Do not introduce React-specific packages. Do not introduce a build tool only
for localization.

`i18next` owns:

- translation lookup;
- fallback language;
- namespace resource store;
- interpolation;
- plural selection;
- language changes.

`i18next-http-backend` owns:

- browser loading of namespace JSON through `fetch`/XHR;
- `loadPath` resolution;
- browser HTTP cache participation;
- catalog version query parameters.

ModelPromptForge must still provide `client/core/i18nService.js` as an
application adapter. Feature modules call the adapter and must not call the
global i18next instance directly. This keeps library replacement possible and
provides one place for DOM bindings, preference persistence and the
`modelpromptforge:languagechange` event.

Official references:

```text
https://www.i18next.com/
https://www.i18next.com/how-to/add-or-load-translations
https://github.com/i18next/i18next-http-backend
```

**Question: How are Translation Catalog files loaded in a Vanilla JavaScript
application?**

Use asynchronous namespace loading with caching.

Initial application boot loads:

```text
manifest.json
common.json
shell.json
studio.json
```

Feature namespaces load only when first used:

```text
Scene Builder      -> scene-builder.json
Character Builder  -> character-builder.json
Comparisons        -> comparisons.json
Community          -> community.json
Credits            -> credits.json
Admin              -> admin.json
```

The application must await the initial namespaces before first user-facing
render. This prevents translation keys or fallback text flashing on screen.

`i18next` provides an in-memory resource store. The browser provides HTTP
caching. Do not add LocalStorage catalog caching in the first implementation;
LocalStorage is used only for the selected locale. Catalog versioning is sent
as a query parameter:

```text
/i18n/locales/th/community.json?v=<catalogVersion>
```

When changing language:

```text
load active namespaces for requested locale
  -> if successful, call changeLanguage()
  -> update state/localStorage/html lang/html dir
  -> translate static bindings
  -> dispatch modelpromptforge:languagechange
```

If the requested locale fails to load, keep the current locale active and show
a localized non-blocking error. Do not leave the page partially translated.

**Question: Should browser bundles be loaded from a CDN?**

No for the production path. Pin library versions in `package.json` and
`package-lock.json`, then self-host the browser bundles. A CDN may be used only
for an isolated prototype and must not remain in the release implementation.

Canonical self-hosted runtime files:

```text
client/assets/vendor/i18next/i18next.min.js
client/assets/vendor/i18next/i18nextHttpBackend.min.js
client/assets/vendor/i18next/LICENSE-i18next.txt
client/assets/vendor/i18next/LICENSE-i18next-http-backend.txt
```

Add a deterministic maintenance script:

```text
scripts/sync-i18next-browser-assets.js
```

The script copies the pinned browser distributions and license files from
`node_modules` into `client/assets/vendor/i18next/`. Do not manually edit the
vendored minified files.

#### Required Dependencies

Update:

```text
package.json
package-lock.json
```

Dependencies:

```text
i18next
i18next-http-backend
```

Use exact compatible versions recorded by `package-lock.json`. The
implementation agent must verify the copied browser distribution paths against
the installed package contents instead of assuming an undocumented path.

#### Runtime Script Order

`client/index.html` must register localization dependencies before application
initialization:

```text
client/assets/vendor/i18next/i18next.min.js
client/assets/vendor/i18next/i18nextHttpBackend.min.js
client/core/studioState.js
client/core/localePreferenceService.js
client/core/i18nService.js
feature modules
client/app.js
```

`i18nService.js` may be loaded after `studioState.js` so that compatibility
state exists, but `initApp()` must await `ModelPromptForgeI18n.initialize()`
before rendering localized UI.

#### i18next Configuration Baseline

Use the following behavior. Exact syntax may be adjusted only where required
by the pinned library version.

```js
await window.i18next
  .use(window.i18nextHttpBackend)
  .init({
    lng: selectedLocale,
    fallbackLng: manifest.fallbackLocale,
    supportedLngs: enabledLocaleCodes,
    load: "currentOnly",
    ns: ["common", "shell", "studio"],
    defaultNS: "common",
    returnNull: false,
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: "/i18n/locales/{{lng}}/{{ns}}.json",
      queryStringParams: {
        v: manifest.catalogVersion
      },
      requestOptions: {
        credentials: "same-origin",
        cache: "default"
      },
      maxRetries: 1
    }
  });
```

Security rule:

- `escapeValue: false` is permitted only because translation output must be
  assigned through `textContent`, `placeholder`, `title`, `aria-label` or
  another safe DOM property.
- Translation output must not be assigned to `innerHTML`.
- Catalog validation must reject HTML tags.

Use `load: "currentOnly"` rather than `languageOnly` so future locales such as
`zh-Hans` are not incorrectly collapsed to `zh`.

#### Application Adapter Contract

Implement:

```text
client/core/i18nService.js
client/core/localePreferenceService.js
```

Required adapter API:

```text
initialize(options)
setLocale(localeCode)
getLocale()
getSupportedLocales()
loadNamespaces(namespaceNames)
t(key, variables, options)
has(key, localeCode)
formatNumber(value, options)
formatDate(value, options)
subscribe(listener)
translateDom(rootElement)
```

Compatibility:

```text
window.getLocalizedLabel()
```

must remain available and resolve:

```text
translation key
  -> existing inline locale object
  -> English inline value
  -> stable ID or empty string
```

New Community modules use translation keys. They must not add new
`language === "th" ? ... : ...` conditions.

#### Community Namespace Keys

Create at minimum:

```text
client/i18n/locales/en/community.json
client/i18n/locales/th/community.json
```

Initial key coverage:

```text
community.sharedTemplates.title
community.sharedTemplates.empty
community.sharedTemplates.creator
community.sharedTemplates.refresh
community.template.use
community.template.loadConfirm
community.template.loadError
community.template.previewOnly
community.post.unavailable
community.post.visibility.private
community.post.visibility.unlisted
community.post.visibility.public
community.moderation.hide
community.moderation.remove
community.moderation.reasonRequired
```

API error codes must be mapped to catalog keys. Server messages remain English
fallbacks and logs; server code does not select the UI locale.

#### Implementation Files

New:

```text
client/core/i18nService.js
client/core/localePreferenceService.js
client/i18n/README.md
client/i18n/manifest.json
client/i18n/schema/locale-manifest.schema.json
client/i18n/schema/translation-catalog.schema.json
client/i18n/locales/en/common.json
client/i18n/locales/en/shell.json
client/i18n/locales/en/studio.json
client/i18n/locales/en/community.json
client/i18n/locales/th/common.json
client/i18n/locales/th/shell.json
client/i18n/locales/th/studio.json
client/i18n/locales/th/community.json
client/assets/vendor/i18next/*
scripts/sync-i18next-browser-assets.js
scripts/validate-i18n-catalogs.js
test/i18nService.test.js
test/i18nCatalogParity.test.js
```

Modify:

```text
package.json
package-lock.json
client/index.html
client/app.js
client/core/studioState.js
client/shell/applicationShell.js
client/scene-builder/sharedTemplatesPanel.js
server/app/createApp.js
requirements/007-technical-dept/000-master.md
```

`requirements/007-technical-dept/000-master.md` must document ownership of
`client/i18n/` and `client/assets/vendor/` before those folders are created.

#### Ordered Implementation Plan

1. Update architecture ownership documentation for i18n source and vendored
   browser assets.
2. Add pinned npm dependencies.
3. Add and run the vendor synchronization script.
4. Add locale manifest and catalog schemas.
5. Add English/Thai baseline namespaces and translator README.
6. Implement preference resolution and i18next adapter.
7. Await localization initialization during app boot.
8. Render the language selector from the locale manifest.
9. Keep `window.state.language` and `window.getLocalizedLabel()` compatible.
10. Migrate the application shell and Shared Templates panel first.
11. Replace feature modules gradually by namespace.
12. Add catalog parity, interpolation and fallback tests.
13. Verify that switching locale does not reset Studio state, references,
    Template workflow, queue or history.

#### Gemini AI Implementation Constraints

- Do not replace prompt text with translated strings.
- Do not modify provider-facing prompt compilation behavior.
- Do not translate creator-authored titles, descriptions or prompts.
- Do not add a second language state outside the adapter and existing
  compatibility state.
- Do not embed all locales into JavaScript.
- Do not fetch every locale at startup.
- Do not directly depend on `#language-pill-selector` from feature modules.
- Do not use `innerHTML` for translated catalog values.
- Do not remove Thai/English inline label compatibility in the first pass.
- Do not implement the entire application migration in one unreviewable file.
- Preserve current UI selections and active workflows across locale changes.

#### Localization Acceptance Tests

```text
TC-I18N-001 initial boot loads common, shell and studio only
TC-I18N-002 Community namespace loads once on first Community use
TC-I18N-003 repeated namespace request uses the resource cache
TC-I18N-004 language switch loads active namespaces before DOM update
TC-I18N-005 failed locale load keeps the previous language
TC-I18N-006 missing Thai key falls back to English
TC-I18N-007 zh-Hans remains zh-Hans with currentOnly loading
TC-I18N-008 language selector is generated from manifest entries
TC-I18N-009 Community public-view labels use community catalog keys
TC-I18N-010 API error code maps to localized client message
TC-I18N-011 translated values cannot inject HTML
TC-I18N-012 locale switch preserves Studio and Template state
TC-I18N-013 legacy { en, th } metadata remains readable
TC-I18N-014 prompt output is identical before and after UI locale switch
```

## 5. Testing

```text
TC-00-004-001 owner can view private post
TC-00-004-002 other user cannot view private post
TC-00-004-003 public post hides private prompt fields
TC-00-004-004 preview-only reference does not become generation payload
TC-00-004-005 hidden post excluded from feed
TC-00-004-006 admin hide requires audit reason
```
