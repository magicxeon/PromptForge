# Produce Story Sequencing And UX Flow

**Requirement ID:** `016-PVP-002`  
**Status:** Requirement and Package 002 implementation complete  
**Priority:** P0 Produce usability

## 1. User And Job

**Primary user:** a creator who approved the Storyboard and now needs to turn
each still Shot into motion without losing the story order or cinematic intent.

**Primary job:** see what remains, generate the selected Shot or all eligible
Shots, review motion in context, approve the correct attempt, and understand
when the film is ready for Finish.

Produce is an execution and review stage. It does not silently rewrite the
Story or reorder the approved Storyboard. Story/Shot structural edits return to
Storyboard; trims and final transition choices belong to Finish.

## 2. Information Hierarchy

Desktop uses three stable regions:

```text
Stage header and production readiness
-------------------------------------------------------------
Scene/Shot queue | Selected Shot workspace | Render operation
                 | media and review        | sticky dock
-------------------------------------------------------------
Story order / continuity bridge / attempt evidence
```

### 2.1 Stage header

Show compact operational truth:

- approved Storyboard sources, for example `5 / 5 ready`;
- approved video Shots, for example `2 / 5 approved`;
- active/failed Jobs;
- planned and currently assembled duration;
- `Generate eligible set` only when at least one unapproved Shot is eligible;
- direct recovery link to the first blocking Storyboard Shot.

The header must not contain marketing copy or duplicate the global Project cost
summary.

### 2.2 Production queue

The left rail groups Shots by Scene and preserves Storyboard order. Every Shot
shows stable dimensions and one status:

```text
Storyboard required
Ready to generate
Quoted
Queued
Generating
Ready for review
Approved
Failed
Source changed
Audio incomplete
```

Selecting a Shot changes only the center workspace and operation dock. Status
updates do not reorder the queue or steal focus.

### 2.3 Selected Shot workspace

Order the selected Shot content as follows:

1. media inspection area;
2. previous/current/next story context;
3. concise execution direction;
4. attempt review and approval actions;
5. attempt history and technical details;
6. compiled prompt in collapsed technical disclosure.

The media area uses `contain` and preserves 9:16 framing. Before generation it
shows the approved Storyboard keyframe. During generation it retains stable
dimensions and shows shared progress. After completion it plays the generated
video and offers a side-by-side or toggle comparison with the approved first
frame.

### 2.4 Story context

The creator sees only information needed to judge this Shot:

- Scene and Shot title/sequence;
- exact visible starting moment;
- one primary action and intended end state;
- visible emotional target and performance cue;
- camera motion, duration and screen direction;
- required audio/dialogue summary;
- Character and approved Look names;
- transition intent toward the next Shot.

Long Story Plan prose and provider protocol text are not shown in the primary
workspace.

### 2.5 Render operation dock

Reuse the shared Generation visual language:

```text
Render signature/header
-> provider and model
-> duration, resolution and audio controls when supported
-> source/reference readiness
-> exact Credits and balance
-> Generate / Regenerate action
-> Queue or recovery state
```

The dock receives data and callbacks. It does not fetch provider catalogs,
calculate Credits or poll Jobs internally.

The selected operation is labeled as motion preview, draft clip or final clip.
Simple mode recommends one tier from Project readiness; Advanced mode may show
other qualified tiers. A completed draft is never presented as final merely
because the user approved its creative direction.

### 2.6 Rough sequence review

Produce includes a secondary `Review sequence` mode for judging story flow
before final assembly. It plays current approved clip Assets in immutable
Storyboard order and uses explicit keyframe placeholders for unresolved Shots.
It must never skip a missing Shot without showing the gap.

This is a read-only playlist, not a rendered export:

- it creates no provider task, Asset, quote or Credit effect;
- it does not apply final trims, dissolves, fades or an audio mix;
- it exposes Scene/Shot boundaries and stops or pauses at a blocking gap;
- it lets the creator jump back to the exact Shot for review/regeneration;
- structural order changes still return to Storyboard and editorial trim or
  transition changes still belong to Finish.

## 3. Prompt And Direction Interaction

- The compiled provider-independent video prompt is read-only evidence.
- The default UI does not expose a raw provider prompt editor.
- A creator changes motion by editing a concise `Additional motion direction`
  input or by returning to the owning Shot fields in Storyboard.
- Additional direction is persisted as structured Shot authoring input and the
  server recompiles the packet; it is not concatenated in React.
