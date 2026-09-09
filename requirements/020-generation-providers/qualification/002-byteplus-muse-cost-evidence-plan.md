# 002 BytePlus, Muse And Google Video Cost Evidence Plan

Status: inventory prepared; waiting for owner prompts and evidence selection.
Date: 2026-09-08. Documentation only; no paid execution authorized by this list.
Primary: Product Requirement Architect. Commercial review applied sequentially.
Owners: Providers owns evidence/qualification; Credits owns pricing and settlement.
Parent: ../video/004-byteplus-pricing-reconciliation.md.

## Scope And Current Truth

- Cover all seven Seedance and four Seedream versions currently configured,
  plus Muse Image, three configured Veo versions, an optional Gemini Omni row
  and a pending Muse Video discovery item. Keep this existing file as owner.
- Source of model IDs and supported settings: server/config/cinematic-video-models.json,
  providers.json and credit-pricing-policy.json, inspected on the date above.
- Settings below are catalog-based candidates, not proof of provider acceptance.
  Reconfirm actual availability and rate evidence before spending; do not unlock
  unsupported options merely to complete this table.
- Muse Image already has qualified paid routing and 15 published Credits in
  current configuration. This is cost reconciliation, not a transition from 1 Credit.
  Older internal-testing notes in pricing configuration are stale; current provider
  configuration and image/meta-muse/009 own exposure. No runtime change here.
- No Muse Video model/adapter was found in current server provider configuration
  or video catalog. Do not substitute Gemini Omni/Veo or invent a Muse model ID.
- User-supplied Meta pricing capture confirms Muse Image bills successful returned
  images at USD 0.01 each, without additional image-token or built-in search fees.
  It contains no video-generation rate; Voice Transcribe is not video generation.
- OpenAI and Grok remain outside this round. Google rows below describe local
  catalog candidates, not newly verified official model availability or prices.
- Do not rewrite _temp test cases or add prompts yet. The earlier minimal manual
  file is historical draft scope; this inventory governs the next test-case version.

## A. Video Evidence Inventory

One output per row, online mode, 9:16 initially. Prompt supplied by owner later.
Prefer existing successful Jobs with complete billing evidence over fresh runs.
Default prompt-only avoids paying for new reference images and failed portrait
approval attempts. No automatic retries or Comparison batches.

| ID | Model | Exact model ID | Candidate settings | Distinct evidence |
|---|---|---|---|---|
| V01 | Seedance 2.5 | dreamina-seedance-2-5-260628 | 480p, 4s, no audio | Current primary version |
| V02 | Seedance 2.0 Mini | dreamina-seedance-2-0-mini-260615 | 480p, 4s, no audio | Mini rate and dated discount |
| V03 | Seedance 2.0 Fast | dreamina-seedance-2-0-fast-260128 | 480p, 4s, no audio | Fast rate and dated discount |
| V04 | Seedance 2.0 | dreamina-seedance-2-0-260128 | 480p, 4s, no audio | Standard 2.0 rate |
| V05 | Seedance 1.5 Pro | seedance-1-5-pro-251215 | 480p, 4s, no audio | No-audio billing branch |
| V06 | Seedance 1.5 Pro | seedance-1-5-pro-251215 | 480p, 4s, generated audio | Separate audio billing branch |
| V07 | Seedance 1.0 Pro Fast | seedance-1-0-pro-fast-251015 | 480p, 2s, no audio | Legacy Fast rate |
| V08 | Seedance 1.0 Pro | seedance-1-0-pro-250528 | 480p, 2s, no audio | Legacy Pro rate |
| MV01 | Muse Video | PENDING identification | PENDING supported duration/resolution/audio | API, integration and cost unit must be confirmed first |

Eight base video evidence rows cover seven configured versions, NOT eight
mandatory new generations. Use owner content in every row so outputs can be reused.
If 2s clips are not useful, owner can request longer duration before final test
cases; show updated estimated spend and obtain approval first.

