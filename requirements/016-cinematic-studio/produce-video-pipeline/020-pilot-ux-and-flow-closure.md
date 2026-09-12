# Pilot UX And Flow Closure

Status: implemented and isolated UX/regression gate passed 2026-09-12.
Live-provider creative/speech quality remains unverified until the user pilot.
Owner: Cinematic UX and QA, with Cinematic direction review for the pilot sequence.

## Final Gate

1. Review the full scoped route: Scene direction and Opening option > multiple
   Dialogue & Sound entries > Shot navigation and effective source preview > video
   generation > Take preview/selection > rough sequence/timeline readiness.
   Include the approved clip ZIP manifest/partial-download flow.
2. Follow Momelo UI tokens and visual language. Compact hierarchy, consistent
   spacing, aligned inputs, readable long Thai/English content, predictable action
   positions, clear selected/preview states and no nested decorative cards.
   Preserve unrelated Setup/Cast/Engine/credit/result controls.
3. Compare screenshots of Storyboard/Produce queues and Scene editor at 390, 820
   and 1440px; check representative supported themes, keyboard/focus, dialog return,
   touch targets, scroll retention and no overlap/overflow. Use shared spinner for
   actual work, no fabricated progress or POC labels. Keep error/retry and loading
   states consistent, including partial completion and missing references.
4. Verify First Frame disabled by server policy cannot leave a misleading active
   image, an unexplained Generate lock, a hidden missing Cast condition or an
   inconsistent prompt. The effective mode must be visible before submission.
5. Test actor isolation, saved Project reload, stale quote/version handling,
   unchanged selected Take when a new one finishes, and no repeated billing.
   Report exact automated evidence separately from manual visual/creative review.
6. Use synthetic/local fixtures for automated flow and downloads. A paid pilot is
   user-controlled; agree on models, Shots and displayed Credits before live work.
   Record provider acceptance, speech accuracy and continuity as observed results,
   not guaranteed outcomes. No automatic full-film generation as a release test.

## Closure Boundary

This gate closes Scene authoring and Shot review usability only after evidence.
Do not claim the final movie assembly, reliable dialogue/lip sync or whole MVP is
complete. Existing Finish export and provider qualification gaps must remain
explicit. No runtime requirement is complete from a document or screenshot alone.

## Evidence And Decision

- Requirement traceability, protected behavior and exact commands are recorded
  in implementation-plan/009-take-review-and-shot-navigation.md.
- `node scripts/test-cinematic-video.js full`: 153 backend + 50 UI checks passed,
  including approval/reselection, stale packet/source/version, actor ownership,
  cue round-trip, effective no-frame modes and unchanged Credit lifecycle tests.
- ZIP fixture checks passed for readable original bytes, selected ordering,
  partial consent, ownership/path/hash/size rejection, cancellation and missing
  file failure. No archive is retained on disk.
- Actual React browser fixture checks passed for EN/TH at 390/820/1440px:
  whole-card selection/reorder, retained still omitted in Looks/text-only tiles,
  Scene cue edit/save, Generate enabled with disabled First Frame, older Take
  preview/load-more, ZIP partial acknowledgment and no horizontal overflow.
- Visual inspection covered Scene editor, Storyboard/Produce and ZIP on mobile
  and desktop, plus fashion/creative Takes at 820px. Shared spinner and keyboard
  semantics are covered by UI tests. A full assistive-technology audit and real
  device performance profiling have not been performed.
- `npm.cmd run build:web`, catalog validation and whitespace checks passed.
  No backend worker restart, user Project mutation or paid generation occurred.

No blocking issue remains in the scoped isolated checks. Decision: conditional
pass for the user-controlled pilot, not a general production/whole-MVP release.
Provider acceptance, multi-line speech timing/lip sync and opening/continuity
quality require real chosen-model outputs. Larger ZIPs near the 128 MiB media
limit may be memory-intensive on older phones; individual downloads remain.
Backend 6500 was unavailable, so browser evidence uses intercepted fixtures at
Vite 6501 rather than claiming live API end-to-end coverage. Normal startup loads
the new environment switch and server handlers. Review disciplines were applied
sequentially by one agent; independent reviewer execution was unavailable.
