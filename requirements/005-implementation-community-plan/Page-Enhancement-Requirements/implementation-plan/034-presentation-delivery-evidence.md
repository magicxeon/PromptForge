# Presentation Delivery Evidence

Date: 2026-09-07. Parent: [023 coordinator](023-template-character-presentation-master.md).
Status: Implemented in ordered slices; fixture verification delivered. Live data
UAT and the explicitly deferred work below are not closed by fixture results.

## Delivery And Ownership

| Slice | Delivered | Evidence / remaining boundary |
|---|---|---|
| 024 data | Community facade batch preview endpoint, one family resolver, public media projection without promptPreview; versioned actor-scoped page queries and invalidation | CommunityTemplateDetail tests, useTemplatePreviews tests; actual user's three outputs not verified while local API is offline |
| 025 Gallery Featured | Compact existing header; original plus up to two real creations; distinct role labels and original-ID Use | TemplateFeatured tests; Gallery EN three-theme and TH narrow/wide screenshots |
| 026 Gallery cards | Portrait-left horizontal cards, public variation thumbnails, fee label, localized known taxonomy tags, preserved filters/pagination and reset | TemplateDiscoveryCard tests; existing query ownership retained; unknown tags omitted |
| 027 Photo original | Single contained original, original owner, lightbox, fee separated from generation quote, Save and canonical-link Share, closed technical disclosure | TemplateDetailRoute and TemplateDetailActions tests; browser Escape/focus-return checks; public input summary remains P-09 |
| 028 Photo creations | Separate contained image grid, distinct creators, like-only controls, server sort and explicit pagination | EngagementBar and Template Detail hook tests; existing Post preview preserved |
| 029 Character display | One pure display policy; selected work before fallback; owner/public sheets contained; bounded image fallback | characterDisplayImage and DisplayMediaImage tests; no source image rewritten |
| 030 Character consumers | Picker, selected left summary and right thumbnail use authorized display media; identity/version and actual reference remain separate | ReferenceSlotGrid, picker, recents, handoff policy tests; browser reference-processing/estimate payload excludes display artwork; owner list now batches featured-work projection |
| 031 Icons | Five supplied PNG alpha masks in existing ProviderMark, inherited accent, unknown/broken-image fallback | ProviderMark and directory tests; actual mask pixel checks at three sizes/themes |

Community visual files are in `web/src/features/community/components/templates/`.
Gallery CSS is **web/src/styles/template-gallery.css**, not the older guessed
community-discovery.css path. Detail CSS stays in template-detail.css.
Profiles owns characterDisplayImage.ts. Controlled fallback media is in
web/src/components/media/DisplayMediaImage.tsx; reference UI takes optional
display props and never writes them into the draft/compiler/provider contract.
Assets copied byte-for-byte to client/assets/providers; no moved source files,
new runtime data paths, migrations or provider settings.

## Character Consumer Audit

| Consumer | Disposition |
|---|---|
| CharacterLibraryPicker: Mine, Community, Current, Recent | Changed to shared display projection; recents remain IDs only |
| Owner Character list | Reconcile through existing Profiles featured-work projection in one page batch, not per-card detail calls |
| TemplateScenePanel | Changed selected artwork; existing server handoff and eligibility retained |
| SceneBuilderRoute / GenerationExperience / ReferenceSlotGrid | Optional reference-matched display binding; authorized summary loaded by actor + Character ID and checked against version; replacement/removal clears context |
| CharacterCard in CreatorProfileRoute and Fashion directory | Shared source precedence; centered fallback; same links and actions |
| CharacterDiscoveryCard | Existing helper delegates to shared projection; approved gallery layout unchanged |
| CharacterGalleryHero | Already gallery-only selected work; no sheet substitution in identity circles |
| CharacterPortrait (public gallery) | Existing controlled portrait and layout retained |
| Fashion ReferenceSlotGrid | Actual-input inspector; no display override supplied, defaults unchanged |
| Playground / Comparison / other Studio modes | Shared GenerationExperience defaults unchanged, no unsolicited Character artwork injected |
| CinematicStageContent local CharacterPortrait/casting | Different casting snapshot owner; unchanged actual casting preview, outside this release |