### Conditional Video Rows

| ID | Candidate | When required |
|---|---|---|
| VX01 | Seedance 2.5, 720p, 4s, first frame, no audio | Before qualifying first-frame/720p commercial use; reuse an eligible existing source |
| VX02 | Seedance 2.0, 1080p, 4s, no audio | Before releasing this distinct resolution-rate tier |
| VX03 | Seedance 2.0, 4K, 4s, no audio | Before releasing 4K; separate budget approval, not base batch |
| VX04 | Muse Video additional cost branches | Only after actual API/rates/capabilities are known |

VX01 changes both resolution and input path to minimize paid samples; it is not
a controlled single-variable comparison. If a discrepancy appears, inspect
usage and billed dimensions first before proposing another paid sample.
For other versions, add samples only for a requested release scope not supported
by existing evidence or a distinct billing branch. A same-rate resolution can use
documented formula plus deterministic pixel/token tests, but record live coverage
as unverified; do not label every combination runtime-qualified from one sample.
First-frame images are not video input. Actual video input, offline generation,
2.5 1080p blocked capabilities, look sheets and moderation probes stay pending.

### Google Video Addition

| ID | Model | Exact model ID | Candidate settings | Gate |
|---|---|---|---|---|
| G01 | Veo 3.1 Lite | veo-3.1-lite-generate-preview | 720p, 4s, generated audio | Existing internal-testing route; confirm current account access |
| G02 | Veo 3.1 Fast | veo-3.1-fast-generate-preview | 720p, 4s, generated audio | Catalog unqualified; pending integration/qualification readiness |
| G03 | Veo 3.1 Standard | veo-3.1-generate-preview | 720p, 4s, generated audio | Catalog unqualified; pending integration/qualification readiness |
| G04 | Gemini Omni 1.1 Flash (separate, optional) | gemini-omni-1.1-flash | 720p, requested 3s, generated audio | Not Veo; duration is prompted, not exact; owner selects whether to include |

One output, prompt-only, 9:16 unless owner content requires another supported
ratio. Reuse existing evidence before generating. Do not remove current gates to
execute G02/G03. Verify official model IDs, endpoint, per-setting duration limits
and account rates at P3 before finalizing cases or a spending budget.

Google billing evidence is output seconds, NOT Seedance completion tokens.
Capture provider-billed seconds, returned clip duration/dimensions, rate/SKU,
audio, operation ID and matching billing export. A requested duration alone is
insufficient, especially for prompted Omni duration. Use actual billed quantity
for reconciliation, and record any difference from returned duration explicitly.

Conditional additions only for intended release tiers: G01 at 1080p; G02 at
1080p and 4K; G03 at 4K. The current catalog gives Standard 720p/1080p the same
unit rate; record 1080p runtime coverage separately without automatically adding
a paid duplicate. Reconfirm these rate branches against current official/account
evidence. High-resolution duration restrictions may require a longer clip, so do
not copy the 4s baseline into those cases without checking compatibility.
First-frame Google tests use existing authorized images only when that input
path is intended for release and lacks evidence; do not add one per model blindly.

Expanded inventory: 8 Seedance + 3 Veo = 11 baseline video evidence rows,
plus optional Omni and blocked Muse Video discovery. This count is not an
instruction to execute all rows or a claim they are all currently runnable.

## B. Image Evidence Inventory

One image/output, online, 9:16 where supported; owner supplies prompts later.
Reference images should be existing owned/authorized assets, not extra generation.

