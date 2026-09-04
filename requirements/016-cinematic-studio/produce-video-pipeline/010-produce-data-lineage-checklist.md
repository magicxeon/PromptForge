# Produce Data Lineage Checklist

**Requirement ID:** `016-PVP-010`  
**Status:** Requirement complete; packet/reference/quote/authorization/attempt/probe lineage implemented, batch/export gates pending  
**Priority:** Mandatory cross-stage verification

## 1. Objective

Provide one reviewable checklist proving that no Story, Character, Look,
Storyboard, prompt, reference, provider, Credit, media, Timeline or export
authority is lost or silently replaced between stages.

## 2. End-To-End Lineage

```text
Project Version
  -> Scene Version
    -> Shot Version
      -> approved Storyboard Attempt
        -> approved Storyboard Asset Version/source fingerprint
        -> image provider/model provenance + downstream compatibility snapshot
      -> Character Profile Version + Cast assignment
      -> approved Look Version + Scene binding
      -> video packet/config/prompt fingerprint
      -> reference plan/input mode fingerprint
      -> quote/no-charge authorization or reservation/idempotency
      -> Generation Group/Job/provider task
      -> video attempt/usage/settlement
      -> clip operation/qualification tier
      -> video Asset Version/poster/last-frame/probe
      -> explicit Shot approval
  -> active Timeline Version
    -> export manifest/assembly Job
      -> final master Asset Version/poster/probe
      -> explicit final acceptance/Project completion
```

Every arrow is represented by a stable ID/version/fingerprint or a documented
derivation. Display names are never durable joins.

## 3. Stage Handoff Matrix

| Producer | Required authority | Consumer | Verification |
|---|---|---|---|
| Setup | target duration, ratio, platform, genre/audio intent | Story Plan / video policy | version and supported-output check |
| Cast | Character Profile Version, role and approved Look Version | Scene/Shot packet | owner/current binding check |
| Story Plan | Scene/Shot order, action, emotion, timing, audio and continuity | Storyboard / Produce compiler | structured schema and duration rollup |
| Storyboard | approved still attempt and immutable Asset Version | Produce first-frame plan | source fingerprint and current approval |
| Produce compiler | packet, prompt strategy and reference plan | Quote/Generation | deterministic fingerprints |
| Credits | quote/reservation/settlement | Generation/approval | exact bound selection and terminal state |
| Provider/Generation | provider task and normalized output | Assets/Cinematic attempt | idempotent task/output correlation |
| Assets | clip/poster/last-frame/probe | review and Timeline | owner, version, checksum and validity |
| Shot approval | current approved attempt/Asset Version | Timeline preparation | non-stale authority check |
| Timeline | order, trims, transitions and audio plan | assembly | immutable manifest fingerprint |
| Assembly | Job and final Asset Version | Finish/completion | final probe, settlement and current Timeline |

## 4. Per-Shot Checklist

Before quote:

- [ ] Project, Scene and Shot IDs/versions are current.
- [ ] approved Storyboard attempt and Asset Version exist.
- [ ] Character first-frame provenance and provider trust are server-derived
      when the selected video model requires them.
- [ ] Character roles resolve to pinned Profile Versions.
- [ ] visible Characters resolve to approved Scene Look Versions.
- [ ] action, start/end state, performance, camera, duration and audio are
      present and do not combine future Shot actions.
- [ ] continuity strategy matches authored transition.
- [ ] provider/model supports operation, input mode and every output setting.
- [ ] selected preview/draft/final tier is qualified and included in the quote.
- [ ] reference plan preserves authority and provider trust.
- [ ] packet, prompt and reference fingerprints are deterministic.

Before dispatch:

- [ ] quote is unexpired and exactly matches prepared selection.
- [ ] source/reference Assets remain authorized and fetchable.
- [ ] no-charge authorization or reservation/idempotency state permits one
      provider task.
- [ ] no browser-supplied compiled prompt replaces server authority.

Before review:

