# 013 - Reviewable Chapter Outline And Writing Economics

Status: advisory/outline slice implemented and fixture-verified, 2026-09-26.
Paid rollout and live quality qualification remain deferred. Primary: Product Requirement Architect.
UX/QA reviews are sequential; Commercial review applies to advisory economics.
No wallet, reservation, capture or refund state changes in this slice.

## Outcome And Scope

After confirming Full Story, request an AI Chapter outline (titles and synopses,
not full Chapter prose). AI recommends a count from dramatic coverage and target
Chapter duration, not the default Setup count. Preserve Movie=one Chapter and
configured Season structure. User can edit/add/remove/reorder outline rows and
approve explicitly. Approval updates the Setup Chapter target and saves a pinned
outline, not Chapter content. Existing Chapter/Scene/Shot/media IDs are untouched.
Existing Generate All remains optional; when a current approved outline exists,
generation must follow its titles, synopses and Season allocation. A pending or
stale outline cannot be silently consumed. Legacy Projects without an outline
retain existing generation. Full Story changes require a fresh reviewed outline.

Outline belongs to root Story Project; route calls reject child ownership rather
than writing an independent child plan. Expected Project version and confirmed
source revision protect both proposal completion and approval. Persist current
outline plus bounded prior snapshots under the existing Project repository.
Pending Chapter prose proposals must be resolved before new planning/approval.
Opening/reloading/reviewing never calls a provider. Explicit AI planning is a
provider-cost operation but remains `qualification_no_charge` for customers.

## UX

Full Story document shows an unframed Chapter Outline section after the text,
with a compact entry action from Build Chapters. Show rationale/count, editable
title/synopsis/Season per row, icon add/remove/reorder and explicit Approve Plan.
Expose pending/error/stale/approved states without moving Characters/History or
existing Manual/Continue/regeneration workflows. Disable generation from an
unapproved plan and link to review instead. No hidden prompt attributes.
Use localized TH/EN labels, shared buttons/spinner and 390/820/1440px checks.

## Advisory Pricing And User Value

Commercial policy: [Phase2-22](../../019-implementation-commercial-feature-plan/Phase2-22-cinematic-writing-pricing.md).
This slice estimates only outline planning and the next Chapter-writing batch.
Show proposed Credits only, with the amount and unit in the theme's yellow warning
color. Do not display THB alongside writing estimates. Keep the explicit zero-charge
qualification notice. Underlying cost/conversion math and API contracts are unchanged.
Media, revisions and
later Scene/Shot operations are excluded. Model/context changes invalidate the
displayed estimate. If model/rate/config is unknown/expired, show unavailable,
not zero cost; do not block free qualification authoring.

Credits owns estimate math/configuration. Use configured uncached-input rates,
output budgets, UTF-8 byte-based token approximation and overhead, existing FX,
operating buffer, target gross margin and Credits/THB. Estimates are illustrative,
not guaranteed upper bounds or binding quotes. Keep actual provider usage separate
from estimates; never treat byte estimates as measured tokens. No assumed cache
savings in advance. Store returned usage with source/model/response/time evidence
for outline and Chapter proposals. Missing usage is unknown, never zero.

Trial value hypotheses: an outline saves structural rewrites and gives an editable
plan before a larger call; it is not a second Full Story charge. Configure floor
and review threshold per operation. If cost-based pricing exceeds the target
customer-value threshold, flag it for review rather than capping below cost or
claiming customers will pay. Price research still requires user conversion data.
Gross contribution after buffer is not net profit; taxes, payment discounts and
fixed operating expenses remain unqualified. No unlimited package is implemented.

## Ordered Tasks

1. Implemented, focused tests passed: Economics foundation. Advisory-only calculator behind Credits pricing facade,
   JSON knobs and unit tests for margin, rounding, unknown/expired rates and Thai
   input growth. Do not change existing media or text-enhancement charging.