Source-crop diagnosis: CharacterCastingExportService's fixed sheet-region crop
can contain off-center pixels. CSS centering cannot repair that image. Existing
authorized front/portrait fallbacks are contained; per-image crop repair remains
P-06. No export, canonical sheet, owner selection or source bytes were modified.

## Focused Tests

Use `node scripts/test-template-presentation.mjs --part=<group>`:

| Group | Observed result |
|---|---|
| template-data | 29 Community service tests plus route ownership subset pass; 8 preview/Detail hook and 2 moderation invalidation tests pass; includes bounds, prompt omission, actor switch, focus refresh and retry |
| template-featured | 2 tests pass |
| template-catalog | 2 tests pass |
| photo-original | 6 original/detail + 3 Save/Share tests pass, including known/unknown tag assertion |
| photo-creations | 15 tests pass |
| character-display | 3 resolver, 1 bounded fallback and 3 existing discovery projection tests pass; Profiles sharing 20/20 and destination handoff 3/3 pass |
| character-consumers | 7 tests pass |
| provider-icons | 11 tests pass |
| compatibility | 14 server + 28 UI tests pass: input policy, derived prompt privacy, duplicate publication, handoff, Home and routes |
| build | TypeScript, EN/TH catalog validation and Vite build pass; scoped lint has no errors, existing SceneBuilder initial-useMemo warning retained |

Groups are explicit, fail-fast and timed. `--part=all` is an opt-in aggregate
for later UAT/pre-production, with deduplicated tests and one build before
visuals. It is not a full repository suite or paid-provider run. `--part=visual`
checks build freshness and accepts `--scope=gallery|photo|character|icons|all`.
Gallery/Photo/Icon runner accepts `--stress` for 320/1920 and `--locale=th`.

An accidentally broad lint invocation exposed pre-existing unrelated Admin/
Generation errors; those files were not edited. The corrected scoped lint passed.
No live create, like, save, publish, paid generation or worker startup was used.

## Performance Evidence

Fixed synthetic batch, first three public outputs per root:

| Roots | History lookups | JSON bytes | Sample domain duration |
|---|---|---|---|
| 1 | 1 | 4,829 | 8.87ms |
| 12 | 1 | 57,851 | 1.34ms |
| 24 | 1 | 115,703 | 1.44ms |

Cold/warm timings are not production latency claims. Previous per-card calls
would repeat the same full JSON/history scan; the new batch does it once.
The underlying public-post scan remains, and production-scale indexing is not
part of this UI change. Cache: existing TanStack GC, 30s staleTime, actor + IDs +
v1 key, client mutation invalidation and stale refocus; no polling or durable
media cache. Remote visibility changes are rechecked on the next read, not
promised to disappear instantly across clients.

## Browser Evidence

All paths below are local temporary screenshots from intercepted fixtures:

- Gallery EN 390/820/1440, three themes, final build: `C:/Users/punya/AppData/Local/Temp/template-presentation-SFErbJ`.
- Gallery TH 320/1920: `C:/Users/punya/AppData/Local/Temp/template-presentation-sBtLO8`.
- Photo EN 390/820/1440, three themes: `C:/Users/punya/AppData/Local/Temp/template-presentation-bKSvxv`.
- Photo TH 390/820/1440, three themes and lightbox focus: `C:/Users/punya/AppData/Local/Temp/template-presentation-K5mRxP`.
- Photo EN 320/1920: `C:/Users/punya/AppData/Local/Temp/template-presentation-pY71Qi`.
- Scene/picker EN 390/820/1440, three themes: `C:/Users/punya/AppData/Local/Temp/template-scene-layout-4x3uBT`.
- Scene/picker/selected TH 390/820/1440, three themes: `C:/Users/punya/AppData/Local/Temp/template-scene-layout-Nj8zfO`.
- Landing icons EN 390/820/1440, three themes, mask pixels: `C:/Users/punya/AppData/Local/Temp/template-presentation-sJwqGC`.