- [ ] provider task reached a normalized terminal result.
- [ ] usage/settlement state is known or visibly reconciling.
- [ ] output was copied to an immutable owner-scoped video Asset.
- [ ] poster and required last frame are persisted/recoverable.
- [ ] technical probe passes.
- [ ] source/packet/reference fingerprints still match current authority.

Before approval:

- [ ] no blocking technical, trust, audio or continuity finding remains.
- [ ] user reviewed the current attempt and explicitly approved it.
- [ ] approval pins attempt, Asset Version, probe and source fingerprints.

## 5. Batch Checklist

- [ ] eligibility is server-prepared from one Project snapshot.
- [ ] aggregate quote equals the sum/policy of included child quotes.
- [ ] one Group owns ordered child IDs and bounded concurrency.
- [ ] no-charge qualification or aggregate reservation policy is explicit.
- [ ] duplicate submit/retry produces no duplicate child or financial effect.
- [ ] partial failure preserves successful child outputs.
- [ ] Project updates are narrow and cannot overwrite newer unrelated edits.
- [ ] every child remains independently reviewable and unapproved by default.

## 6. Timeline And Export Checklist

- [ ] Timeline contains every required Shot exactly once in approved order.
- [ ] every selected video Asset Version is current and technically valid.
- [ ] every selected Asset satisfies the final-source policy, or the assembly is
      explicitly internal qualification evidence.
- [ ] trim/transition duration is server-calculated and shown identically in UI.
- [ ] required audio has approved authority; intentional silence is explicit.
- [ ] assembly manifest pins all source Versions and policy/config Versions.
- [ ] assembly Job is idempotent, recoverable and bounded.
- [ ] final master/poster/probe are durable Assets, not provider URLs.
- [ ] final duration, ratio, codec and audio match export policy.
- [ ] completion pins the current master and active Timeline fingerprint.

## 7. Lineage Read Model

Extend the existing bounded Cinematic operational read model rather than adding
a direct repository viewer. For owner/Support-authorized inspection it may
project:

- Project/Scene/Shot and approval versions;
- packet/prompt/reference/quote fingerprints;
- Group, Job, provider task, attempt and Asset IDs;
- Credit reservation/capture/refund/reconciliation IDs and status;
- Timeline, assembly Job and final master IDs;
- stale/blocking findings and their owning recovery stage.

It must not expose prompt bodies, signed URLs, raw provider payloads, private
references or unrestricted ledger data.

## 8. Failure And Recovery Ownership

| Failure | Owner | Recovery without duplication |
|---|---|---|
| stale Storyboard/Shot | Cinematic | edit/approve source, then prepare a new quote |
| incompatible reference/trust | Reference Processing / Generation | choose qualified strategy/model or repair authority |
| provider timeout | Generation/provider adapter | resume/poll original task before retry |
| output copy/poster/last-frame | Assets/Generation | recover derivative/copy from original task output |
| Credit reconciliation | Credits | reconcile original reservation/task; block approval |
| invalid media | Generation media validation | retry derivative if possible, otherwise new generation |
| stale Timeline source | Cinematic | replace only listed source and create new Timeline Version |
| assembly failure | Generation/media processor | retry original manifest idempotently |
| final Asset copy failure | Assets/Generation | copy existing rendered artifact before rerender |

## 9. Version Compatibility

Legacy Projects, attempts and tasks may have inferred operation/input mode or
missing new fingerprints. They remain readable and are labeled `legacy` in
diagnostics. New quote, approval and export actions require current preparation;
the system must not fabricate provenance for an old output. Additive migration
must not rewrite or delete historical evidence.

## 10. Acceptance

- A reviewer can trace one final master to every selected Shot, attempt,
  Storyboard source, Character/Look authority, Job, Asset and Credit record.
- Changing one authority produces a bounded stale finding at all true consumers
  and nowhere else.
- No stage joins records by title, Character name or array position alone.
- Legacy records remain readable while new actions require current evidence.
- The checklist is completed with links/test evidence for every implementation
  package before release.
