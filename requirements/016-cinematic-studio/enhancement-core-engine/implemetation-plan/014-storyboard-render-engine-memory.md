# Implementation Plan 014: Storyboard Render Engine Memory

**Status:** Complete  
**Owning requirement:** `../015-storyboard-render-engine-memory-and-deferred-prop-continuity.md`  

## Step 1: Record Scope And Deferred Gap

- [x] Define accepted-render persistence semantics.
- [x] Define actor isolation and catalog fallback rules.
- [x] Record prop appearance continuity as deferred, with no runtime change.

## Step 2: Consolidate Preference Ownership

- [x] Generalize the existing Storyboard batch preference module for both
  single-Shot and Generate All consumers.
- [x] Retain the existing actor-scoped storage key for compatibility.
- [x] Keep the stored shape limited to provider/model identifiers.

## Step 3: Add Reusable Engine Resolution

- [x] Add a pure catalog resolver beside the shared engine availability policy.
- [x] Prefer the last accepted engine only when it supports the current aspect
  ratio and required references.
- [x] Preserve an explicit unavailable state when no valid candidate exists.

## Step 4: Connect Storyboard Render Paths

- [x] Let `GenerationExperience` receive a caller-owned initial engine
  preference without owning Cinematic storage.
- [x] Restore the preference in a single-Shot render.
- [x] Persist the single-Shot selection only after accepted submission.
- [x] Restore the preference in Generate All.
- [x] Remove eager persistence on dropdown changes and persist only when at
  least one batch operation is accepted.

## Step 5: Verify And Close

- [x] Test resolver priority and capability fallback.
- [x] Test actor isolation and both Storyboard render entry points.
- [x] Run focused tests, TypeScript validation and diff hygiene.
- [x] Confirm no prompt, reference, approval, provider dispatch or Credit
  contract changed.

## Verification Evidence

- Focused Storyboard and engine tests: 18 passed.
- Full Web regression suite: 408 passed.
- TypeScript project check: passed.
- Scoped ESLint: passed with no warnings.