2. Implemented, focused tests passed: Chapter outline. Provider recipe/schema, strict plan validation, versioned
   propose/approve endpoints, usage evidence and generation continuity. Test actor,
   stale source, invalid/partial plan, pending prose and untouched existing work.
3. Implemented, focused tests passed: Review UI/API schemas. Editable bounded outline, approval, free-status estimates,
   dirty/stale guards and root-owner scope. Preserve existing writer controls.
4. Verified with isolated fixtures: Focused tests and responsive browser checks; no paid requests/live edits.
   Register selectable `rewamp-chapter-outline` in existing cinematic runner.
5. Evidence recorded below. Deferred: whole-pipeline usage ledger for
   failures/late results, real pricing publication, payment settlement, user price
   experiments, Scene/Shot readiness improvements and a paid end-to-end pilot.

Owners: CinematicApplicationService facade, focused CinematicChapterOutline helper,
CinematicFullStoryService, OpenAITextProvider and prompt recipes; Credits facade and
calculator; existing Project JSON contract; React cinematic components/API/schemas.
No new runtime directory or cache. Reload/backend restart picks up static config.

## Configuration And Verification

Presentation follow-up: update the TH/EN price label and estimate-value styling only.
Verify credit-only text and resolved yellow token in the existing isolated Chapter
outline browser check at 390/820/1440; preserve unavailable/error states and controls.
Verified: `node scripts/verify-cinematic-story-import.mjs --chapter-outline` passed
TH/EN credit-only labels, resolved warning color and responsive checks at all three
widths. Mobile screenshot reviewed. `git diff --check` passed; no full suite or AI calls.

- `server/config/credit-pricing-policy.json`: `cinematicWritingPreview` owns
  byte/token assumption, input overhead/context bound, per-operation floor and
  value-review threshold. Existing `textEnhancement` supplies reviewed model rates;
  existing root FX/buffer/margin/Credits conversion/rounding remain authoritative.
  Rates expire at `textEnhancement.reviewBy`, after which preview is unavailable.
- `server/config/cinematic/workflow-policy.v1.json`: outline output token budget,
  synopsis length, Chapter bounds and existing ten-revision rotation. Existing
  cinematic text policy still owns the actual Chapter prose output budget/model.
- `server/config/prompt-recipes/cinematic/chapter-outline.v1.json` and
  `full-story-chapters.v1.json`: planning instructions and approved-plan adherence.
- Existing Project records gain `chapterOutline`/`chapterOutlineHistory`; existing
  Chapter proposal provenance gains returned usage. No live Project was rewritten.
  Chapter provenance normalization retains usage/time across persistence. A batch
  response copied to multiple revisions remains ONE provider operation: future
  cost aggregation must deduplicate by provider/model/responseId, not add per Chapter.
- `node scripts/test-cinematic-video.js rewamp-chapter-outline`: 8 backend tests
  and 17 React tests passed. Covers actors, stale source/targets, Movie/Seasons,
  history bounds, existing work, unknown pricing, approval, editing and actor switch.
- `node --test test/cinematicRewampConfiguration.test.js test/cinematicFullStoryService.test.js`:
  5 adjacent configuration/generation tests passed; no aggregate test run.
- `node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false --pretty false`:
  passed. `git diff --check` passed; no production build or full suite.
- `node scripts/verify-cinematic-story-import.mjs --chapter-outline`: isolated
  Vite/Playwright TH/EN at 390/820/1440, fields/overflow and editable state checks
  passed. Screenshots reviewed; default theme only. APIs intercepted, no provider
  calls. Temporary server closes itself. Existing dev server is not restarted.

Sequential UX/QA/Commercial reviews were performed by the same agent; independent
review is unavailable. Pending live checks: outline quality, Thai token calibration,
large Chapter batches fitting the existing output budget and actual provider access.
Cross-session duplicate/late text requests and failed-response usage are not a
durable paid-operation ledger; finish financial idempotency/recovery before charging.
This slice does not claim production pricing or net profitability is qualified.
