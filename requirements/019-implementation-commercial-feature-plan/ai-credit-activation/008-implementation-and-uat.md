# Implementation And Focused UAT

Owner: [Phase2-23](../Phase2-23-ai-credit-activation.md). Updated 2026-10-02.
Implementation is offline-verified with independent QA for bounded development/
test. Live paid UAT is not automated; production gates remain open.

## Behavior

- Full Story generation/revision with returned Characters stays free. The UI
  displays a localized green Free notice. Manual editing/import/save stays free.
- Separately extracting Characters, Brief enhancement, outline/Chapters,
  Scene/Shot planning, Environment/Wardrobe and legacy Story Plan/Scene Direction
  use a server-priced quote, consent, reserve, deliver, capture/refund lifecycle.
- Text is a fixed upfront service quote using bounded context/output allowances,
  operation floors and markup, not an invoice for measured text tokens.
- Bulk confirmation always displays total Credits. Individual confirmation can
  follow the existing user-profile preference. Cancel makes no AI request/debit.
- Accepted text operations save a durable result before capture and can recover
  delivered results without calling AI again. Interrupted/ambiguous dispatch
  stays reconciliation-required, not silently retried or refunded.
- Context fingerprints use the canonical Series root and sibling revision IDs.
  A source check after reservation and again after preparing the authoring
  snapshot rejects changes before provider dispatch and refunds the reservation.
  Confirmed settlement/refund refreshes the existing actor-scoped wallet/ledger
  queries without adding a polling loop.
- Video captures provider-reported usage cost plus markup up to the confirmed
  maximum and releases unused held Credits atomically. Missing usage or an
  over-cap cost remains reconciliation-required. Historical quotes are unchanged.
- A definite post-reservation preflight rejection refunds only if no durable task
  owns the dispatch. Ambiguous or unreadable task state keeps its hold. Same-key
  submissions coalesce; conflicting requests and terminal reservations cannot
  dispatch again. A fresh attempt after refund needs a new request.
- Finance's existing returned-Credit totals count unused-reservation releases
  alongside refunds without equating Credits with cash or realized profit.
- Admin independently edits text/image/video markup, saves a draft and confirms
  audited publication. New quotes use the publication; accepted quotes do not.
- Category markup is connected to measured OpenAI2.5 image quotes and paid Look
  Sheet text enhancement quotes, not merely stored in the dashboard. Fixed image
  tariffs and pre-activation accepted amounts remain unchanged.
- Legacy Story Plan quotes include the configured repair-call output allowance;
  paid legacy Story Plan/Scene Direction cannot silently use an unpriced fallback
  provider. Direct/non-billable helper fallback behavior remains unchanged.
- Faceless/audio post-processing remains pending and is not activated for billing.

## Configuration

| File / owner | Editable responsibility |
| --- | --- |
| `server/config/credit-pricing-policy.json` | Default markup, text rate/freshness, FX, buffer, rounding, floors, text/video activation |
| `server/config/cinematic-video-models.json` | Provider rates, catalog capabilities and measured paid activation cases |
| `server/config/videoPaidActivation.js` | Validation of measured development/test activation; not a new pricing table |
| `server/config/videoRecoveryPolicy.js` / `VIDEO_SUBMISSION_MAX_CONCURRENT` | Active submission bound: default32, validated1-256, overload rejected before reservation |
| Admin Control Plane -> Configuration -> Pricing | Audited runtime overrides for text/image/video markup |

Defaults: markup 30% each category, FX35 THB/USD, operating buffer15%,
10 Credits/THB, rounding to5 Credits. Markup is on buffered cost, not gross margin.
Text floors: Brief20, Characters40, outline30, Chapters100, Scenes40, Shots40,
Environment10, Wardrobe10, Story Plan100, Scene Direction40. These are minimums,
not a fixed promise for every request: the server returns the applicable quote.
Fixed image tariffs remain explicit exceptions; changing image markup does not
retroactively replace them or historical image prices.
Admin draft editing uses the existing configuration capability. To publish a
reviewed local development/test draft, explicitly enable
`ADMIN_RUNTIME_CONFIGURATION_PUBLISH_ENABLED=true` in the normal environment.
This existing gate is not silently enabled by the billing change; production
publication is still blocked until trusted identity/transactional storage qualify.

## Owners And Persistence

- Credits: `CinematicWritingPricing`, `CostPlusPricing`, `CreditApplicationService`,
  `CreditReservationService`, `CreditPricingPolicyService`, `TextEnhancementPricing`
  and `CreditAccountRepository`; no second wallet.
- Generation: `CinematicWritingOperationService`, existing kind-scoped
  `PromptEnhancementRepository`, existing Video Generation/task facades.
  Active Video submissions coalesce by task-store/actor/idempotency key and bind
  request/quote/workflow fingerprints. The map contains promises only, bounded
  per task store, and is removed after submission/refund settles; no TTL eviction,
  new polling, durable browser cache or multi-process lock is implied.
- Cinematic: `CinematicApplicationService` source/version/actor validation,
  existing authoring use cases and thin HTTP routes. Generation's existing
  `CinematicStoryPlanService` owns the bounded repair allowance and paid fallback
  restriction; no parallel prompt/provider workflow was added.
