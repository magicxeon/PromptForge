# Image 2.5 Measured Cost And Retail Activation

Date: 2026-09-09. Status: implemented; scoped checks passed. Unmeasured coverage remains gated.
Primary: Commercial Financial Integrity. Sequential reviewers: Backend and QA;
review independence is limited. Skills: review-commercial-integrity,
implement-generation-workflow, verify-release-regressions, openai-docs.
Owners: Credits pricing/reservations; Providers exposure; Finance rate inventory.
Supersedes the 1-Credit tariff in 006 only for newly confirmed requests.

## 1. Evidence And Boundaries

Official model pages rechecked 2026-09-09:
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare

USD / million tokens: text input 5, cached text 1.25, image input 8,
cached image 2, image output 30. Never multiply total tokens by one rate.
No new provider call, secret read, live JSON mutation or historical rebilling.

| Model / source Job | Text input | Image input | Image output | Cost USD |
| --- | ---: | ---: | ---: | ---: |
| Sunburst / job_1788961128682_vr145zye4 | 660 | 0 | 1204 | 0.039420 |
| Sunburst / job_1788968339660_hco841fct | 1409 | 1024 | 1204 | 0.051357 |
| Flare / job_1788966593111_y2272shw8 | 618 | 0 | 1204 | 0.039210 |
| Flare / job_1788968172852_pk2saeo9y | 1356 | 1521 | 1204 | 0.055068 |

History confirms 768x1024. Persisted locked estimates confirm 1K, 6:8,
quality null (adapter defaults to auto), one output; edit cases each had TWO
effective references, not one. No prompts, actors or private URLs in fixtures.
Equivalent 3:4 is covered. Other ratios/resolutions/explicit qualities and
more than two references remain unpriced, not guessed from Image 2 rates.
One-reference quotes use the measured two-reference edit price conservatively;
this is a retail bucket, not a claim of identical token consumption.

## 2. Quote And Consent

Use existing policy: USD x 35 THB x 1.15 safety / (1 - 0.70 margin)
x 10 Credits/THB, round UP to 5 Credits. Per output: Sunburst 55 without
references, 70 with 1-2; Flare 55 without, 75 with 1-2. Multiply the per-output
locked amount by output count; preserve template fees and per-child settlement.
Costs are measured baselines, not promises of the next request's actual usage.
Mark estimateConfidence provisional and costBasis measured_usage_baseline.
Snapshot baseline tokens, rate version, token rates and computed cost in quote.
Credits remain fixed after consent; no surprise additional charge on completion.
Reject old unreserved test-tariff quotes at single, group and plan reservation;
already reserved/captured/refunded work retains its original financial contract.
Keep insufficient-funds, actor, input parity and idempotency checks unchanged.

## 3. Actual Cost Evidence

On new successful jobs, Credits calculates usage-derived USD using the rates
pinned to that reservation, independently of the locked customer charge. Queue
passes provider usage to the existing capture facade. Store only normalized
token counts/cost/rate version in capture metadata, never prompts or images.
Malformed/missing usage remains explicitly unavailable; do not invent zero cost
or fail an otherwise successful generation. Cached discounts require explicit
typed counts; ambiguous cache data is not silently treated as verified actual.
No provider invoice reconciliation or full Finance monthly usage report rewrite.
Expose token-rate evidence in the existing Finance inventory without implying
sample costs are universal per-image charges. Old four jobs are evidence only.

## 4. Ordered Implementation

1. [x] Inspect actual History + locked estimates; verify official prices; plan.
2. [x] Add pure measured pricing/usage calculator and sanitized evidence fixtures;
   version policy, enable paid routing, retain unsupported-request pricing gate.
3. [x] Pin quote evidence; reject stale test quotes in all reservation paths;
   record new capture cost evidence through Credits and existing repository.
4. [x] Update Finance rate inventory, old test expectations and focused tests.
5. [x] Run aggregate adapter/catalog/pricing/lifecycle checks, review scoped diff
   and document remaining coverage. No paid UAT or production build.

Runner: extend `node scripts/test-openai-image25.mjs pricing|all`; new focused
`node --test test/openAIImage25Cost.test.js`. Tests use temp repositories and
mock transport; never run production jobs, rewrite live estimates or restart.
New internal owner: server/domain/credits/OpenAIImage25Pricing.js. No new runtime
storage path or public API. Rollback disables the two catalog entries; preserve
the pricing snapshots and all completed finance records.

## 5. Verification And Handoff

- `node scripts/test-openai-image25.mjs all`: 43 checks passed. The final pricing
  group rerun also passed after adding retail-assumption snapshots and historical
  already-reserved tariff coverage. Provider adapter calls are mocked.
- Checks reproduce all four USD amounts; verify supported and unsupported inputs,
  output/reference multiplication, template fees, typed cache discounts, unknown
  usage, old single/group/plan quote rejection, owner isolation, insufficient
  funds, duplicate capture/refund and preserved one-credit historical reservations.
- A real temporary Credits repository proves capture uses the reservation's rate
  even if today's token rate changes, and never changes the confirmed debit.
- Existing Generation Group, Finance report/draft, legacy pricing and provider
  catalog tests passed. Queue syntax check and TypeScript no-emit passed.
- `node scripts/verify-look-sheet-exports.mjs image25`: passed using local Vite
  and intercepted APIs. Real pure pricing calculates the displayed 55-Credit
  quotes for both models; old testing notice is absent and Generate is enabled.
  EN/TH at 390/820/1440. Screenshots:
  `C:/Users/punya/AppData/Local/Temp/mpf-look-sheet-image25-i12vHz`.
  Desktop and Thai mobile screenshots visually inspected. No paid Generate click.
- Sequential Backend/Commercial/QA scoped review; no independent reviewer.
  `git diff --check` passed with existing line-ending warnings only.
- New files: this requirement, Credits/OpenAIImage25Pricing.js and
  test/openAIImage25Cost.test.js. Policy contains sanitized four-job evidence.
  Architecture/master/005/006 updated; no file moves or new storage paths.
- New capture metadata is written only by future normal jobs to the existing
  Credits ledger. Existing History, balances, reservations and outputs were not
  edited. Finance monthly usage aggregation remains a separate pending feature.
- Activation on the running app needs the normal idle restart/build procedure
  (`scripts/start-dev.bat`). No worker restart or production bundle build here.
  Native provider invoice/cache reconciliation and other sizes/qualities still
  need evidence; this is not a full production financial-readiness certification.
