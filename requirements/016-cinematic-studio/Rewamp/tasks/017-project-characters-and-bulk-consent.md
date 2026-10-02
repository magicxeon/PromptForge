# 017 - Project Characters And Bulk Consent Tasks

Date: 2026-10-01. Status: implemented; focused checks passed; live/provider UAT pending.
Owner: [requirement 017](../017-project-characters-and-bulk-consent.md).
This packet coordinates existing screen owners; it does not reset prior work.

## 1. Delivery Order

| Task | Work and boundaries | Depends on | Acceptance | Status |
|---|---|---|---|---|
| PC01 | Inventory live callers/routes, bulk entry points, Look unlink/import contracts and focused fixtures. Separate remove-Character from remove-Look. Register small test groups before changes. | None | Baseline for CC01-CC10 | Verified; runner registered after fixture expansion |
| PC02 | Correct Chapter Outline target/focus/scroll behavior using current layout; keep Build Chapters and generated list. | PC01 | CC06 | Verified in focused browser checks |
| PC03 | Add Project Story/Characters route shell and 75/25 buttons; root resolution, old `/cast` compatibility, return context/draft recovery. | PC01 | CC07-CC08 | Verified in isolated route/browser checks |
| PC04 | Compose full Cast workspace from existing components; remove writer right-panel Character settings and redirect manage actions. Retain contextual selectors. | PC03 | CC07-CC10 | Implemented; scoped checks passed |
| PC05 | Add Look-specific unlink modal and owning mutation/invalidation if absent. Review impact first; preserve originals, historical outputs and other Projects. | PC01, PC04 | CC01, CC09 | Verified in isolated mutation/UI checks |
| PC06 | Integrate existing Momelo Look chooser, trusted-origin upload and Playground entry/return with current Profile review/import flow. | PC04-PC05 | CC02-CC03, CC09 | Verified in fixture import/Review checks |
| PC07 | Enforce mandatory bulk consent across inventoried entry points; exact totals, no opt-out, unified regeneration impact, no change to billing. | PC01 | CC04-CC05 | Verified; paid dispatch UAT separate |
| PC08 | Pair Shot First Frame preview with direction/timeline editor; responsive layout, source states, image refresh and preserved draft/actions. | PC01 | CC09-CC11 | Verified in scoped state/browser checks |
| PC09 | Scoped regression/browser review, remove only verified dead panel plumbing, record evidence and user UAT instructions. | PC02-PC08 | CC01-CC11 | Scoped review delivered; live UAT pending |

PC07 can be a separate focused slice, but shared file edits must be serialized.
Keep `CinematicFullStoryWriter.tsx`, route orchestration, locales and stylesheet
integration under one owner. Do not introduce separate services for each task.
B5 is recorded as user-resolved; it is not a pending fix or a claim of agent QA.

## 2. Task Gates

### Pre-Implementation UX Review Log

Independent subagents are unavailable. UX reviews below are sequential reviews
against the UX charter and review-product-ux skill, performed before each slice.

- PC01: baseline inspected. Route `/cast` is Full Story; Character management has
  reusable components but no dedicated page. Preserve root-owned Cast and drafts.
- PC02: approved scoped approach: focus the outline heading through a component
  ref and scroll it below chrome; keep its current section and adjacent tools.
- PC03-PC04: approved list/detail Cast destination with 75/25 navigation controls,
  mobile list-to-detail/back, return context and existing writer draft recovery.
  Remove only management settings from right rails; preserve Assist/History/actions.
- PC05-PC06: approved per-Look removal modal naming affected selections and retaining
  originals, with a categorized source picker and explicit origin/review feedback.
- PC07: approved mandatory confirmation for all bulk operations; one visible scope,
  actual Credits in yellow, no opt-out, disabled stale/unavailable quote and Cancel.
- PC08: approved contained image beside native textarea, stacked image-before-editor
  at narrow widths, source status and existing tools action; no auto-generation.
- PC09: acceptance evidence must cover adjacent actions and 390/820/1440 layouts.
  Browser and automated evidence is recorded in section 6 below.

Follow-up UX review before corrections: Look tools must wrap with usable button
widths; import dialog must sit above its overlay and support real pointer input;
cancel must restore the originating unlink control's focus. Preserve the existing
modal, source selector and image-viewer owners. These findings were corrected and
checked before proceeding to handoff.

### PC01 - Baseline And Contract Decisions

- Read 004/006/011/013/016 and the architecture master alongside current code.
- Confirm current root/Chapter Cast sharing, how removing a Look affects saved
  reference selections and where owned generation hashes are available.
- Inventory actual initial/regenerate bulk actions and distinguish unbilled
  writing proposals from billable media. Never implement speculative bulk APIs.
