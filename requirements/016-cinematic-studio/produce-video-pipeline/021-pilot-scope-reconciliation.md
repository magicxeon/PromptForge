# Pilot Scope Reconciliation

Status: implemented with isolated verification on 2026-09-12; see plan 009 for
evidence, final checks and live-provider UAT boundaries.
This document resolves older conflicts for requirements 014-020 and plan 009.

Follow-up: the user subsequently authorized Season/Chapter implementation.
Enhancement-core-engine/026-028 supersedes only the Series deferral below; all
other pilot decisions and protected workflows remain unchanged.

## Binding Decisions

- 017 supersedes optional First Frame defaults only for Seedance. Storyboard
  stills and approvals remain stored. Effective policy is visible before quote;
  no silent frame removal at dispatch, automatic retry or added POC notices.
- A no-visible-Cast Shot uses a distinct text-only reference mode when supported.
  looks_only retains its meaning: selected Cast sheets. No invented Character.
- 018 multi-line Dialogue & Sound is in scope. Exact-speech, TTS, dubbing and
  lip-sync qualification remain separate. Preserve existing arrays and user text.
- 019 cinematic opening is a first-Scene creative intent, not a title/logo render
  or the time-zero First Frame of every Shot. Existing Projects default off.
  Reuse existing author-directed AI calls and proposal review, no new paid call.
- 014 separates preview from selected Take through existing approval authority.
  015 changes only full-card interaction and reference-mode thumbnail, not the
  surrounding navigation, controls, status or established media workflows.
- 016 ZIP scope: explicitly selected Takes in Scene/Shot order, one per Shot.
  Ready subset requires clear acknowledgment of gaps; no automatic latest Take.
  It packages original local clips, not a final movie or generated media.
- Series remains design readiness only under enhancement-core-engine/022. Future
  user hierarchy is Series/Project container > Season > Chapter > Scene > Shot.
  A Chapter remains a separately versioned production unit, reconciling the old
  one-episode-per-Project technical concept without rewriting current Project IDs.
  No Season/Chapter UI, dummy records, database migration or shared mutable Cast
  is introduced here. Opening intent is production-unit scoped, so future Chapters
  can each have an opening. Standalone films remain valid.

## Ownership And Gates

Primary Product Requirement Architect; Backend/security, UX, Cinematic and QA
reviews applied sequentially to their affected slices. More than three review
disciplines are needed across this set because it includes media authorization,
server dispatch policy, narrative direction and shared UI; not concurrent roles.
Skills: implement-generation-workflow, design-cinematic-experience,
review-product-ux, verify-release-regressions; no pricing/ledger algorithm changes.

## Execution Order

1. Catalog policy and quote/submit guards; effective no-frame/reference modes.
2. Dialogue array editing and authored opening contract/prompt configuration.
3. Shared Shot cards and independent Take preview/approval.
4. Selected-clip packaging through existing authorized Assets boundaries.
5. Isolated regression groups, responsive browser checks, build and 020 UX review.

No destructive backfill, live paid generation or worker restart. Record evidence
per task before moving to the next. Extend owning test runners with short groups.
Retain all pre-existing worktree changes and working sibling workflows.
