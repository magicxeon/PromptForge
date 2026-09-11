# Directed Opening Implementation And Evidence

Status: implementation and isolated validation complete; paid visual qualification pending.
Date: 2026-09-10.

| Task | Scope and dependency | Gate | Status |
| --- | --- | --- | --- |
| R0 | Reconcile 017-022, inventory current contracts | No optional-Storyboard implementation; Series deferred | Documented |
| C1 | JSON authoring/policy/recipe defaults and public manifest | Config/legacy/input tests | Implemented; focused config tests pass |
| U1 | Multi-choice Setup and complete intent payload | UI/locale/schema tests; follows C1 | Implemented; UI and responsive checks pass |
| C2 | Explicit zero/multiple Cast authority | Ref/role/limit tests before guard changes | Implemented; 26 reference tests and aggregate pass |
| D1 | Art/light and time-zero still/motion contract | Schema/normalizer/compiler/director tests | Implemented; 58 authoring tests and aggregate pass |
| T1 | Trusted Storyboard source and original-URL dispatch | Quote/submit/expiry/hash/credit regressions | Implemented; video application 22 tests pass |
| Q1 | Aggregate validation and responsive browser | Existing flow regression and scoped diff review | 260 tests, TypeScript, i18n and browser pass; paid UAT remains open |

The runner scripts/test-cinematic-directed-openings.mjs provides selectable config,
authoring, references, transport, workflow, ui, types groups and explicit all.
Tests use isolated fixtures; no paid generation, live-data writes or worker restart.
Browser checks use intercepted fixtures and Vite at 390/820/1440px in EN/TH.
Existing global yellow ProcessingSpinner behavior remains unchanged.

Record commands/evidence after each task. Required live UAT: generate and approve
a Seedream opening for none/one/multiple visible Cast, compare the intended opening
to the video start, confirm proper mode and reference ordering, then check one
charge/capture or refund. Obtain explicit paid approval; do not run in aggregate.
No success guarantee, no exact-frame claim for reference mode. Legacy data stays
readable. No production database migration or Series implementation in this phase.

## Ordered Implementation Map

1. Configuration: server/config/cinematic/story-authoring.v1.json and
   text-model-policy.v1.json, validated by cinematicStoryConfiguration.js.
   Existing enhancement/plan policies retain environment overrides. The public
   field manifest exposes only safe authoring choices and limits. Authoring
   manifest version 3 and dependency version 2 cover arrays, art and Cast scope.
2. Setup: CinematicStudioRoute and cinematicSchemas preserve ordered arrays with
   primary legacy scalars. StoryIntentChoices provides bounded checkboxes and
   accessible ordering; CinematicSetupForm keeps sibling role/story workflows.
3. Cast: CinematicCastCoverage resolves legacy/inherited/selected/none semantics.
   CinematicImageCastReferences normalizes at most six named sheets, authorizes
   through existing source facades and pins hashes. Reference Processing owns
   deterministic order, counts, capacity and fingerprint; Generation prepares
   and rechecks sources at queue dispatch. React single/batch requests use the
   same fields and counts. Batch guards reject substituted or extra references.
4. Direction: story-plan.v8, scene-direction.v7 and story-enhancement.v1 recipes
   feed the existing text provider. Schema/normalizers carry artDirection and
   openingFrameVersion. Existing keyframe/video compilers separate the still
   opening from subsequent motion. Scene Director and accepted field proposals
   preserve unaffected fields and upgrade only an explicitly edited opening.
5. Trusted video: VideoGenerationApplicationService derives the original Job
   binding from the owned immutable Storyboard Asset, checks hash/URL/authority,
   recalculates the reference fingerprint and dispatches the provider original.
   No change to mandatory Storyboard approval or Credit lifecycle ownership.
6. Verification: focused tests were run after each responsibility, followed by
   the aggregate and responsive checks. A Cast checkbox inherited text-input
   dimensions in browser QA; a scoped cinematic.css rule and pixel-size assertion
   fixed that regression. Series remains 022 documentation only.

## Recorded Evidence

Commands executed successfully:

```text
node scripts/test-cinematic-directed-openings.mjs all
node scripts/validate-i18n-catalogs.js
node scripts/verify-cinematic-directed-openings.mjs
git diff --check
```

