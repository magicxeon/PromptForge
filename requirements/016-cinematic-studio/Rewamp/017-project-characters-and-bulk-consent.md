# 017 - Project Characters Workspace And Bulk Consent

Navigation presentation supersession: [018 BV05](018-project-brief-and-navigation-visual-refresh.md)
replaces the historical 75/25 tabs with a compact Project Header and a single
Characters / Back to story link. Separate destinations and return-context ownership remain.

Date: 2026-10-01. Status: implemented with focused checks; live/provider UAT pending.
Owner: Cinematic Studio.
Primary: Product Requirement Architect. UX review is applied sequentially by the
same agent, not independent agent approval. Implementation requires QA; the bulk
consent slice also requires Backend/Commercial review, and Look import/unlink
requires ownership/privacy and destructive-scope review before release.

The user requires UX/UI review before implementing every task in this packet.
Record the task's user flow, component reuse, responsive/state decisions and
preserved neighboring actions before editing its implementation. Reviews are
sequential role-based reviews by this agent because independent subagents are
unavailable; do not describe them as independent approval.

## 1. Confirmed Scope And Precedence

This packet records the five discussion batches, the user's final corrections
and the subsequent Shot First Frame/timeline layout addition (B6).
It extends 004 (Looks), 006/011 (navigation/shared Characters), 013 (Chapter Outline)
and 016 (confirmation), without duplicating their underlying business services.
Where these documents disagree, this packet governs only the changes below.

| Batch | Confirmed outcome | Delivery state |
|---|---|---|
| B1 | Remove a project Character's Look binding with a Momelo confirmation modal; retain original library media. Upload/select Momelo-generated Look Sheets and link to their Playground entry. | Implemented; isolated checks passed |
| B2 | Every Bulk AI Generate action needs a modal with scope and total actual Credits, including initial generation and regeneration; never skip through profile opt-out. | Implemented; scoped consent checks passed |
| B3 | Fix navigation from **Chapter Outline under Build Chapters**, not a Character Outline action. | Implemented; browser focus/scroll passed |
| B4 | Two separate Project destinations: Story and Characters. Remove Character settings from writer right panels. Tab buttons occupy Story 75% / Characters 25%; content is not split 75/25. | Implemented; route/layout/recovery checks passed |
| B5 | First Frame block on the reported Shot was a missing Scene/Shot Look selection; user confirms it is resolved. | User-resolved; no fix authorized in this packet |
| B6 | Show the Shot First Frame alongside **Shot direction and timeline** when opening the Shot writer. | Implemented; scoped state/layout checks passed |

Keep native textareas, all existing story/revision operations, Chapter/Scene/Shot
selection, Engine & Target Output, Render/Take UI and Queue behavior. Do not start
paid generation, change prices or edit live Project records for this delivery.

## 2. B1 - Look Sheet Selection And Unlinking

### 2.1 Meaning Of Remove

- Label the action as removal from this Project/Character, not deletion from the
  media library. Keep Character Profiles, original Look versions, source files,
  generation records and existing rendered outputs intact.
- Use the shared Momelo confirmation modal, never browser alert/confirm. Show
  Character, Look name/thumbnail and any affected Scene/Shot selections. Cancel,
  Escape and closing do not mutate anything; restore focus to the trigger.
- Remove only the selected project-level Look association. Do not remove the
  Character or another Project's bindings. Existing remove-Character and detach-
  Profile actions remain distinct, with unambiguous copy and modal confirmation.
- Before confirming, explain affected inherited selections. On success, clear or
  mark affected current references as unresolved through the owning domain use
  case; do not silently replace with another Look. Keep historical Takes and
  immutable provenance. Reuse existing production-readiness/invalidation rules.
- Server rechecks actor ownership and current Project version. Failure keeps the
  previous UI selection and offers retry; duplicate clicks submit once.

### 2.2 Sources And UX

The Characters destination offers three explicit actions:

1. Select an existing authorized Momelo-generated Character Look Sheet.
2. Upload an image file originally generated as a Look Sheet in Momelo.
3. Open **Playground / Character Look Sheet** to generate one, preserving a safe
   return to the current Project and Character.

The chooser explains where to generate a supported sheet and provides an internal
link to `/create/playground?media=image&imageMode=look-sheet`. Respect the existing
feature exposure policy. If unavailable, show the reason rather than a dead link.
Filter library choices by Look Sheet category and authorized ownership/access;
do not mix arbitrary Scene images into this picker. Reuse bounded source queries,
loading/empty/error/retry states and visible selection feedback.