- Reset restores the compiled direction from current Shot authority and clearly
  states whether unsaved additional direction will be discarded.
- Provider-specific rendered prompt is available only in an Advanced technical
  disclosure for diagnosis.

## 4. One-Shot Flow

1. Select a ready Shot.
2. Inspect the approved keyframe and concise motion contract.
3. Select an eligible provider/model and supported controls.
4. Wait for an exact quote bound to source, packet and output settings.
5. Confirm generation once.
6. See queued/processing state immediately without a blank workspace.
7. Navigate freely; returning restores the same task.
8. Inspect the playable result and technical/continuity findings.
9. Approve the attempt or regenerate with one bounded correction.
10. Move automatically to the next unresolved Shot only after explicit approval,
    while allowing the creator to remain on the current Shot.

Approval records the attempt tier. It does not automatically trigger a second
final render.

## 5. Generate Eligible Set Flow

The action opens one summary dialog:

- selected provider/model and supported shared settings;
- eligible, blocked, active and already-approved Shot counts;
- exact aggregate Credits with expandable per-Shot breakdown;
- duration reconciliation and audio limitations;
- reference/trust warnings by Shot;
- one explicit confirmation.

When the Project has no successful attempt using the selected configuration,
the dialog offers `Generate one test Shot first` as the recommended lower-cost
path. The creator may still continue with the whole eligible set after viewing
the exact aggregate quote and warning. The test Shot is a normal child attempt
and is excluded from a later batch when already approved/current.

After confirmation, the dialog becomes a group progress surface. It shows each
child status and supports retrying only failed/retryable children. Closing the
dialog does not cancel or lose the group.

## 6. Review And Approval

Approval must be visually dominant only after a completed, settled and valid
attempt exists. Review shows:

- first-frame match;
- Character identity and wardrobe consistency;
- one action and intended end state;
- emotion/performance readability;
- camera and screen direction;
- environment/prop continuity;
- duration and audio evidence;
- technical probe pass/fail.

The creator may reject an attempt without deleting its Asset, Job or Credit
record. A successful but artistically rejected output is not automatically
refunded.

## 7. Responsive Behavior

### Desktop, approximately 1440px

- queue remains a compact left rail;
- selected media and review occupy the widest center region;
- operation dock is sticky but never covers the workspace/footer;
- no nested decorative cards or horizontal page scroll.

### Tablet, approximately 820px

- Scene/Shot queue becomes a horizontal or compact collapsible selector;
- media precedes direction and attempts;
- operation dock follows the selected Shot in normal flow or a non-occluding
  sticky footer with safe bottom padding.

### Mobile, approximately 390px

- one-column order is readiness, Shot selector, media, direction, review and
  render action;
- provider/model controls open in a sheet/dialog when necessary;
- all 9:16 media uses bounded height and remains inspectable full-screen;
- no essential action depends on hover or drag.

## 8. Async And Error States

- Loading the Project preserves a stable Shot/media skeleton.
- Quote loading does not disable navigation.
- Version conflict refreshes Project truth and preserves unsent additional
  direction.
- Source changed routes to the exact Storyboard Shot and retains attempt history.
- Provider failure shows stable code, retry eligibility and Support reference.
- Insufficient Credits opens the shared top-up flow without losing selection.
- Reconciliation state does not show Approve and does not spin indefinitely.
- Empty Project and no eligible Shot states explain the next exact action.

## 9. Accessibility, Themes And Localization

- Use semantic headings and one accessible label per Shot status/action.
- Queue and generation progress use bounded `aria-live` announcements.
- Focus moves to a result status heading after submit and returns to the trigger
  after dialogs close.
- Keyboard users can select Scenes/Shots, configure, generate, review and
  approve without drag.
- Thai and English long labels wrap without changing control dimensions.
- Momelo Neon, Pearl Editorial and Electric Studio use semantic tokens; no
  Produce-local color constants are introduced.

## 10. Acceptance

- A first-time user can identify the next unresolved Shot within five seconds.
- Story order from Storyboard remains visible and immutable in Produce.
- The approved still and generated video can be compared without leaving the
  selected Shot.
- Current approved clips can be reviewed in Story order with unresolved gaps
  made explicit and no render/Credit side effect.
- Prompt protocol text is secondary to action, emotion, camera, continuity and
  media review.
- Single-Shot generation remains available after batch generation is added.
- Mobile, tablet and desktop have no overlap, clipping or unintended horizontal
  page scrolling.