Aggregate: config 10, authoring 58, references 26, transport 45, workflow 20,
UI 101 = 260 passing tests, plus TypeScript no-emit validation. The types group
uses web/tsconfig.app.json with incremental disabled; it does not write build
output. The installed repository dependencies and Node are prerequisites.

Browser prerequisite: an existing source Vite server; no API/worker start is
required. Default origin is http://127.0.0.1:5173, overridable with
CINEMATIC_WEB_ORIGIN. Vite was started alone with --configLoader runner to avoid
the environment's blocked temporary config-build directory. Browser requests
are intercepted, and unexpected provider/network work is not permitted.

Final screenshots: OS temp directory mpf-directed-openings-2WS9Rp. Setup and
Scene Director checked in both languages at all three widths, including selected
Cast and opening fields, page/dialog overflow, checkbox dimensions and browser
errors. Screenshots are local evidence, not committed runtime assets.

Review was sequential, not independent: Cinematic/Generative Production checked
opening/motion and provider-mode boundaries; UX checked scoped controls and
responsive states; Backend/privacy and Commercial checked ownership, original
URL secrecy and quote/submit parity; QA checked regression evidence. No paid
provider output quality, account availability or moderation acceptance is claimed.

## Release / Live UAT

1. Restart the application through the normal operator workflow to load server
   configuration; this implementation did not restart the backend or workers.
2. Use a new Plan or explicitly edit an opening to adopt time-zero semantics.
   Verify intent order survives save/reload and Generate Plan fills art/light.
3. With explicit budget approval, render and approve none/one/multiple-Cast
   Seedream openings, then generate the matching Seedance clips. Check initial
   pose/contact, identity, art/light, subsequent action and cross-shot geography.
4. First-frame mode and multimodal reference mode must be reviewed separately.
   A previous approved Storyboard is not an actual extracted video last frame.
5. Confirm expiry/error recovery and one charge or refund per attempt. Do not
   auto-regenerate rejected or expired references. Legacy outfit-only multi-Cast
   needs an approved whole Look Sheet for each visible person before rendering.

No files moved in this package. No new runtime data paths: additive Setup/Scene/
Shot fields and bounded named reference metadata stay in existing Cinematic and
Generation records. No live records or old approvals were backfilled.

## Creative Intent Presentation Follow-up (2026-09-11)

Completed in order:

1. Recorded scoped acceptance in 018. The production workspace's generic input
   rules forced checkbox width to 100% and min-height to 40px; the earlier
   isolated browser fixture omitted that ancestor and did not reproduce it.
2. Extended StoryIntentChoices and cinematic.css: fixed 18px native checkboxes,
   adjacent labels with 40px row targets, semantic selected/focus states,
   full-width ranked groups and 36px ordering buttons. Options use two columns,
   becoming one when their own container is at most 320px. No sibling Setup
   sections, controlled values, selection caps or persistence rules changed.
3. Updated the EN/TH disclosure command. Added last-selection, pending and
   ordered add/remove assertions to existing component tests. The existing UI
   runner already includes these tests and adjacent Setup/Storyboard regressions.
4. Corrected the existing browser runner to include the real workspace ancestor.
   Added keyboard selection, 18px sizing, label alignment and section overflow
   assertions across EN/TH, three themes and 390/820/1440px, open and closed.

Validation passed for this follow-up:

```text
node scripts/test-cinematic-directed-openings.mjs ui
node scripts/test-cinematic-directed-openings.mjs types
node scripts/validate-i18n-catalogs.js
node scripts/verify-cinematic-directed-openings.mjs
git diff --check
```

UI: 103 tests across seven files. TypeScript no-emit and locale validation passed.
Browser screenshots: OS temp mpf-directed-openings-GNmptx. Desktop open and
mobile closed/open states were visually inspected, including alternate themes.
The browser runner still checks adjacent Scene Director and opening controls.
Review was sequential UX/QA, not independent. The full backend aggregate was
not rerun for this presentation-only follow-up; the aggregate command remains
`node scripts/test-cinematic-directed-openings.mjs all` for later release checks.

Vite source preview: http://localhost:5173/create/cinematic. No backend/worker
restart, paid AI calls, production build, file moves or runtime data changes.
Browser checks used isolated API fixtures, not live project persistence/UAT.