Checks reject horizontal overflow, broken images and nested interactive targets.
Icon pixel checks account for alpha antialiasing and compare against actual
resolved theme color, not DOM presence only. Existing provider expansion works.
Screenshots inspected for Gallery/Photo/Icons and the Thai Character picker; scene tiny previews have matching
artwork labels and canonical mock request evidence.

## Review And Open Evidence

Primary implementation owner applied Product/UX gates. An independent QA agent
reviewed Community data/actions and then Character/icon boundaries. Findings
addressed: preview cache invalidations, stale focus refresh, prompt omission,
localized tags, owner-sheet fit, owner-list featured-artwork parity.
Owner-list review additionally found a deletedAt-only featured-post gap; the
Profiles resolver now excludes it. Seven new owner-list visibility/canonical
reference cases are included in the 20 passing sharing tests.
QA implemented its own focused corrective slice; its subsequent review is not
claimed independent of that slice. Main agent reran selected regression gates.

The supplied live URL could not connect at final read-only check:
`http://localhost:6500/explore/templates/post_1786716962811_vz14fvt1`.
Therefore the three reported real creations and each existing off-center source
have not been certified. No backend was restarted. User can review after starting
the local app with current server code. P-01..P-11 in requirement032 remain
deferred, especially source crop repair, asset redistribution rights, global
footer, public input-policy exposure and BytePlus work.

Remaining extended UAT: full Scene reload/back/actor/upload matrix with actual
authorized media; broken authenticated-media 403/404/late-response integration;
all long-Thai/broken-media combinations and server-scale measurements. Current
fixture success is not a claim of completing those live/source checks.

Rollback is slice-local code/CSS/asset reversal only. Do not delete runtime work,
change providers, regenerate images or rewrite approved references.

## Follow-Up: Compact Gallery Header And Featured Emphasis

2026-09-07; requirement025 TGF-06..10, plan026 V-01..05. This local CSS follow-up
uses base-implementation-owner with self-review, not an independent QA claim.

- Removed the Template-only inherited description width cap, reduced copy/title/
  action spacing, and retained natural wrapping and the two existing actions.
- Featured retains one 8px rounded frame with a stronger theme accent border.
  Its 135-degree upper-left gradient fades across/down into the surface; the
  copy is transparent and images receive no new overlay or asset transformation.
- Warm Featured eyebrow and scoped primary Use button improve hierarchy without
  changing component contracts, disabled state, routes, fee, data or providers.
- No sibling style changes: discovery steps, catalog, filters and tutorials stay
  in their previous positions and retain their actions. No new/moved files or
  persistence paths. Only template-gallery.css changes runtime presentation.

Passed focused commands:

```sh
node scripts/test-template-presentation.mjs --part=template-featured
node scripts/test-template-presentation.mjs --part=template-catalog
# From web/: node ../node_modules/vite/bin/vite.js build
node scripts/test-template-presentation.mjs --part=visual --scope=gallery
node scripts/test-template-presentation.mjs --part=visual --scope=gallery --locale=th --stress
```

Component results: 2 Featured + 2 catalog tests passed. Vite build passed.
Gallery browser gates passed all 390/820/1440 x three themes and Thai 320/1920:
no document overflow, broken images, nested interactive elements, action escape
or missing sibling sections. Desktop fixture header height is 145px; description
uses the full available width. Added checks assert these properties plus the
rounded gradient frame and transparent copy. Existing aggregate runner includes
these Gallery checks; no system-wide test or paid generation was run.

Screenshots (including first-viewport captures):

- EN/theme matrix: `C:/Users/punya/AppData/Local/Temp/template-presentation-8Ns1Jb`.
- Thai narrow/wide: `C:/Users/punya/AppData/Local/Temp/template-presentation-HNgNpc`.

Inspected desktop Neon, mobile Neon, tablet Pearl and narrow Thai screenshots.
Scoped diff whitespace check passed. Read-only localhost:6500 connectivity check
still failed, so real API/source-media UAT is unchanged and remains pending.

