# Presentation Verification And Pending Register

Status: Implementation delivered; focused fixture gates passed. Live/source UAT remains pending. See [delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
Parent: [023](023-template-character-presentation-master.md).
Execution: [plan 033](implementation-plan/033-presentation-verification.md).

## Current Status Register

Deferred-item status is now centralized in
[098 Pending Features](../../098-pending-features/000-master.md).
The pending table below remains the original scope/reference, not a second
execution queue. On 2026-09-07 the user accepted real-data Character previews
and the Template -> Scene Builder flow. Do not keep those happy paths marked
unverified; separate failure/security evidence remains in 098 category004.
Featured is intentionally hidden per the latest requirement025 revision.

## Requirement-To-Evidence Matrix

| Acceptance family | Short automated group | Visual/manual evidence |
|---|---|---|
| TPD (024) | template-data | Real root/three reported public outputs, read-only |
| TGF (025) | template-featured | Gallery original + two outputs, 0/1/error |
| TGC (026) | template-catalog | Horizontal cards, URL filters, empty/load-more |
| PTI (027) | photo-original | Complete original, fee, disclosure, lightbox |
| PTC (028) | photo-creations | Three real cards, attribution, sort/heart states |
| CDI (029) | character-display | Chosen Community art vs centered fallback |
| CPC (030) | character-consumers | Picker + two selected thumbnails; reference parity |
| PBI (031) | provider-icons | Five masks, alpha, inherited colors, fallbacks |

## Runner Requirement

Implementation added the owning `scripts/test-template-presentation.mjs`
entry point with `--part=<group>` for the eight groups above and
`compatibility`, `visual`, `build`, `all`, plus `template-hero`. These groups now
exist; actual run evidence is recorded in implementation-plan/034, not inferred
from their presence alone.

- No arguments prints usage, not an expensive aggregate. Unknown group exits
  nonzero. `all` explicitly runs the ordered focused groups, compatibility,
  one build/check phase and the visual groups, with timings and failure status.
- Reuse existing `test-template-detail.mjs`, `test-template-scene.mjs`,
  `test-template-input-policy.mjs`, `test-template-derived-sharing.mjs` and
  `test-character-discovery.mjs` groups where applicable. Do not nest their
  aggregate modes or rebuild repeatedly. Record exact existing options first.
- Extend existing visual fixtures/runners or add a cohesive scoped wrapper with
  Gallery / Photo / Character / Icons selection. Do not start live workers.
- Builds are explicit, not hidden in every short group. Fixture visual checks
  require a known current build; report absent/stale build rather than silently
  presenting screenshots of old code as current evidence.
- No provider calls, external API credentials, paid generation, live share/like,
  runtime JSON writes or backend restarts. All mutations use isolated fixtures.

## Visual Matrix And Compatibility

Minimum per changed page: 390 / 820 / 1440px, default/fashion/creative themes.
Add 320px narrow and 1920px wide checks to the affected layout group, and both
EN/TH long text. Cover mouse/keyboard/touch, focus, dialogs, scroll, broken media,
loading/error/retry and no unintended overflow. Inspect screenshots, not only
geometry assertions. Provider masks require nonblank colored-pixel checks.

Protect original Post media/Comments/More from creator/owner edit; Template
input restrictions and derived/single-share guards; non-Template Studio refs;
Character Gallery; Comparison/ordinary Gallery cards; Landing sibling sections.
Tests remain focused fixtures, not a repository-wide paid or live UAT run.

## Explicit Pending Items

| ID | Deferred behavior | Owner / condition for reopening |
|---|---|---|
| P-01 | Weekly editor selection, rating, ranking, For you, top creators/follow | Community editorial/social; approved service + data |
| P-02 | Public blueprint/Pose Proxy, private recipe or raw input inspection | Templates/publication; explicit sanitization/rights contract |
| P-03 | Creator income/payout band or monetization promises | Commercial; separate requirement/approval |
| P-04 | Compact global footer, hiding shell status, sidebar redesign | AppShell; route-scoped shell policy approved first |
| P-05 | Version filter, exact total public counts, lineage after history deletion, snapshot-ranked cursors | Community data; separate read/persistence work |
| P-06 | Repair/re-export intrinsically off-center existing Character derivatives | Character Profiles; inspect source and approve bounded derivative repair; never canonical sheet rewrite |
| P-07 | Personal Character/outfit storage and favorites beyond existing recents | Profiles/Library; separate workflow/storage requirements |
| P-08 | Larger/vector provider artwork or missing redistribution license evidence | Asset owner; obtain authorized originals/terms |
| P-09 | Detail capability summary requiring new private-to-public schema exposure | Templates facade + Community privacy review; omit until approved projection exists |
| P-10 | Optional mobile sticky Use bar and native video tutorial integrations | UX/Community; only if a measured need and approved destinations exist |
| P-11 | BytePlus/Seedance failure investigation and paid video testing | Existing Cinematic/provider pending work; explicitly outside this release |

## Reconciliation / Gap Review

1. Gallery's multi-output Featured is not Detail's original image. Resource 005
   requires a single original and its separate output grid; no duplicate strip.
2. Mockup Face/personal-upload/scene options do not override current approved
   Character/outfit policy. Show supported summary only; do not unlock inputs.
3. Access fee is not total generation cost. Existing quote/version workflow is
   retained, not rewritten for static mockup prices.
4. Same-family means verified Template ID across versions; source-post privacy
   is still enforced. Three user-reported images must be verified, not seeded as
   an invented live count or used to relax lineage matching.
5. Character display artwork and actual Generate reference are explicitly split;
   both the left summary and the right tiny Reference tile are covered.
6. Centering CSS cannot fix an already off-center bitmap. Existing safe fallback
   first, derivative repair Pending if necessary. No automatic asset replacement.
7. Shared footer and generic card changes cannot be hidden in page CSS. Defaults
   remain protected; new variants are explicit and regression-tested.
8. Reusing engagement adds per-card viewer reads; count them in the baseline and
   scope hydration to rendered cards. New preview API must not add per-card
   history scans. Do not claim database-scale performance from bounded payloads.

## Documentation Review Record

2026-09-07: Product, UX and QA/privacy planning reviewed sequentially by the same
agent. Ownership, dependencies, acceptance mapping, protected behavior and
Pending destinations are connected. No independent review or live UI pass is
claimed for that planning pass. Implementation was subsequently authorized;
the independent scoped review, fixes and fixture gates are recorded in
[delivery evidence](implementation-plan/034-presentation-delivery-evidence.md).