- Capture isolated fixture cases: approved-but-unselected Look, selected Look,
  multiple Looks, unavailable original, two Chapters sharing Cast, pending Job,
  profile opt-out and missing quote. No live user data in committed fixtures.
- Use existing test runner and recovery contracts. Any proposed new endpoint must
  name its owning application facade and strict request/response schema first.

### PC02-PC04 - Navigation Before Management

- First isolate the anchor fix and test with a long Full Story/Chapter list.
- Add the new Characters route without changing the meaning of existing `/cast`.
- Integrate shared navigation for authoring pages, then verify drafts and context
  before moving Character management. Do not remove the old panel until its actions
  have an accessible destination and compatibility tests pass.
- Move only Character settings. AI Assist, revision History, generated Chapters,
  Build Chapters and protected production components are regression assertions.
- Verify empty Cast, selection, deep link, unavailable Character and chapter-origin
  routes; loading/error states never show an empty unexplained screen.

### PC05-PC06 - Asset Safety

- Reuse/refine existing mutations; validate owner and optimistic version on server.
- Preview affected selections before unlinking; atomically update current binding
  state through Cinematic, not raw JSON or another capability's repository.
- Keep historical source lineage. Never delete library assets for project unlink.
- Trust upload provenance only after server verification against an authorized
  Momelo Look Sheet source. No filename-only or client-supplied trust flag.
- Use Profile approval/review and immutable versions; no automatic approval bypass.
- Verify cancellation/failure, other Project isolation, absent source and edited
  file rejection. Reusing a Look must not call a generation provider.

### PC07 - Consent Safety

- Extend shared consent with explicit mandatory bulk semantics; do not globally
  disable the user's single-operation opt-out.
- Reuse existing selection/review modal when it can show all required consent
  information. Eliminate duplicate confirmation, not required safeguards.
- Test exact quoted sum, skipped items, one-item bulk, zero-cost/unbilled writing,
  unknown billable amount, quote changes, actor changes, cancel and double-click.
- Keep retry/idempotency, durable Jobs, reservations and settlement under existing
  owners. Backend/Commercial review occurs before consent slice sign-off.

### PC08 - Paired Shot Image And Script

- Extend `CinematicShotWriter.tsx` and its scoped styles/tests, reusing the existing
  First Frame source/status and generation entry. No second image generation form.
- Relocate the existing preview next to the native direction/timeline textarea;
  keep its tools action and remove only the former duplicate preview placement.
- Test empty/candidate/approved/stale/error/pending states, two-Shot switching,
  late results, query refresh and unsaved drafts. No auto-generation on entry.
- Browser-check 390/820/1440px with portrait/landscape sources and long Thai text;
  image fits without cropping and editor remains readable. Preserve all sibling
  actions and Render/Queue behavior. This task is independent of the B5 incident.

### PC09 - Review And Closure

- QA checks focused automated evidence plus browser screenshots at 390/820/1440px,
  TH/EN, supported themes, keyboard focus, reduced motion and narrow tab labels.
- Ownership/privacy review covers library selection, upload and unlink scope.
- Document which live paths/provider behavior remain untested. Independent review
  may be unavailable; disclose sequential review instead of claiming independence.
- Only remove agent-owned obsolete panel plumbing after all callers are migrated.
  Do not remove Character components still used by Scene/Shot selectors.

## 3. Focused Validation Plan

Reuse `scripts/test-cinematic-video.js`. All selectors below are now registered.
They run mocked fixtures only and fail on errors; no automatic aggregate run.

| Selector | Coverage |
|---|---|
| `rewamp-cast-navigation` | Anchor, 75/25 controls, routes, removed settings panels, drafts, root Cast, old links |
| `rewamp-cast-assets` | Unlink scope/version/ownership, provenance upload, review/bind, original retention |
| `rewamp-bulk-consent` | All bulk entry points, totals, opt-out exception, invalidation, cancel, retries |
| `rewamp-shot-frame-layout` | Paired preview/editor, responsive/source states, Shot switching, draft and adjacent-action preservation |
| `rewamp-cast-017` | Explicit deduplicated aggregate of only the four groups above |

Existing relevant selectors available for targeted baseline/regressions are
`rewamp-full-story`, `rewamp-look-references`, `rewamp-confirmation-authoring` and
`rewamp-confirmation-media`. Run only the subset affected by a task, not all suites.
Use installed repository dependencies and mocked provider/API fixtures. Extend an
existing owning browser verification script for route fixtures rather than create
a second browser runner. Record its exact invocation when implemented.

Installed dependencies are required; browser validation additionally requires
Playwright Chromium. Commands:

