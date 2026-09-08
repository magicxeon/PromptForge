# Publication And Character Continuity Delivery Plan

Parent: [033](../033-publication-and-character-continuity-master.md).
Status: Requirements 034-037 implemented after authorization, 2026-09-08.
Focused deterministic checks and responsive fixtures are the implementation gates;
live publishing and paid perceptual UAT are explicitly separate, still pending.

## Ordered Tasks

| Step | Tasks | Requirement / acceptance | Gate |
|---|---|---|---|
| 00 | Review current versus proposed flows; resolve Template privacy, labels and legacy-data scope | 033/037 decisions | User discussion; pending choices stay held |
| 01 | Add source-inspected fixtures for public hero image, missing Character context, sharing defaults and current reuse guards | Baseline in 033 | Reproduce failures without live data mutation |
| 02 | Update ordinary image private defaults across shared form, schema, draft and publish; preserve explicit/derived/legacy policies | PVT-01..05 | privacy group; Template compatibility decision required before relevant UI |
| 03 | Preserve feed entries despite editorial placement; refresh scoped queries after publish | DISC-01/02/04/05 | discovery group; pagination/filter/privacy regressions |
| 04 | Add approved post-action destinations and already-shared recovery through existing status/publication contracts | DISC-03 and approved 037 | share-ui group; permission and stale/partial-failure tests |
| 05 | Trace Character source selection -> request -> saved result -> public/owner work; fix verified linkage gaps | LIN-01..04 | lineage group, one consumer at a time |
| 06 | Define versioned identity metadata and preserve source attrs through Face -> Sheet -> Profile | ID-01/02/07/08 | identity-storage group; immutable legacy fixtures |
| 07 | Integrate identity directive into canonical compilation/refinement and each supported reuse consumer | ID-03..06 | identity-prompt group plus reference/estimate parity |
| 08 | Implement only approved flow presentation / normal Scene picker slice | approved 037 scope | flow-ui group + scoped responsive checks |
| 09 | Review evidence, remaining legacy gaps, focused aggregate and owner UAT checklist | all implemented ACs | QA/privacy; no automatic live/paid calls |

Legacy repair LIN-05 is separate and pending explicit approval/dry-run evidence.
Approval-time crop changes remain deferred: inspect actual source and approve a
display/export-specific requirement before changing pixels. Do not infer closure
from new picker, feed or identity tests.

## Focused Test Entry Point

scripts/test-publication-character-round.mjs now exists as a thin owning runner.
Implemented groups below are selectable independently. Storage/prompt identity
checks share one short identity group; no broad system test is required.

```sh
node scripts/test-publication-character-round.mjs privacy
node scripts/test-publication-character-round.mjs discovery
node scripts/test-publication-character-round.mjs share-ui
node scripts/test-publication-character-round.mjs compatibility
node scripts/test-publication-character-round.mjs static
node scripts/test-publication-character-round.mjs lineage
node scripts/test-publication-character-round.mjs identity
node scripts/test-publication-character-round.mjs flow-ui
node scripts/test-publication-character-round.mjs layout
node scripts/test-publication-character-round.mjs layout-flow
node scripts/test-publication-character-round.mjs all
```

Prerequisites: installed root/web packages, supported Node and Playwright Chromium
for layout. Windows may require permission for Vite/TypeScript temporary files
and browser subprocesses. Unknown group/nonzero test
must fail. No default full aggregate; all is explicit. No live runtime JSON,
secrets, external provider, Credit mutation, workers or database needed. Layout
uses isolated browser request interception and screenshots, not live publication
requests. The layout group builds current web/dist first; no dev server required.
layout-flow requires that current build and checks Template Scene, normal Scene,
owner Character settings and Community feed. Individual screen commands:
`node scripts/verify-publication-character-layout.mjs scene|profile|feed` (choose
one literal scope). Each runs only intercepted local fixtures, not the live API.
Existing reuse candidates: test-template-derived-sharing.mjs,
test-template-scene.mjs, test-character-discovery.mjs and focused compiler tests.
Inspect their side effects before composing; do not invoke broad runners blindly.