| ID | Model | Exact model ID | Candidate settings | Evidence |
|---|---|---|---|---|
| I01 | Seedream 5.0 Pro | dola-seedream-5-0-pro-260628 | 1K, no references | Low pixel-price tier; verify returned pixels |
| I02 | Seedream 5.0 Pro | dola-seedream-5-0-pro-260628 | 2K, no references | High pixel-price tier; verify returned pixels |
| I03 | Seedream 5.0 Pro | dola-seedream-5-0-pro-260628 | 2K, two references | Charge for reference after the first free input |
| I04 | Seedream 5.0 Lite | seedream-5-0-lite-260128 | 2K, no references | Lite per-output rate |
| I05 | Seedream 4.5 | seedream-4-5-251128 | 2K, no references | 4.5 per-output rate |
| I06 | Seedream 4.0 | seedream-4-0-250828 | 2K, no references | 4.0 per-output rate |
| MI01 | Muse Image 1.0 | muse-image-1.0 | Aspect ratio only, no references | Successful returned-image cost; reconcile existing 15 Credits |

Seven image evidence rows, preferably historical. Muse has no image-reference
or resolution selector in its current contract; do not fabricate such tests.
Auto dimensions, layer decomposition and multi-output billing are not added to
this paid batch. Existing automated parity/count tests remain separate.

## C. Required Evidence And Acceptance

For every row capture Job ID, provider task/request ID, exact model, timestamp
with timezone, requested settings, actual output dimensions/duration/fps when
available, reference count, output count and terminal status. Unknown values
remain explicitly missing; never infer actual fps from the estimator default.

Attach sanitized usage.completion_tokens (Seedance), billed output seconds
(Veo/Omni), successful returned-image counts (Muse), other metering fields if
applicable, billing quantity/unit, effective rate/source/date, discounts, free
quota, gross usage charge and net billed USD. Record app quote and actual Credit
settlement separately. Do not equate the POC charge with provider cost.
No keys, auth headers, signed URLs, private references or raw sensitive prompts.

- Match billing to the Job or an isolated identifiable usage interval. Wallet
  before/after alone is insufficient when other activity may exist.
- Reconcile actual metered quantity times applicable rate, discounts and rounding.
  Separate pre-generation estimate error from correctness of the actual cost formula.
- No universal arbitrary percentage tolerance: explain each discrepancy using
  recorded dimensions, tokens, duration, billing precision or rate conditions.
- A free-quota zero payment does not imply zero underlying usage cost.
- Failed/moderated Jobs: retain error and billing evidence, stop; do not pay for
  deliberate failure tests. Idempotency/refund tests use isolated automated fixtures.
- One success per model is baseline evidence, not blanket commercial qualification.
  Record approved model/input/resolution/audio scope, missing evidence and approval.

## D. Ordered Tasks And Gates

- [x] P1 Inventory existing versions, distinct cost branches and Muse integration gap;
  extend with Veo and optional Omni, explicitly preserving unqualified route gates.
- [ ] P2 Owner provides a prompt/content purpose per ID and optionally preferred
  aspect ratio/duration. Reuse existing assets/Jobs first; no prompt authored here.
- [ ] P3 Map evidence already available, confirm current provider/account rates,
  and calculate a proposed total spend for only the remaining rows. Owner approves
  the paid batch ceiling before any run. Resolve Muse Video model/API/documentation.
- [ ] P4 Only after P2/P3, write final manual test cases under _temp/test-case,
  reusing the existing evidence form and replacing the minimal draft's scope.
- [ ] P5 Owner executes one row at a time, baseline first. Review after each row;
  stop on missing usage, failure or unexplained charge. Never auto-retry.
- [ ] P6 Reconcile per-model results; add only necessary conditional rows.
- [ ] P7 Separate implementation approval: agree retail Credit/THB, margin/FX,
  then test quote/reserve/capture/refund/idempotency in focused fixtures before
  any POC-to-normal Credit transition. Keep unsupported scopes gated. Preserve
  accepted quote snapshots; no balance mutation or historical repricing.

The current delivery completes P1 only. No runtime configuration, adapter,
credit balance or test runner changed. Documentation reviewed against local
catalogs; no paid run or claim of new official provider-rate verification.