## Revision Delivery: Right-75-Percent Template Family Hero

2026-09-07; requirement025 TH-01..07, plan026 H-01..06. UX implementation and
QA review were applied sequentially by the same agent; review independence is
limited. Protected behavior inventory: Featured selection, imagery, price and
handoff; discovery steps, catalog/filter actions, tutorials; shared Comparison
and Landing hero defaults; public-preview batch/cache/visibility ownership.

New Community files:

- web/src/features/community/components/templates/TemplateGalleryHero.tsx
- web/src/features/community/components/templates/TemplateGalleryHero.test.tsx
- web/src/features/community/components/templates/templateHeroSelection.ts
- web/src/features/community/components/templates/templateHeroSelection.test.ts

TemplateGalleryRoute now composes this controlled header from the existing
actor-scoped preview batch. No new API, storage, provider, Credit or mutation
path. All images come from one canonical public Template family. Selection
needs three distinct usable creations, excludes the original from the count,
keeps the first eligible current result, and retains server like order with the
top creation beside the far-right Original. Missing/ineligible data uses the
previous compact header; no unrelated cached family is substituted.

Desktop illustrated header is 340px tall; the right media band measures 75%
of the header. A theme-tinted dark diagonal layer plus a mask on images only
blends the left edge. Original title/link remains above decoration. Mobile
shows Original plus the top creation and moves copy below the overlapping media.
Featured and sibling styling is unchanged by this revision.

Validation / traceability:

- TH-01/05: templateHeroSelection.test.ts, 4 tests; threshold, duplicate/private/
  removed/missing-image records, unavailable root, filter/empty/cache isolation.
- TH-03/06: TemplateGalleryHero.test.tsx, 2 tests; rightmost Original, creation
  order, detail/create/browse destinations and compact rerender. Existing
  Featured 2 tests and catalog 2 tests also passed separately.
- TH-02/04/07: Gallery-only Playwright checks at 390/820/1440 x three themes;
  measured 75% band, Original at right, mobile visible-image count, no hard clip,
  contained controls, clickable detail link, keyboard focus, sibling presence,
  no document overflow/broken media/nested interactive controls or page errors.
- Thai 320/1920 checks passed. Fewer-than-three fallback browser checks passed
  at 320/1920 with --hero-creations=2. Component tests also cover zero/one images.
- TypeScript build check, scoped ESLint, Vite build, script syntax and
  git diff --check passed. No localization keys changed. No full-system suite
  or paid generation was run.

Focused execution entry points:

```sh
node scripts/test-template-presentation.mjs --part=template-hero
node scripts/test-template-presentation.mjs --part=template-featured
node scripts/test-template-presentation.mjs --part=template-catalog
node scripts/test-template-presentation.mjs --part=visual --scope=gallery
node scripts/test-template-presentation.mjs --part=visual --scope=gallery --locale=th --stress
node scripts/test-template-presentation.mjs --part=visual --scope=gallery --hero-creations=2 --stress
```

The new --part=template-hero group is included automatically in --part=all;
build first before visual checks. Final fixture screenshot evidence:

- EN/theme matrix: C:/Users/punya/AppData/Local/Temp/template-presentation-1E15lI
- Thai narrow/wide: C:/Users/punya/AppData/Local/Temp/template-presentation-Hx8pzt
- Compact fallback: C:/Users/punya/AppData/Local/Temp/template-presentation-2W9jDR

Desktop Neon, tablet Pearl and mobile/Thai screenshots were inspected. Review
found the decorative mask originally dimmed the mobile Original link; the mask
now applies only to images, with link hit-testing and keyboard-focus assertions.

Live Comparison was read during design discussion. Final read-only Template
Gallery verification was attempted with non-GET API calls blocked, but port6500
refused the connection. No backend restart or live data mutation was performed.
Decision: fixture gates pass; live family/source-media UAT remains pending.
Global hero pinning and all previously documented unrelated gaps remain deferred.
