# Image Provider Runtime Evidence Audit - 2026-09-05

**Status:** Existing evidence inventoried; operation-specific qualification
only
**Primary role:** QA And Release Engineer
**Reviewer:** Generative Media Pipeline review applied sequentially by the same
agent; no independent review claimed

## 1. Scope

Inventory existing actor-owned History and Credit evidence without generating
new images. A successful historical output proves that exact recorded
provider/model/operation completed; it does not prove every reference mode,
surface, ratio or visual-quality rubric for that model.

## 2. Runtime Evidence Found

History contains completed image output for:

- Gemini: `gemini-2.5-flash-image`, `gemini-3.1-flash-lite-image`,
  `gemini-3.1-flash-image`, `gemini-3-pro-image` and one legacy Imagen record.
- OpenAI: `gpt-image-1-mini`, `gpt-image-1`, `gpt-image-1.5` and `gpt-image-2`.
- xAI: `grok-imagine-image` and `grok-imagine-image-quality`.
- ModelArk: Seedream 4.0, 4.5, 5.0 Lite and 5.0 Pro.
- Meta Muse: three `muse-image-1.0` outputs, including one Face Creator Job.

The pricing policy contains published Credits for all currently routed models
above. A History `creditCost` can include resolution/reference adjustments and
must be reconciled to its immutable estimate/reservation snapshot rather than
compared only with base `publishedCredits`.

## 3. Closed Evidence In This Round

`meta-muse / muse-image-1.0` reference-free text-to-image is qualified only for
Playground, Comparison and Studio Face Creator. Job
`job_1788603556676_dywvlsppj` proves the Face Creator route, owned output,
History projection and exact 15-Credit reserve/capture lifecycle.

ModelArk Character Look Job `job_1788231304557_qn6mtllq3` proves one
Seedream 4.5 Character/Face-reference operation and its approved Look lineage.
It does not qualify Seedance video or every Seedream reference combination.

## 4. Holds

- Muse remains unsupported for references and therefore excluded from
  Character Sheet, Scene Builder, Fashion and Cinematic operations that require
  reference authority.
- Older successful records without normalized provider request provenance are
  retained as compatibility evidence, not upgraded by invention.
- Visual quality is accepted only where the creator supplied a result judgment;
  automated byte/schema checks do not replace that judgment.
- No broad provider requirement is marked complete solely from History counts.

## 5. Deterministic Verification

- 31/31 focused Muse/Provider Registry/Credit tests passed.
- 70/70 Provider Control cross-workflow server tests passed.
- 2/2 Admin Provider Control React tests passed.
- 7/7 shared engine-preference and availability resolver tests passed.
- Muse catalog/layout harness passed at 390/820/1440 in all supported themes.
- Live read APIs returned the owned Muse History record and current five-provider
  Admin inventory without exposing provider secrets or raw image bytes.

## 6. Decision

Close the Muse Face Creator check and retain operation-scoped evidence for the
other providers. Future promotion must name the exact surface, reference mode,
settings, cost evidence and visual rubric instead of using one provider-wide
qualified flag as a substitute.