```powershell
node scripts/test-cinematic-video.js rewamp-cast-navigation
node scripts/test-cinematic-video.js rewamp-cast-assets
node scripts/test-cinematic-video.js rewamp-bulk-consent
node scripts/test-cinematic-video.js rewamp-shot-frame-layout
# Explicit final task-only aggregate, not an automatic/full product run:
node scripts/test-cinematic-video.js rewamp-cast-017
node scripts/verify-cinematic-shot-workspace.mjs --cast-017 --isolated
npm run typecheck --workspace web
```

All checks fail on errors and must not start paid generation, modify live records,
reset billing preferences, migrate data or restart workers. Provider UAT is separate
and requires the user's informed initiation. Section 6 separates isolated evidence
from the live UAT checklist below.

## 4. Manual UAT After Implementation

1. Open an existing `/cast` link: Full Story still opens. Switch Story/Characters
   and Back/Forward, including from a Chapter/Shot; drafts and selection survive.
2. Verify tab widths are 75/25 but content occupies its own page. Confirm no writer
   right-panel Character settings remain and AI Assist/History still work.
3. Use Chapter Outline under Build Chapters with a long story: correct heading is
   visible/focused; no unexpected scroll to Characters or footer.
4. Select an existing Look, upload a verified original, try an unrelated/modified
   image and follow the Playground generation link back to the same Character.
5. Cancel then confirm project Look unlink; original remains in library, other
   Projects/history stay intact, affected selections explain what needs choosing.
6. With single-operation confirmation opted out, open each bulk action: mandatory
   modal still appears with correct scope and Credits. Cancel does nothing.
7. Change batch selection/quote while reviewing; stale confirmation cannot dispatch.
   Confirm once only in separately authorized paid UAT; verify no duplicate Jobs.
8. Confirm the previously resolved First Frame case still uses its selected Scene
   Look. Do not restore old empty selections or bypass approval to reproduce it.
9. Open a Shot: view its First Frame alongside direction/timeline, edit text, open
   the image viewer and verify the draft survives. Switch Shots after saving and
   verify matching images; inspect stacked mobile layout and empty-image state.

## 5. Prior Documentation Delivery Evidence

2026-10-01: owning requirement, task packet and cross-document precedence links
written. Based on code/configuration and read-only runtime-data inspection from the
discussion. B5 resolved by user report. Implementation, automated runtime tests,
browser verification, paid calls and live mutations are not part of this delivery.

Documentation checks: scoped `git diff --check` passed; relative Markdown links
in both new documents resolve. Two documents added and five existing requirement/
index files updated. No source files or runtime data changed by this task.

Follow-up: B6/CC11 adds the paired First Frame/timeline requirement and PC08;
closure moves to PC09. Nine tasks are now planned. This addition also changes
documentation only; runtime/browser acceptance remains pending implementation.

## 6. Implementation Handoff - 2026-10-01

### Delivered Behavior

- Story and Characters are route-backed, separate destinations. Controls use
  75/25 widths; Cast uses responsive list/detail rather than the writer sidebar.
  Chapter/Shot membership and reference selectors remain in their own contexts.
- Chapter Outline focuses the actual outline heading. Full Story and Chapter
  right rails retain Assist/History and their existing actions, without Cast settings.
- Root-owned Look unlink reviews affected Scene/Shot selections before an atomic
  version/fingerprint-checked mutation. Other Projects and original assets stay
  untouched. Historical Takes/receipts remain; affected current approval/selection
  becomes stale rather than silently switching to another Look.
- Momelo library selection and verified original-file upload enter Profile Review.
  Ownership/category/content hash are checked on server; identity and Look approval
  are not bypassed. The Playground Look Sheet link uses its current image submode.
  The selected Character is a URL parameter: browser Back returns to that Project/
  Character, including refresh. No new cross-feature generation-return controller.
- Initial and regenerated bulk writing actions confirm with explicit scope and
  0 actual charged Credits under the current unbilled proposal workflow. Advisory
  writing estimates are not presented as a debit. Media bulk confirms the exact
  quote total in yellow every time, even with profile opt-out or a zero-credit quote.
  Batch setup/selection is distinct from spending consent, not a second debit.
  Expired quotes disable submission, refresh through the owning query and require
  new confirmation; parameters/actor changes invalidate consent. Single-action
  opt-out and backend estimate/idempotency/settlement stay unchanged.
- Shot First Frame is paired with the native direction/timeline editor, contained
  rather than cropped, with the existing full viewer and tools action. Drafts
  survive image refresh; Shot switching updates image and text together. Selected
  image remains during replacement, with pending/review/failure and unavailable
  image feedback. No automatic provider request or new polling owner.