Each UI group checks loading/error/empty/stale/unauthorized and adjacent actions.
Layout checks 390/820/1440, EN/TH, existing themes and keyboard focus. Cover image
selection must not alter canonical reference; sharing must not change Character
rights; identity additions must not change quotes/credits or trusted-video policy.
Provider likeness UAT remains a separately approved model/budget exercise.

## Rollout, Rollback And Evidence

- Release source/UI slices only after their own tests pass; no runtime migration
  is assumed. Preserve existing post policies and approved Character versions.
- Coordinate privacy defaults with Template eligibility and consent. Do not ship
  a selectable Template action that inevitably fails on the new default.
- Roll back UI/cache changes independently; retain saved provenance/identity
  data, derived-image guards and duplicate constraints. No destructive rollback.
- For each task record changed files, test command/count/result, screenshot
  evidence, scope review and unverified runtime behavior here before closing it.
- Original documentation checks covered links, paths and whitespace. Requirement
  034 historical evidence is recorded below; 035-037 delivery follows it.

## Requirement 034 Delivery (2026-09-07)

- Step 00: smallest existing-rights Template policy selected; broader flow pending.
- Step 01: sharing default/capability/negative fixtures done; Gallery/lineage
  fixtures remain for requirement 035, not completed by this slice.
- Step 02: complete. Steps 03-09 not started except reusable test infrastructure.
- `privacy`: PASS 21 tests. `share-ui`: PASS 12 tests.
- `compatibility`: PASS 36 server + 10 UI tests (79 total across groups).
- `static`: PASS TypeScript/i18n. Scoped ESLint and git diff --check passed.
- `layout`: PASS web build + 36 intercepted browser cases. Existing Vite large
  bundle warning remains unrelated to this scoped change.
- Screenshots: C:/Users/punya/AppData/Local/Temp/private-sharing-layout-cjomyV
  and C:/Users/punya/AppData/Local/Temp/derived-sharing-layout-WVHWSF.
- Production/UI owners: CommunityShareService, shareApi, ShareGeneratedDialog;
  additive allowedTemplatePromptVisibilities in owner draft, no public or
  persistence-schema change. Existing EN/TH react-ui namespace extended.
- New files: scripts/test-publication-character-round.mjs,
  scripts/verify-private-sharing-layout.mjs and Profiles-independent Community
  API test web/src/features/community/api/shareApi.test.ts. No moved files.
- No live publish, provider calls, runtime JSON edits or worker restart. Browser
  navigation covers Recent + shared dialog fixtures; every live caller was not
  separately exercised. Sequential review, not an independent agent review.
- `all` is available for later explicit UAT/prebuild; groups were run separately
  this round. It aggregates implemented groups only, not future requirements.
- Final local API health check: port 6500 unavailable. Frontend-only Vite started
  at http://127.0.0.1:5173 (PID 8292); backend/workers intentionally not started.
  Live owner use needs the normal scripts/start-dev.bat startup. Layout evidence
  above does not depend on a live API and does not certify live publication.

## Requirements 035-037 Delivery (2026-09-08)

| Steps | Implemented result | Focused evidence |
|---|---|---|
| 00-02 | Existing private default retained; Template requires explicit compatible policy | privacy 21 tests; share-ui 13 tests |
| 03 | Editorial images remain in feed; duplicate page entries are merged by ID, filters retained | discovery 7 tests |
| 04 | Owner share status returns a safe destination; scoped query refresh and saved-Template recovery | share-ui; privacy; compatibility 36 server + 10 UI tests |
| 05 | Shared Scene picker; canonical handoff and stable-ID reload for normal/Template contexts | lineage 27 tests; flow-ui; Template Scene fixture |
| 06-07 | Schema-2 identity, owned Face inheritance, immutable Profile version fields, canonical compiler/refinement guard | identity 27 tests; lifecycle/destination tests |
| 08 | Publish image versus Template draft; Copy link versus Visibility & reuse; owner metadata gaps | flow-ui 22 tests; Scene/Profile responsive fixtures |
| 09 | Scoped diff, TypeScript, locale parity, lint and fixture review | Sequential QA/privacy, not independently reviewed; live UAT open |