An uploaded filename or user checkbox is not proof of Momelo origin. Reuse trusted
generation provenance and an exact content-hash/original-record match where
available. Verify the record's category and access on the server. If no trustworthy
match exists, explain that origin could not be verified and offer library selection
or new generation. Edited/cropped/re-encoded files may not match; do not claim
visual similarity proves origin. Do not create an unverified bypass.

Reuse Character Profiles' import/review/approved-version workflow. Selection and
upload do not bypass identity compatibility, rights review or required approval.
Reusing an existing sheet starts no image generation and incurs no generation
Credits. New paid generation follows existing estimate and consent contracts.
Any later separately billed processing would need its own approved requirement.

## 3. B2 - Mandatory Bulk Confirmation

- Inventory and cover every Cinematic Bulk AI entry: all Chapters, all Scenes in
  the selected Chapter, all Shots in the selected Scene, batch First Frames, and
  any existing bulk Look/video action. Do not invent absent bulk features.
- Both the first run and reruns require explicit confirmation. This policy still
  applies if only one eligible item remains in an operation invoked as bulk.
- Profile `confirmCreditUsage=false` applies only where single-operation opt-out
  is supported. It must never suppress bulk confirmation. Bulk modals have no
  opt-out checkbox and do not modify the stored single-operation preference.
- Show the named operation, Project/Chapter/Scene scope, actual eligible item
  count, skipped items/reasons, and the total of current authoritative quotes.
  Credit amounts use the shared yellow semantic treatment and no currency amount.
- Do not equate advisory writing estimates with charges. Currently unbilled
  operations remain unbilled and are labelled as such, still with confirmation.
  An unknown billable quote must never appear as zero or free.
- Billable quote loading/error, expiry, insufficient Credits or no eligible work
  disables submission with a readable reason. Refresh changed quotes and require
  explicit confirmation again. Actor, selection, provider/model, parameters or
  input changes invalidate the previous consent snapshot.
- Include regeneration/replacement impact in the same modal where practical,
  explaining proposal generation versus Apply. Do not stack identical financial
  and destructive confirmations. Applying proposals keeps its existing safeguards.
- Cancellation dispatches nothing and reserves no Credits. Confirm once through
  the canonical Generation/writing facade, preserving idempotency and estimate
  validation. Do not silently buy a new batch on timeout or partially failed retry.
  Requoting a new retry scope requires new consent.
- Existing Jobs continue under their durable owner if the user navigates away;
  this change introduces no page-local queue, settlement or polling loop.

## 4. B3 - Chapter Outline Navigation

Evidence: `CinematicFullStoryWriter.tsx` currently scrolls to the global ID
`cinematic-chapter-outline`. That section is after the Full Story and generated
Chapter list, so a large downward scroll can be expected. The stylesheet already
has `scroll-margin-top`; a missing offset was not established as the cause.
The actual browser symptom has not been reproduced in this documentation task.

- The button remains **Chapter Outline** under **Build Chapters** and targets the
  outline heading, never Characters, History or the page footer.
- Resolve the owning rendered section reliably, preferably through its component
  ref. If collapsed, open it before scrolling; if unavailable, give a clear state
  rather than silently jumping elsewhere.
- Scroll the actual workspace container, keep the heading below sticky chrome,
  and move keyboard focus without a second unexpected scroll. Use subtle temporary
  emphasis and respect reduced motion. At the document end, limited scroll range
  is acceptable as long as the heading is visible and the destination is clear.
- Preserve textarea drafts and neighboring sections. No relocation of Generated
  Chapters, Build Chapters or unrelated content is authorized by this anchor fix.

## 5. B4 - Project Story And Characters Destinations

### 5.1 Navigation Contract

```text
Project title / existing context
| Story (75% of tab-control width) | Characters (25%) |

Story selected:      existing Brief / Full Story / Chapters / Scenes / Shots
Characters selected: Project Cast workspace, using the available content width
```

These are route-backed destinations, not simultaneous columns, not authoring
modes and not replacement Render/Queue tabs. Use a shared Project navigation
wrapper for authoring routes and a clear return from existing production surfaces.
Keep Engine, Render and Queue interiors unchanged.

Use responsive `minmax(0, 3fr) minmax(0, 1fr)` tracks for the tab buttons. Keep the
75/25 proportion on mobile/tablet/desktop; wrap localized labels if necessary,
with stable equal button heights, visible focus and no clipping. Do not scale
text with viewport width. Use Momelo tokens, existing navigation primitives and
localized text. This is presentation configuration, not a provider/model setting.