### Files And Public Contracts

New source modules, all under `web/src/features/cinematic/components/`:
`CinematicProjectNavigation.tsx`, `CinematicCharactersWorkspace.tsx`,
`CinematicMomeloLookImport.tsx`, `CinematicWritingConsent.tsx`.
New focused tests: `CinematicProjectNavigation.test.tsx` and
`CinematicMomeloLookImport.test.tsx` in that same owner folder.

Existing changes: Cinematic route/builders, Full Story/Chapter/Scene/Shot writers,
Chapter Outline, shared Cast and Look components, Storyboard bulk dialog, client
API/Zod contracts, shared `ConfirmDialog` and `useCreditConfirmation`, TH/EN
`cinematic.json`, scoped `cinematic.css`, owning server services/routes/tests and
the existing selectable test/browser runners. No files moved; no new runtime
data directories or migrations. Unrelated post-processing work is untouched.

New endpoints through existing facades:

```text
GET    /api/cinematic/projects/:projectId/cast/:assignmentId/looks/:lookId/removal-impact
DELETE /api/cinematic/projects/:projectId/cast/:assignmentId/looks/:lookId
POST   /api/character-profiles/:id/looks/import-momelo
```

DELETE submits `expectedVersion` plus `impactFingerprint`; both are rechecked
inside the existing atomic workspace mutation. Import submits pinned identity,
owned generation id, explicit identity/view confirmation and optional uploaded
asset id. The retired `import-generated` HTTP route remains retired.

### Review And Evidence

Primary Product Requirement Architect; UX reviews precede each slice. Backend/
ownership review covers asset mutation/import; Backend/Commercial review covers
the consent slice; UX/QA review covers closure. Roles were applied in successive
stages, not as independent or concurrent subagents. No unresolved deterministic
blocker was found in the scoped checks; this is not production/provider approval.

1. `node scripts/test-cinematic-video.js rewamp-cast-017`: 43 backend and 120 UI
   tests passed (163 total). Eleven UI files, two backend files; no full product
   suite. Includes wrong actor/identity/source/category/hash, changed usage impact,
   unrelated Project isolation, retained originals/history, route compatibility,
   draft recovery, zero-credit/mandatory consent, expired ISO/numeric quotes,
   selection/price/actor invalidation, double-click, cancel and frame replacement.
2. `node scripts/verify-cinematic-shot-workspace.mjs --cast-017 --isolated`:
   passed with intercepted fixture APIs. TH/EN x 390/820/1440px x default/fashion/
   creative themes, reduced motion: tab ratio, outline focus/visibility, mobile
   list/detail, source picker pointer hit-test, unlink cancel/focus, image contain,
   full-viewer close, draft preservation and no horizontal overflow. 72 screenshots
   in `C:\Users\punya\AppData\Local\Temp\mpf-shot-workspace-jhbwAe`.
   Visual inspection found and corrected compressed tool buttons and an overlay
   stacking defect; the final run verifies those fixes.
3. `npm run typecheck --workspace web`: passed. Focused ESLint: no errors;
   one existing Shot writer preparation-effect dependency warning remains. No
   unrelated recovery-hook refactor was performed. Scoped `git diff --check`
   passed; TH/EN JSON parsing, all 1,944 keys and interpolation-variable parity
   passed. A final asset-only rerun (43 backend + 12 UI checks) passed after adding
   in-flight unlink feedback/cancel protection. No unrelated suite was run.

Performance/privacy: trusted-source pages retain at most five pages in actor-scoped
transient query state; file input is capped at 30 MB and only an asset id reaches
Profile import after upload. No durable Base64. The batch expiry timer has one
open-quote scope, server expiry TTL, no interval and cleanup on close/change/unmount.
No speculative throughput improvement or new global media cache is claimed.

### Remaining UAT And Runtime Notes

- No paid image/video/text-provider call, wallet change, live unlink/import or
  live Project mutation was run. Provider policy, actual long generation and
  human identity/Look review remain separate, user-initiated checks.
- Browser checks use isolated feature fixtures, not the complete live application
  shell. Verify integrated header/footer and actual root/Chapter data using the
  section 4 checklist before production release. Automated fixtures preserve
  original/output records; inspect a real library upload/Review round trip in UAT.
- Local backend port 6500 was not running at handoff. A frontend Vite preview is
  started at `http://127.0.0.1:6502/create/cinematic`; API-backed use needs the
  existing application server. `scripts/start-dev.bat` rebuilds and starts the
  normal 6500 application when the user is ready. No workers were restarted.
- Re-run only the affected selector after follow-up changes. The aggregate above
  is explicit and safe for later Cinematic UAT preparation, not a paid smoke test.