New source: `web/src/features/scene-builder/components/SceneCharacterSelector.tsx`.
New tests: `test/characterIdentityRetention.test.js` and
`web/src/features/community/hooks/useCommunityDiscoveryPosts.test.tsx`.
New layout runner: `scripts/verify-publication-character-layout.mjs`.
All files use existing capability ownership; no moved files or new runtime directory.

Additive storage/contract changes:
- Existing Character Profile version identityMetadata adds schemaVersion,
  allowlisted attributes and missingFields; prior versions are not rewritten.
- Existing Generation history/job characterSheetConfig retains server-derived
  identityMetadata. Existing Character profile/version lineage remains authoritative.
- Existing actor-scoped Scene draft and expiring Template handoff gain optional
  characterSelection {profileId, versionId}; no URLs, Base64 or authorization token.
  Restore query is actor/profile/version keyed, no polling, retry false, gcTime 0;
  selection is reauthorized and stale actor/session/version results are discarded.
- Owner-only share status gains post {id, postType, visibility, status}. Public
  post permissions, moderation, reference rules, quote parameters and Credits unchanged.

Responsive evidence (390/820/1440, EN/TH, default/fashion/creative):
- Private share: 18 cases, `C:/Users/punya/AppData/Local/Temp/private-sharing-layout-3dL8Tv`.
- Derived share: 18 cases, `C:/Users/punya/AppData/Local/Temp/derived-sharing-layout-lQwEaJ`.
- Normal Scene/picker: 18 cases, `C:/Users/punya/AppData/Local/Temp/publication-scene-layout-mHruVC`.
- Owner Profile/settings: 18 cases, `C:/Users/punya/AppData/Local/Temp/publication-profile-layout-SkaKGd`.
- Community feed: 18 cases, `C:/Users/punya/AppData/Local/Temp/publication-feed-layout-OOChpG`.
- Template Scene EN: 9 cases, `C:/Users/punya/AppData/Local/Temp/template-scene-layout-4HOXrL`.
- Template Scene TH: 9 cases, `C:/Users/punya/AppData/Local/Temp/template-scene-layout-Hdzabg`.
Source/static checks pass. Scoped lint has no errors; the pre-existing Scene
initial-handoff useMemo dependency warning remains (route hydration is separately
guarded/tested). Existing Vite large-chunk warning remains out of scope.
All groups were executed separately, not as a full-system test. Responsive
fixtures total 108 cases. Frontend-only dev server remains available at
http://127.0.0.1:5173 (HTTP 200 verified); backend/workers were not restarted.

Remaining gates, not silently closed:
1. Legacy job `job_1788791098499_qhhp3esiz` has no proven Character association;
   do not infer one. Owner association/repair policy and approval-time crop fix stay pending.
2. Live user publishing, moderated/private real-data states and actual provider
   likeness/apparent age need owner UAT. No paid generation or live data writes run.
3. Video continues its approved reference pipeline; no provider qualification or
   video prompt rewrite is claimed. No database, authentication or finance expansion.
4. UI meaning is fixture-verified, not a first-time-user usability study.

Owner UAT: publish an original image with private prompt -> View post -> Gallery
Latest; publish a derived image -> no prompt/Template controls; create Template
draft -> prepare using existing approval -> view/use; select Character in normal
Scene and Template -> reload -> confirm same authorized version; check owner
Visibility & reuse and optional cover independently. Generation must be explicitly
approved with a provider/model/budget before evaluating likeness.