### 5.2 Clear Responsibility Split

- Remove Character settings, Look management and Character voice editors from
  Full Story and Chapter writer right panels. AI Assist, History, Build Chapters
  and other unrelated tools retain their existing behavior and position.
- Character links/buttons in those writers navigate to the Characters destination
  directly; they do not open another embedded settings panel.
- Scene/Shot participant, speaker and Look selectors remain because they choose
  what the current Scene/Shot uses. They are not duplicate Character management.
  Manage Character actions from them open the Characters destination.
- Chapter membership selection may remain contextual to the Chapter; editing the
  shared dossier/profile/voice/Look goes to Characters. Carry the current Chapter
  context on navigation so selecting its cast remains understandable.
- The Cast page offers a readable list and selected-Character detail: identity/
  role, existing Profile association, shared voice and Look Sheets. Reuse existing
  Character and Look components/domain commands instead of a new asset system.
- At narrow widths show list then selected detail with a clear back action; do
  not squeeze the current sidebar into a full-page imitation. Preserve empty,
  pending, unavailable-media, permission, error and retry states.

### 5.3 Routing And State

`CinematicStudioRoute.tsx` currently renders Full Story at `/cast`. Do not simply
reuse that URL for the new Characters page and break existing Full Story links.
Add a distinct route such as `/characters`, registered in canonical route metadata
and validated navigation contracts. Preserve `/cast` as the existing Full Story
entry until an explicit compatible route migration is verified.

Project-root Cast is shared across Chapters using stable IDs and the current
story-owner resolution, not cloned on every page. Honor existing scoped Scene/
Shot Look overrides. Cross-capability mutation stays through public facades.

Switching destinations must preserve the current Story route, Chapter/Scene/Shot
selection and unsaved text using existing actor-scoped recovery/navigation
contracts. Never restore another user's or another Project's location/draft.
Refresh/deep links and browser Back/Forward resolve correctly. Update the shared
query state after Character changes; no new polling/cache owner is needed.

## 6. B5 - Resolved First Frame Incident

Reported Project: `cineproj_1789887754253_6diarucv`.
Reported Shot: `cineshot_1790006629498_j0prvdln`.

Read-only inspection found a Character with `identityReady: true` and a bound
Look with `locked: true`, but both Scene and Shot `wardrobeLookIds` were empty.
`resolveShotLookIds` inherits the Scene selection when the normal Shot selection
is empty; it does not select a Look just because one exists in the Character
library. `CinematicApplicationService` used the same blocking code for missing
selection and an unlocked Look, resulting in misleading approval wording.

The user now confirms this issue is resolved. No live mutation, generation test
or code fix was performed as part of this requirements delivery. Preserve the
working selection/approval checks in regression coverage when changing B1/B4.
More precise readiness messages and automatic single-Look suggestions discussed
earlier are follow-up candidates, not required implementation in this packet.
Do not remove approval/ownership checks or reopen the incident automatically.

## 7. B6 - First Frame Beside Shot Direction And Timeline

The current `CinematicShotWriter.tsx` places First Frame after the script, save
footer and readiness section. Move that preview into the script editing area so
the creator can compare the opening image with the authored action/dialogue while
editing. This is a Shot writer layout change, not a new route, generation engine
or a reopening of the resolved B5 incident.

- On opening a Shot, show its First Frame preview beside the existing **Shot
  direction and timeline** native textarea without opening a modal first. Proposed
  desktop arrangement: readable editor on the left, bounded preview on the right.
  The Project Story/Characters 75/25 rule does not apply to these content columns.
- At narrower tablet/mobile widths, stack the preview immediately next to the
  editor in document order (preview before editor), without an intervening unrelated
  section. Use a two-column layout only where both controls remain readable.
- Preserve the entire image with contain-style framing, its source aspect ratio
  and bounded responsive dimensions. Permit opening a larger preview through the
  existing media viewer; do not crop faces or actions just to fill a panel.
- Reuse the current Shot's First Frame source and status; distinguish selected/
  approved image from a candidate awaiting review. Do not silently substitute the
  Scene environment, previous Shot or newest unapproved generation as its source.
- No image: show a stable empty preview and the existing First Frame action. Do
  not auto-generate, charge Credits, open generation tools or require a First Frame
  simply because the user opens the writer. Direct Video rules remain unchanged.
- Keep the existing Open first-frame workspace action in the preview area. It
  continues opening the existing generation/settings workflow, including its
  readiness, save-before-generation, consent and approval rules. Viewing an existing
  image must not require saving the text draft or initiate generation.