- Admin Configuration: `PricingConfigurationService`, `pricingDraftValidation`,
  existing audited revision publication and React pricing editor.
- Finance: the existing read-only `FinanceReportService` includes release events
  in returned-Credit totals; no report repository or write path was introduced.
- React Cinematic: quote helper, registered consent and actor-scoped receipt index.
  Shared Generation owns the legacy refinement Free label.
- Runtime files reused: `server/data/generation/promptEnhancements.json`,
  existing Credit account/ledger/task stores, and
  `server/data/admin-configuration/revisions.json` (configured through paths.js).
  No new runtime data directory or live data migration.
- Text result recovery lasts seven days; repository cap remains5,000 records.
  Browser recovery index holds at most64 IDs/fingerprints, no raw prompts/results.

## Focused Automated Checks

Prerequisites: repository dependencies installed with the existing workspace
toolchain, Node22, browser binaries for Playwright visual checks. All API/provider
responses in visual checks are intercepted; no real AI dispatch or wallet debit.

```powershell
node scripts/test-ai-credit-activation.mjs text
node scripts/test-ai-credit-activation.mjs legacy
node scripts/test-ai-credit-activation.mjs ledger
node scripts/test-ai-credit-activation.mjs video
node scripts/test-ai-credit-activation.mjs pricing
node scripts/test-ai-credit-activation.mjs admin
node scripts/test-ai-credit-activation.mjs finance
node scripts/test-ai-credit-activation.mjs tariffs
node scripts/test-ai-credit-activation.mjs ui
npm --workspace web run typecheck
node scripts/verify-cinematic-credit-consent.mjs
```

Admin visual checker needs an isolated local Vite dev server, not the production
workers. Supply that URL explicitly:

```powershell
node scripts/verify-admin-pricing-ui.mjs http://127.0.0.1:5188
```

The explicit aggregate command is `node scripts/test-ai-credit-activation.mjs all`.
It fails on errors, does not start paid generation/restart workers, and was not
substituted for the requested short focused runs.

## Manual UAT

1. Restart the application through the normal development workflow when ready
   to load server changes. Open Cinematic and Admin Configuration. No automatic
   restart was performed during validation.
2. With zero balance, generate/revise Full Story and confirm Characters are
   returned without debit. Check the green Free notice and legacy refinement.
3. Import a story and request Character extraction. Review total Credits, cancel,
   and verify no debit. Confirm once with sufficient balance; compare wallet and
   ledger. Retry/reload must recover the result rather than bill the same job again.
4. Repeat one outline/Chapter action and one Scene/Shot action. Edit source after
   quoting; the stale quote must be rejected before AI. Bulk always confirms.
5. Request Environment/Wardrobe text only: no image job should be started/charged.
   Generate its image separately using the existing media quote/consent pipeline.
6. For Seedance2.5, choose a measured paid case from the model configuration,
   review the maximum, confirm, and compare actual usage capture plus released
   reservation. Do not use an unsupported aspect ratio/duration/reference count.
   Confirm Finance returned Credits includes the unused reservation once.
7. Interrupt/reload the browser during writing, then retry the same action. Review
   the saved result/recovery receipt; a changed request must not auto-start paid AI.
8. In Admin, adjust one category, save draft, confirm active pricing is unchanged,
   then publish with reason. Check a NEW quote; the old confirmed quote stays pinned.
9. Check TH/EN at mobile390, tablet820 and desktop1440. Ensure total/confirmation,
   Free notices, cancellation, pending/error/recovery and sibling actions remain usable.

## Release Boundary

Measured video activation is development/test only. Production qualification,
invoice/account verification, unmeasured video cases and post-processing remain
separate gates. A dispatch that crashed before recording a usable result may need
support reconciliation; it is never automatically billed a second time.
End-to-end live provider quality and actual paid runtime UAT are not claimed by
offline fixture tests. Review/test evidence is tracked in the task index.

## Evidence

Focused runs passed: text15, legacy22, ledger4, video settlement82, video pricing17,
Admin22, Finance6, tariff31, existing video integration14/image20, scoped UI141 and neighboring
Series/Full Story/Environment/outline48. Typecheck and `git diff --check` passed.
Final preflight/duplicate/overload cases passed40 focused Video tests and13
neighboring recovery checks. The isolated Admin Vite helper was stopped; user
server6500 and workers were not restarted or stopped.
Missing/null/empty reservation-status fault injection fails closed before provider
dispatch; old success-path fixture authorizations now include canonical reserved
status. No-reservation qualification authorizations retain their existing behavior.
No full-repository suite or live paid generation was run.

Visual checks: TH/EN390/820/1440, three themes for writing consent/free/recovery;
Admin pricing editor/confirmed publication at all three widths. The final shared
Prompt Refine label also passed actual green-color and overflow checks.
Screenshots reviewed: Thai390 consent/Free notice, English820 recovery, English1440
Admin and Thai390 Admin. Fixture evidence is in the temporary verification folders
reported by the scripts; screenshots are not committed as runtime data.
Final independent QA passed Video40/40, Finance6/6 and the prior status fault
injection. No findings remain in reviewed scope; task007 records the bounded
development/test pass and the still-open production/live-UAT release gates.
