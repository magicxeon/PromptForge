# Story Country Style And Cast Picker

Date: 2026-09-11. Status: implemented; isolated automated and browser checks passed.
Primary: Product Requirement Architect. Review: UX and QA, sequential rather
than independent. Cinematic/media authority checks use design-cinematic-experience
and review-generative-media-pipeline; UX/QA use their existing Skills.

## 1. Country Style Contract

- Cinematic owns optional single `storyCountryStyle` in Setup. Default `none`
  preserves old drafts/projects. Choices: Thailand, South Korea, Japan, China,
  Europe, United States. Europe is a regional inspiration preset, not a nation;
  use the European flag as its visual symbol. Do not infer user nationality.
- Store IDs, defaults and concise storytelling guidance in the existing
  story-authoring JSON. Preserve ordered Genre, Audience Feeling and Pacing.
- Carry the ID through actor-scoped draft, save/reload, request/response schemas,
  enhancement/role analysis, Story Plan and Scene Direction. Country changes
  participate in existing stale-source detection; never auto-rewrite a saved
  story, approved plan or existing media.
- AI consumes configured guidance with the selected style. These are creative
  presets, not assertions about all films/people from a region. User premise,
  cast identity, setting, language, genre, feelings and ending remain authoritative.
  No automatic ethnicity, wardrobe, location or dialogue-language substitution.
- Unknown IDs fail validation. No new text provider, billing or prompt compiler.

## 2. Setup And Analysis Actions

- Place Story Country Style in Creative Intent using the existing ThemeSelect,
  with local flag images, translated labels and an explicit neutral option.
  Extend optional option icons without changing existing consumers.
- Generate enhanced preview uses the same Sparkles icon as Setup's Analyze story
  roles. Pending uses the shared ProcessingSpinner; preserve disabled/error,
  explicit Apply, qualification pricing and retry behavior.
- Analyze story roles uses the primary gradient button variant already used by
  Generate enhanced preview. Do not restyle sibling sections or other operations.

## 3. Look Sheet Filtering

- Generated Cast picker must request Look Sheets only, not all eligible images.
  Classify from persisted Generation metadata (`mode: character-sheet` or
  a persisted Look Sheet snapshot), never title/prompt keyword or visual guessing.
- Apply the category predicate before pagination within the existing owned
  history query. Bind cursor/cache scope to category. Generic First Frame
  pickers remain unrestricted by category.
- Retain owner, eligible Seedream 5.0, provider original, hash, expiry, rejection
  and 30-day checks. Selection metadata is not permission to bypass trust.
- New/replacement generated Cast assignments must validate category on server.
  Preserve already-bound legacy Cast direction edits and resolution; no backfill,
  deletion or live-data reclassification. Untagged historical images remain
  excluded from new selections, even if their pixels resemble a sheet.

## Ordered Tasks And Checks

1. Extend canonical JSON/normalizer and schemas; test neutral legacy defaults,
   invalid IDs and configured guidance at enhancement and plan boundaries.
2. Add Setup select/flags and action icon/color changes; test save projection,
   selection, disabled state, unchanged preview Apply and sibling actions.
3. Extend trusted-source query and category guard; test mixed categories,
   pagination, owner scope, generic picker parity and legacy binding compatibility.
4. Extend scripts/test-cinematic-directed-openings.mjs focused groups and `all`.
   Use isolated fixtures only, never paid calls, live writes or worker restarts.
5. Browser QA: EN/TH, 390/820/1440px, themes, selector open/closed, keyboard,
   flags rendered, modal actions and sheet-only selection. Record actual evidence
   and unverified live-provider storytelling quality here before closure.

## Ownership And Rollout

No new runtime data paths or file moves. Existing Cinematic Setup JSON receives
one additive ID. Generation owns filtering through TrustedGeneratedSourceService
and GenerationResultRepository. Local flags belong to client/assets/cinematic/flags.
Rollback can hide the optional control while preserving saved IDs; do not remove
the server category gate or reinterpret existing Cast bindings.

## Delivery Evidence

1. Configuration/schema task passed: legacy Setup defaults to `none`; server
   rejects unknown IDs; owned project save/reload and actor drafts retain IDs.
   Enhancement, Story Plan and Scene Direction provider doubles assert the
   selected ID and JSON-authored guidance. No paid provider call was made.
2. UX task passed: ThemeSelect uses optional decorative icons; six local SVGs
   render on Windows without emoji-font support. Analyze uses the primary
   gradient; only enhancement opts into Sparkles on ContextualOperationDock.
   Other operation icons and the shared pending spinner remain unchanged.
3. Picker task passed: category is filtered in HistoryRepository before the
   24-item page. A 60-record mixed fixture returns 24 then 6 sheets; a cursor
   cannot cross category scopes. New Cast rejects ordinary images, but legacy
   pinned Cast edits/resolution remain supported. Generic First Frame selection
   remains available. Titles/prompts are never used to classify an image.
4. Aggregate passed: picker 27, picker-ui 11, config 11, authoring 59,
   references 27, transport 47, workflow 20, UI 104 test executions (some tests
   deliberately repeat across owning groups), plus TypeScript no-emit.
   Translation catalogs and git diff --check passed. The pre-existing draft
   test used the former 600-character schema ceiling; its malformed-shape case
   now tests 10001 against the current 10000 schema bound. Server authoring
   configuration still enforces its 600-character Story Brief policy.
5. Browser QA passed: EN/TH at 390/820/1440, all three themes for country options,
   flag decoding, keyboard selection/reset, open/closed Creative Intent and
   analysis modal icon/gradient/Apply gate. Existing Scene Director checks pass.
   Separate Cast browser flow passes choose/save/replace and loading/empty/error;
   a deliberately mixed API fixture never displays its ordinary-image entry.
   Cast image pixels are fixture media, not provider-output quality evidence.

```text
node scripts/test-cinematic-directed-openings.mjs all
node scripts/validate-i18n-catalogs.js
node scripts/verify-cinematic-directed-openings.mjs
node scripts/verify-generated-cast-sheets.mjs
git diff --check
```

Browser prerequisites: installed Playwright Chromium and local source Vite
(default http://127.0.0.1:5173); APIs are intercepted. Screenshots in OS temp:
`mpf-directed-openings-3kehs2` and `mpf-direct-cast-BV3mVY`. Desktop/mobile country
menus and analysis modal were visually inspected. UX/QA review was sequential,
not independent. Source/category ownership, original-URL privacy and legacy
binding compatibility were checked without altering billing or provider rules.

No files moved, no live records changed, no worker/backend restart, no production
build performed. Restart the backend through the normal operator workflow to
load the changed JSON/API before live use; source UI is at
http://localhost:5173/create/cinematic. A previously built 6500 frontend requires
the normal frontend build/deployment to display source changes.

Remaining live UAT: choose each desired style, explicitly Generate enhanced
preview/Apply or Generate Plan and judge the narrative tone. Changing the selector
alone does not rewrite existing content. Untagged historical images remain absent
from new sheet selection; no automatic reclassification or provider approval is
claimed. No additional paid test is required to verify the UI/filter behavior.