- After selecting/approving an image, refresh this preview through the existing
  Project query owner without page reload or losing typed text. Switching Shot
  changes both image and timeline together; late responses cannot show another
  Shot's image. Preserve existing unsaved-change/recovery navigation safeguards.
- Retain the previous usable image while a replacement is pending. Reuse existing
  loading/error/retry feedback and shared processing spinner, without new polling.
  Editing direction keeps the image but preserves existing stale-source advice;
  editing does not automatically regenerate or approve an image.
- Remove only the old duplicate First Frame block once the paired view is wired.
  Keep Scene/Character selectors, title/duration, dialogue review, AI Assist, Save,
  readiness, Video Prompt, portable export, navigator and Render/Queue intact.

Verify a portrait and landscape image, no image, candidate/approved/stale states,
image error, pending replacement, unsaved text and switching between two Shots at
390/820/1440px. Keyboard reading/focus order must match the visible layout.

## 8. Ownership And Reuse Map

| Scope | Existing owner/entry points to extend |
|---|---|
| Project routing and root context | `web/src/features/cinematic/routes/CinematicStudioRoute.tsx`, `cinematicStageNavigation.ts`, `web/src/app/routeRegistry/` |
| Cast and Looks | `CinematicSharedCharactersPanel.tsx`, `CinematicCharacterLooks.tsx`, existing Cinematic API/Zod contracts |
| Profile Look review/import | `web/src/features/profiles/components/CharacterLookDialog.tsx`, `server/domain/character-profiles/CharacterLookService.js` |
| Trusted original generation | `server/domain/generation/TrustedGeneratedSourceService.js`; use public facades, not another capability's repository |
| Project binding and invalidation | `server/domain/cinematic/CinematicApplicationService.js`, `CinematicSeriesService.js` through existing application contracts |
| Bulk consent | `web/src/components/generation/useCreditConfirmation.tsx`, existing quote/Generation/Credits owners and `StoryboardGenerateAllDialog.tsx` |
| Writer actions and anchor | `CinematicFullStoryWriter.tsx`, `CinematicChapterWriter.tsx`, `CinematicSceneOverview.tsx`, `CinematicChapterOutline.tsx` |
| Paired Shot image/script view | `CinematicShotWriter.tsx`, existing authenticated media viewer/image components, route-owned `StoryboardShotDialog` entry and Project query state |
| Visual language and strings | `web/src/styles/cinematic.css`, shared tokens, enabled `client/i18n/locales/*/cinematic.json` / shared consent namespaces |

No new runtime storage or architecture owner is introduced. During implementation,
recheck current modules before adding files or APIs. Do not make a duplicate
prompt compiler, Character library, pricing table or source verifier.

## 9. Acceptance Matrix

| ID | Observable acceptance |
|---|---|
| CC01 | Cancel/confirm Look removal uses a Momelo modal; only intended Project bindings change and originals/other Projects/Takes survive. |
| CC02 | Existing authorized Momelo Look can be selected without a new image Job; compatible approved version is bound through its owner. |
| CC03 | Verified original upload succeeds; unknown, wrong-category or unauthorized origin fails clearly; generation link preserves context. |
| CC04 | Every bulk entry confirms on first run and rerun even with spending opt-out; scope/count and actual total Credits are explicit. |
| CC05 | Cancel, duplicate click, stale quote/input/actor, insufficient balance and partial retry obey canonical consent/idempotency rules. |
| CC06 | Chapter Outline button reveals/focuses the correct heading without data loss or hidden destination at all three viewports. |
| CC07 | Story/Characters buttons are 75/25; only one separate destination is shown; no right-panel Character settings remain. |
| CC08 | Route refresh, Back/Forward, Story return, drafts and root Cast sharing work; old `/cast` still opens Full Story. |
| CC09 | Scene/Shot bindings and resolved First Frame workflow retain their existing validation and rendered outputs. |
| CC10 | TH/EN, keyboard/focus, reduced motion, themes and 390/820/1440px layouts have focused evidence; Engine/Render/Queue remain unchanged. |
| CC11 | Opening a Shot shows its First Frame beside the editable direction/timeline on wide screens and adjacent on narrow screens; image/source status stays correct on updates and Shot switches, without duplicate preview, draft loss or automatic generation. |

Ordered implementation and verification gates are in
[the task packet](tasks/017-project-characters-and-bulk-consent.md). All behavior
above has focused implementation evidence in that packet; live/provider UAT is
not claimed. B5 is user-resolved only and its validation remains intact.
