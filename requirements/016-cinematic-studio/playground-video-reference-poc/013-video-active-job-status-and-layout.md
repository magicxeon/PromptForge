# 013 Video Active Job Status And Layout

Status: implemented and deterministically verified; no provider request made.
Parent: [000-master.md](000-master.md).
Primary role: Product Requirement Architect.
Reviewers: Backend, UX and QA applied sequentially. A third reviewer is retained
because one defect spans durable Video status semantics, a shell-owned shared
indicator and responsive user-facing recovery state.
Triggered Skill: `implement-generation-workflow` because active video polling and
the shared Generation Job Center projection are part of the Generation lifecycle.

## Outcome

A Playground Seedance task returned as `provider_processing` must remain visible
as active work in the global Generation Job Center, continue polling, and present
its status in the Video result section without raw text escaping the media layout.
Completed video tasks must expose their persisted public video and poster URLs to
the Job Center projection.

## Scope And Ownership

1. Generation owns canonical active/terminal status classification and the Job
   Center projection.
2. Playground owns only the local Video result status presentation.
3. Existing Video task polling, provider submission, idempotency, references,
   Credits and media persistence contracts remain unchanged.
4. The task identifier may be shown as secondary diagnostic information, but
   raw provider status codes must not become an unstyled standalone row.

## Implementation Steps

1. Add `provider_processing` and Video media-persistence retry states to the
   Generation Job Center active status set.
2. Project `outputAsset.publicUrl` and its thumbnail/poster fields from completed
   Video tasks without exposing provider URLs or private inputs.
3. Replace the raw Playground status paragraph with a bounded status bar that
   uses a friendly localized state, an icon and a wrapping task identifier.
4. Keep provider Request ID visible only when the task reports an error.
5. Add focused server and React regression tests for active classification,
   result projection and the Video status bar.
6. Extend the existing Playground Video aggregate test script and run the
   focused groups before layout verification.

## Acceptance

- A `provider_processing` Video task increments `activeCount`, is returned by
  `scope=active`, and keeps the header polling every three seconds.
- A completed task projects its owner-safe local `publicUrl` and poster URL.
- The Video result shows a compact status bar inside its section at desktop,
  tablet and mobile widths with no page overflow or raw status line.
- The existing successful Seedream 5 -> Seedance 2.5 execution remains valid;
  this change performs no paid provider request.
- Image generation, Cinematic Produce, reference ordering, source eligibility,
  pricing and Credit settlement do not change.

## Focused Verification

- `node --test test/generationJobCenter.test.js`
- Playground Video workspace and Job Center indicator Vitest files.
- `node scripts/test-playground-video-references.mjs regression`
- `node scripts/test-playground-video-references.mjs ui`
- `node scripts/test-playground-video-references.mjs types`
- active-task layout check at 1440px, 820px and 390px.

## Verification Evidence

- Generation Job Center domain suite: 7/7 passed, including
  `provider_processing` active classification and durable Video media projection.
- Playground Video and Job Center aggregate UI suite: 49/49 passed.
- Playground Video Generation/Reference regression suite: 98/98 passed.
- TypeScript no-emit check, i18n catalog validation, production web build and
  `git diff --check` passed.
- Built `localhost:6500` layout passed at 1440px, 820px and 390px in English and
  Thai with one active header job, one bounded status bar, no raw provider status
  row, no clipped controls and no horizontal page overflow.
- Runtime read of `videotask_b370d1d96cc3e78c7427` returned `completed`, a local
  public Video URL, poster URL, `captured` billing and one estimated Credit.
