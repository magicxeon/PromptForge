# Cinematic Studio Screen And Interaction Flow

**Owner:** Cinematic Studio React feature
**Primary role:** UX/UI Product Designer
**Reviewers:** Product And Requirement Architect, Cinematic Experience Director
**Skill:** `review-product-ux`

## 1. Route And Shell

Canonical routes:

```text
/create/cinematic                         project list and new project
/create/cinematic/new                     setup
/create/cinematic/:projectId/:stage       six-stage workspace
/create/cinematic/:projectId/shot/:shotId focused shot editor
```

The workspace uses the current `AppShell`, route registry, breadcrumbs and
actor-scoped TanStack Query conventions. It must not introduce a second shell.

Desktop uses a compact stage rail, main work area and contextual project
summary. Mobile uses a top stage selector and a single-column flow. Stage
navigation remains available, but a user cannot skip an unmet approval gate.

## 2. Shared Component Reuse

| Need | Reuse first | Cinematic extension |
|---|---|---|
| Character selection | existing Character cards/profile media | role badge and pinned-version state |
| Outfit upload/select | Asset/reference pickers | Character wardrobe assignment wrapper |
| Provider/quality | Engine/target controls | video operation capability filtering |
| Result loading | shared Generation result surface/loader | video thumbnail and duration metadata |
| Queue | shared Queue status | project and shot grouping |
| Media viewing | shared authenticated media viewer | video transport controls and shot actions |
| Async/error | `AsyncState`, `StatusNotice`, `Toast` | cinematic error codes and recovery actions |
| Confirmation | shared quote/credit and confirm dialogs | operation-specific breakdown |
| Options | shared visual/segmented controls | cinematic presets and director controls |

Shared components receive data and callbacks. They do not call providers,
Credits or repositories.

## 3. Stage 1 - Setup

### Required controls

- Project name with generated default.
- Format: Short Film; Series-lite hidden until enabled.
- Platform: TikTok, YouTube Shorts, Reels, multi-platform.
- Duration: 20/30/45/60 seconds.
- Story brief, maximum 600 characters for MVP.
- Genre, audience feeling, pacing and ending intent.
- Simple/Advanced mode. Simple is default.

### Interaction

- A rough non-binding cost range updates from duration and quality assumptions.
- `Continue to Cast` saves the draft, validates required fields and focuses the
  first invalid field on failure.
- Autosave shows `Saving`, `Saved`, `Offline changes` or `Save failed`.

## 4. Stage 2 - Cast And Wardrobe

### Cast

- Add 1-3 Characters and assign one unique protagonist.
- Each card shows canonical portrait, apparent age, reuse rights, owner and
  identity-pack readiness.
- Unavailable/private Characters cannot be selected.
- The selected Character Version is shown and pinned on approval.

### Wardrobe

- `Character default`, `Wardrobe preset`, or `Upload outfit`.
- Upload uses existing front/back reference behavior; back remains optional
  unless a planned shot explicitly requires back fidelity.
- A selected outfit shows source, coverage and warnings.
- Continuity choice: entire film, by scene, or intentional change.

### States

- Missing identity pack, unsupported reference count, private Character,
  invalid outfit and upload failure each show a direct recovery action.
- Continue is disabled only for a blocking state; warnings remain reviewable.

## 5. Stage 3 - Story Plan

The screen combines planning and review rather than creating a separate wizard
page for every filmmaking concept.

- Beat cards: setup, development, turning point, climax, ending.
- Scene cards nested under beats with location, time, cast and purpose.
- Estimated duration and shot count update deterministically.
- User can reorder scenes, edit intent, split, merge or regenerate one scene.
- `Regenerate plan` never overwrites approved edits without confirmation.
- A version comparison shows changed scenes before replacement.
- `Approve story plan` creates the immutable input version for Storyboard.

## 6. Stage 4 - Storyboard

### Main layout

- Scene tabs or list at left/top.
- Shot cards in narrative order.
- Selected shot inspector for composition, camera, movement, performance,
  dialogue/audio intent, duration and continuity.
- Project summary shows cast, wardrobe locks, duration and current estimate.

### Shot card

- Storyboard image or intentional placeholder.
- shot number, scene, duration and purpose;
- Characters/wardrobe and continuity warnings;
- quote/status indicator;
- edit, regenerate still, duplicate and remove actions.

### Approval

`Lock storyboard` validates protagonist presence, duration budget, continuity,
reference capability and shot ordering. It pins Story Plan and Continuity Lock
versions. Unlocking requires confirmation and marks downstream drafts stale;
it does not delete them.

## 7. Stage 5 - Produce

- Filter by scene and state: not generated, queued, processing, needs review,
  approved, failed.
- Batch selection quotes only eligible selected shots.
- Each shot shows storyboard, latest clip, attempt history and continuity source.
- Opening a result uses the shared media viewer with play, pause, seek, mute,
  download, compare, approve, reject and regenerate.
- `Regenerate` offers a concise reason: identity, wardrobe, motion, framing,
  continuity, artifact or custom note. It creates a new attempt.
- Progress is operation-based and terminal errors stop polling/spinners.
- Partial batch completion remains usable; failed shots do not hide successes.

## 8. Stage 6 - Finish And Export

- Ordered clip strip with drag reorder and keyboard reorder.
- In/out trim; MVP transition set: cut, dissolve, fade.
- Music selection/upload, level and fade.
- Subtitle text, timing and style preset; no full design editor.
- Voice-over appears only if the feature gate and provider support it.
- Timeline warnings identify gaps, overlaps, stale clips and duration overflow.
- Final render quote lists video assembly, audio/subtitle and export separately.
- Completed export opens in shared media viewer with download and `Share` as a
  separate optional action.

## 9. Global State Matrix

Every stage must render:

- initial/loading;
- empty with one primary action;
- ready/draft;
- saving/saved/save failed;
- validation warning/blocker;
- permission denied/private source;
- quote loading/stale/insufficient Credits;
- queued/processing/partial/completed/failed/cancelled;
- stale downstream content after upstream edits;
- recoverable orphan with Support reference.

No spinner may remain after a terminal status.

## 10. Accessibility, Theme And Responsive Rules

- Use semantic headings, labels, focus order and `aria-live` for async status.
- Do not encode shot or approval state by color alone.
- Focus moves only after user-triggered stage/section expansion.
- Media controls are keyboard operable and have accessible names.
- Theme tokens come from the active user theme; no Cinematic-local palette.
- At 360px width, cards become a list and inspectors become drawers; text and
  controls must not overlap.
- At desktop width, the main storyboard/timeline remains the visual priority,
  not decorative cards.

## 11. UX Acceptance

- First-time completion requires at most six primary Next/Approve transitions.
- User can identify current stage, blocked requirement and next action without
  reading explanatory feature copy.
- Leaving and returning restores selections and scroll context.
- Removing a Character explains affected scenes before mutation.
- A paid action always presents exact output count and cost before confirmation.
- Viewer, queue, loader, toast, Character and media behavior remains consistent
  with existing Studio surfaces.
