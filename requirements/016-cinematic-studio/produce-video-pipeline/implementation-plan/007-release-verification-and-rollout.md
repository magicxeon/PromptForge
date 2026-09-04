# Package 007 - Release Verification And Rollout

**Plan ID:** `016-PVP-IP-007`  
**Status:** Pending  
**Requirement owners:** all files in `..`  
**Primary capability:** QA and release governance  
**Reviewers:** Generative Media, Commercial Integrity, Security/Privacy, UX/UI

## 1. Goal

Independently trace requirements to evidence, remove only superseded temporary
paths and decide paid release, internal-only qualification or rollback.

## 2. Steps

### 007.1 Requirement trace

Map every acceptance criterion in `../000` through `../010` to a passing test,
manual record, live-provider record or named blocking decision. Complete the
data-lineage checklist for a final master.

### 007.2 Full regression

Run focused and full relevant server tests, React tests, TypeScript, production
build, i18n parity, config/JSON parsing and `git diff --check`. Compare with the
Step 0 baseline and classify every difference.

### 007.3 UX verification

Inspect Produce and Finish at 390px, 820px and 1440px across all enabled themes
and Thai/English. Verify keyboard/focus, loading/error/recovery, long text and no
overlap/horizontal page overflow. Recheck protected Storyboard/Playground flows.

### 007.4 Provider/media qualification

Review Seedance evidence, capability/config freshness, reference trust, output
quality, probe results, timeout/recovery and provider terms/account entitlement.
Review one complete multi-Shot sequence and final master, not isolated clips.

### 007.5 Financial/security review

Trace estimates, reservations, captures, refunds and reconciliation for
single, batch, retry and assembly. Test cross-actor denial, private media,
download authorization, log redaction and temporary media cleanup.

### 007.6 Cleanup

Remove only compatibility inference or duplicated UI paths whose callers and
deletion checkpoint are proven. Retain version readers for historical records.
Reconcile requirement and architecture paths if actual canonical ownership
changed during implementation.

### 007.7 Rollout decision

Record one decision:

- **paid release:** all deterministic, live, commercial, security and UX gates
  pass;
- **internal only:** lifecycle works but one or more named paid/provider/quality
  gates remain;
- **rollback:** a P0/P1 integrity or protected-workflow regression remains.

Feature policy separately controls Seedance, batch and final assembly.

## 3. Required Evidence

- source diff and scoped-UI review;
- test command/result inventory;
- provider qualification records and dates;
- Credit ledger/reconciliation traces without private data;
- multi-Shot Group and final master lineage report;
- media probe and predicted-duration comparison;
- viewport/theme/localization screenshots;
- performance timing for preparation, queue, provider, copy/probe and assembly;
- remaining risks, owner and next review date.

## 4. Exit Gate

- No unexplained requirement, data-lineage or protected-regression gap remains.
- Exposure flags match the recorded decision.
- Historical tasks/Assets remain readable and no evidence was deleted.
- Paid release, if selected, has explicit Commercial and QA approval.
- The master requirement status is updated truthfully.

## 5. Stop Conditions

- Any duplicate provider/Credit effect or cross-actor access is observed.
- Final media is unplayable, stale, incomplete or not durably owner-accessible.
- Live provider evidence is older than relevant capability/model changes.
- A protected workflow regresses without an explicit approved requirement.
- A passing result depends on hidden manual data repair.

## 6. Rollback

Disable the affected exposure flag, preserve all audit/history records and
restore the last qualified config/strategy version. Rollback must not use
destructive repository or filesystem operations against user/runtime evidence.

