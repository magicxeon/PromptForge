# 009 - Single-Mode Writer Shot Authoring

Status: partially implemented; reconciled against current code on 2026-09-25.
The Character/dialogue workspace in section 13 is the next implementation slice.
Owner: Cinematic authoring and Production UX. Primary role: Product Requirement
Architect. Review lenses: UX/UI Product Designer and Cinematic Experience Director,
applied sequentially by the same agent.

This requirement supersedes every Simple/Advanced authoring split in the Rewamp
documents. Existing runtime modules may remain temporarily as compatibility
adapters, but the completed product exposes one authoring experience only.

The later [010 screen redesign](010-complete-authoring-screen-redesign.md) preserves
Engine & Target Output, Render/result/Take surfaces and Queue. The writer opens
these existing surfaces with exact Shot context and a return action; it does not
rebuild their controls beneath the document. This is a work destination within the
single authoring experience, not a second authoring mode.

## 1. Outcome

Make Shot authoring feel like writing and revising a film passage, not filling in a
technical production database. A creator reads and edits one clear Shot document,
organized by time, then generates the optional First Frame or Video from the same
saved source.

The semantic shape follows
[`Example/shot-example.txt`](Example/shot-example.txt): duration, Scene context,
camera, a chronological performance timeline, dialogue, facial performance, audio
and constraints form one readable document. The example is guidance, not text that
must be copied into every Shot.

One Shot still produces one clip and may have multiple Takes. Project hierarchy,
reference authority, Generation, Credits, task recovery, approval and export remain
owned by their existing capabilities.

## 2. Confirmed Product Decisions

1. There is no Simple mode, Advanced mode, mode switch or separate expert authoring
   surface in the new Cinematic Studio.
2. A Shot is not edited through separate framing, camera, lighting, blocking, gaze,
   performance, dialogue, audio and negative-constraint form fields.
3. The canonical user-authored source is one versioned `shotDocument` text value.
4. The Shot editor presents that value as a readable timeline document in one large
   text-area-style writing surface. Timeline formatting helps reading but does not
   split content into separately owned attributes.
5. Structured execution data remains an internal derived projection. It is parsed
   and compiled from `shotDocument`; users do not maintain a second structured copy.
6. Keep only functions needed to write, prepare, generate, review and continue a
   Shot. Remove obsolete presentation and duplicated editing paths after parity is
   verified.

"No Shot attributes" means no user-visible attribute-by-attribute authoring form.
It does not remove the internal metadata required for provider payloads, reference
roles, billing evidence, task identity or historical compatibility.

The 2026-09-25 request explicitly adds visible Character selection, speaker binding,
shared voice direction and a separate Video Prompt section. These focused controls
are permitted alongside the script writer. They do not restore Advanced mode or
independently editable copies of dialogue/camera/performance fields. Section 13
supersedes older wording that prohibited every speaker control or required the
whole Shot workspace to be only one textarea.

## 3. Canonical Shot Document

Minimum durable authoring contract:

| Field | Purpose |
|---|---|
| `shotDocument` | Canonical human-readable direction and timeline |
| `shotDocumentVersion` | Optimistic concurrency and proposal base version |
| `durationMs` | Explicit generation/quote input, synchronized with document duration |
| `title` | Compact navigation label; may be inferred and edited |
| `source` | `manual`, `ai_proposal`, `restored` or migrated legacy source |
| `updatedAt` / `updatedBy` | Draft history and conflict recovery |

The editor uses a configurable starter template with these readable sections:

```text
SHOT DURATION
SCENE
OPENING
CAMERA
PERFORMANCE AND TIMELINE
[0.0-1.5 sec]
[1.5-3.0 sec]
...
DIALOGUE AND FACIAL PERFORMANCE
AUDIO
CONTINUITY AND CONSTRAINTS
```

Sections may be omitted when irrelevant. A no-dialogue or no-person Shot remains
valid. Unknown headings and free-form notes are preserved byte-for-byte through
save; the parser must not discard prose it does not understand.

The author writes story names such as Lalin or Kin. Technical IDs, `@Image` numbers,
provider syntax and reference ordering are not required in the document. The server
resolves names to stable role bindings and compiles the ordered reference assignment.

Duration has one authoritative submitted value. When the duration line and duration
control disagree, save preserves the draft and asks which value to apply; it never
silently quotes or submits a different duration.

## 4. Writer-First Production Workspace

Desktop layout:

```text
Project / Chapter             Story | Production | Final       Assets
---------------------------------------------------------------------
Scenes and Shots   | Shot title                              Saved
compact navigator | -------------------------------------------------
                  | [ large timeline-aware writing surface          ]
                  | [ readable line spacing and time-block rhythm   ]
                  | -------------------------------------------------
                  | References     First Frame status
                  | Prepare First Frame          Open Video Render
```

The single textarea or accessible plain-text editor is the visual center. It uses a
comfortable reading measure,
clear section headings, generous line height, Thai-friendly wrapping and persistent
save state. It must support ordinary text selection, undo/redo, copy/paste, keyboard
navigation and screen readers. Do not create card-per-section or fields inside a
stack of nested panels.

Timeline assistance is lightweight:

- recognize `[start-end sec]` lines and style them as time anchors;
- show interval errors in a gutter or inline message without rewriting the text;
- offer Insert time block and Format document commands;
- keep plain-text portability; copied content remains useful outside Momelo;
- preserve cursor and scroll position after autosave or validation;
- never invoke AI merely because the user types, opens or formats a document.

Desktop may use a compact Scene/Shot navigator. Tablet uses a collapsible navigator.
Mobile uses a full-width editor with Scene/Shot selection in a sheet and a sticky
bottom command bar that does not cover text. There is one scroll owner for the editor
pane and no horizontal overflow at approximately 390, 820 and 1440 pixels.

## 5. Visible Function Set

The new Shot surface retains only:

- select, add, reorder and rename Scene/Shot;
- edit/save the Shot document and duration;
- explicit AI Draft or Enhance proposal with Preview/Apply/Cancel;
- view and manage resolved Character, Expression, Environment and Hero Prop
  references through one compact reference summary;
- optional First Frame selection/generation, including previous Take last-frame use;
- open existing Render to choose provider/model through Engine & Target Output;
- use existing Render to generate Video, observe real task state and recover/retry;
- use its existing Take controls to preview, select/approve and continue to Final;
- see plain-language document issues and the existing Credit estimate before submission.

Reference selection and First Frame status may open focused drawers or disclosures.
Image/video Render and Takes use their existing surfaces as protected in 010. All
Shot text editing returns to this writer instead of a separate attribute form.
The creator's readable Video Prompt preview is a separate section under section
13. Raw technical packets and low-level diagnostics remain read-only and available
only to administrator/support roles.

## 6. Removed User-Facing Complexity

The replacement removes from the new default flow:

- Simple/Advanced toggles and duplicated route branches;
- separate camera, lens, framing, lighting, art direction, blocking, gaze,
  performance, action, dialogue, sound and prohibition editors;
- user-maintained technical reference order or provider prompt syntax;
- duplicated Shot edit dialogs that write the same data differently;
- a normal-user compiled prompt panel;
- readiness walls that block editing before the user can understand the Shot;
- controls that expose internal preparation phases without a user action.

Do not delete legacy fields or readers merely because they disappear from the UI.
Migration first composes them into `shotDocument`, records provenance and proves that
historical media, Takes, approvals and receipts still resolve. Remove source modules
only after the cleanup gate in 008.

## 7. Parse, Prepare And Compile Boundary

Saving and generating are separate operations.

1. Save `shotDocument` with `expectedVersion`; preserve the local draft on conflict.
2. Parse recognized sections and timeline intervals into a derived execution model.
3. Resolve stable Character roles and automatic references through the existing
   reference authority owner.
4. Validate timeline bounds, contradictory actor/prop actions, dialogue speaker,
   required identity, provider capability and actual final prompt budget.
5. Show advisory issues as warnings and missing execution-critical data as blockers.
6. Compile the provider-specific technical packet server-side.
7. Quote the exact provider, model, duration, audio and ordered references.
8. Submit only that quoted immutable input through the canonical Generation/Credit
   workflow.

The derived model and compiled prompt are cacheable projections keyed by Shot
document version, policy version, reference fingerprint and provider choice. They
are not independently editable durable Shot truth.

Safe compaction may remove duplicated prose introduced by compiler templates, but
must preserve authored dialogue, time order, physical contacts, identity authority,
continuity and end state. An AI rewrite is always an explicit proposal, never an
invisible response to a prompt-limit error.

## 8. AI Authoring Behavior

Generate Direction creates a complete readable Shot document. Enhance targets the
current Shot document and returns a textual proposal/diff. It may improve causal
sequence, timing, natural performance, camera, lighting, facial expression, audio
and continuity, but it must not silently change approved identities, dialogue text,
duration or downstream Takes.

Generated documents use chronological intervals that fit the requested duration.
They describe observable action and expression rather than abstract emotion alone.
When a First Frame is optional or absent, the document still states the visual
opening condition. Provider-specific reference instructions are added by the
compiler, not written into the authoring document.

## 9. Validation And Recovery States

| Condition | User experience |
|---|---|
| Valid document | Save succeeds; Generate actions use the latest prepared projection |
| Unrecognized prose | Preserve and warn only when it affects execution |
| Missing optional section | Allow save and generation when the provider packet remains valid |
| Invalid/overlapping interval | Highlight exact lines; allow draft save; block only an invalid submission |
| Prompt over provider limit | Run deterministic compaction; show remaining blocker and explicit optimization/split choices |
| Stale save | Keep local text; offer Compare/Reload/Save as new revision |
| Missing required Look/reference | Link to the exact asset action; do not erase the document |
| Provider/reference rejection | Keep document, references, model and failed Take; no implicit retry |
| Interrupted task | Reconcile by task ID until cutoff, then show Recheck/Retry; never resubmit automatically |

## 10. Configuration

Configuration owns the starter template, accepted section aliases, time-marker
syntax, advisory thresholds, editor autosave delay and feature exposure. Provider
limits, pricing, authorization, actor isolation and Credit invariants remain with
their canonical owners and cannot be weakened through authoring configuration.

Changing a template affects new drafts and explicit Format operations only. It must
not rewrite saved Shot documents on application startup.

## 11. Migration And Cleanup

1. Inventory legacy Shot fields and every writer.
2. Add `shotDocument` and versioned save/prepare contracts additively.
3. Migrate a copy of representative Shots by composing readable documents from
   existing values; retain a reversible source snapshot and migration version.
4. Build the one-mode writer workspace against the canonical save/prepare facade.
5. Keep old deep links as temporary adapters to the same Shot, not a second editor.
6. Prove quote, submit, Takes, approval, reload and export parity.
7. Make the writer workspace the only product UI.
8. Remove Simple/Advanced controls, attribute editors and duplicated glue only after
   import/route/test/receipt-reader inventory confirms they are no longer required.

## 12. Acceptance

- W01: No Simple/Advanced control or separate expert authoring route is visible in
  the completed Rewamp flow.
- W02: A creator can create, read, edit and save one Shot entirely through one
  timeline document without opening attribute forms.
- W03: Manual prose, unknown headings, cursor position and local draft survive save,
  validation errors, reload and version conflict recovery.
- W04: Timeline intervals are readable and validated against duration; warnings point
  to exact text without silently rewriting it.
- W05: AI Draft/Enhance returns one reviewable document proposal and changes nothing
  until Apply.
- W06: Automatic references and provider-specific prompt syntax compile from the
  saved document; exact quote and submitted manifest remain identical.
- W07: Optional First Frame, direct Video, multiple Takes, selection/approval and
  Final export remain available without reintroducing the former Shot form.
- W08: Normal users cannot read compiled technical prompts; administrator/support
  diagnostics are read-only and role-authorized on the server. This does not hide
  the creator-facing Video Prompt text defined in section 13.
- W09: Existing Shot media, Takes, approvals and financial receipts remain reachable
  after migration; cleanup removes no active compatibility reader.
- W10: Thai/English, keyboard/focus, reduced motion and 390/820/1440 layouts pass the
  focused writer-workspace review with no overlap, clipped controls or nested scroll
  trap.

## 13. Character, Dialogue And Video Prompt Workspace (2026-09-25)

### Outcome And Current Evidence

Create a playable Shot linked to the Scene's Characters, then prepare its opening
image and video direction including spoken exchange. One Shot still produces one
clip. The following are code-inspection findings, not new runtime completion claims:

| Area | Implemented owner and behavior | Remaining gap |
|---|---|---|
| Scene -> Shot | `CinematicApplicationService.proposeShots`, `CinematicShotAuthoring`: reviewable proposals, manual creation, stable Shot IDs, `characterIds` -> `castAssignmentIds` | Cast membership/visibility must be explicit and editable; empty Scene Cast currently falls back to all active Project Cast in proposal context |
| Shared Character | `CinematicSeriesService.upsertSharedDossier`: shared Cast assignment with `dialogueStyle`, `emotionalBaseline`, `performanceDirection`, Looks | Shot UI does not expose shared voice direction or its inheritance |
| Writer | `CinematicShotWriter`: one document, duration, versioned save, Scene preview and First Frame entry | Named Cast/Look summary, speaker mapping, readable exchange and separate Video Prompt section |
| Document compiler | `CinematicShotDocumentCompiler`: opening/action separation and decimal/clock timeline parsing; consumed by still/video compilers | Dialogue/facial prose is currently combined into `audioIntent`; no document-to-speaker-cue binding or dialogue timing assessment in this writer |
| Existing dialogue | `dialogueCues`, `CinematicDialogueTiming`, existing packet compiler support named speakers and advisory timing | Reuse through the document compiler; legacy cue arrays must not compete with new document dialogue |
| AI Shot recipe | `scene-shots.v1.json` preserves authored dialogue and forbids inventing dialogue | Explicit draft-dialogue proposals when the Scene contains intent but no written exchange |

### Character And Scene Binding

1. Use stable `castAssignmentId` values from the existing Project/Chapter/Scene
   Cast hierarchy. Names and aliases are display labels. Renaming never reassigns
   a line to a different person. Do not create another Character identity system.
2. Show each Shot participant's name, assigned Look thumbnail and reference state.
   Separate visible Characters from off-screen speakers. Only visible identity-bound
   Characters require Look images for image/video references; a silent listener can
   still be visible. A no-person or no-dialogue Shot remains valid.
3. Proposals may choose a subset of the Scene's Cast. Honor explicit `none`,
   `selected` and `inherit`; an empty list must not silently attach the entire
   Project cast. Invalid IDs/names require a review finding, not silent deletion.
4. Adding a Project Character to a Shot also requires an explicit Scene-membership
   update through the existing facade. Removing a speaker with authored lines
   retains those lines and marks the mapping unresolved; never silently reassign.
5. Inherit the selected Scene Environment, location/time/weather and its OFF state.
   First Frame combines this environment with selected visible Looks and the
   authored OPENING: pose, gaze, contact and framing before action starts.
6. Missing Looks link to the existing Character/Look chooser or generation workflow
   and return to the same Shot. Generating the Shot image uses these references;
   it does not invent new Character sheets or generate media on navigation.

### Dialogue, Voice And Performance

- Keep exact dialogue text and its chronological context in `shotDocument`.
  Provide a readable exchange view with speaker name, time range, exact line and
  compact delivery/listener direction. A speaker picker inserts/resolves a named
  binding in this same source; it must not maintain a second editable dialogue list.
- Store only necessary stable binding metadata separately. If a source range or
  alias is used, associate it with the document version and invalidate it on edits;
  resolve duplicate names explicitly. Unknown prose remains recoverable in the writer.
- Derive speaker cues with Cast ID (or explicit off-screen role), language, timing,
  delivery, visibility, gaze and listener response. Show mapping problems beside
  the affected line; block only execution that would use an unresolved speaker.
- Shared voice direction belongs to the existing shared Character/Cast dossier.
  Reuse `dialogueStyle` for the initial human-readable baseline: language/accent,
  pitch, texture and typical pace. A richer contract may be added only through the
  owning facade/schema. Do not write back to a global Character Profile by default.
- Shot/line delivery supplies temporary emotion, intensity, volume and pauses.
  Example: a normally soft-spoken Character can shout in this Shot without changing
  their shared baseline. Clearly distinguish editing the shared baseline from a
  local performance instruction. Snapshot the effective inputs with each attempt.
- Direct the listener as well as the speaker: gaze target, posture, emotional change
  and reaction/hold time. Expression references are optional aids, never substitutes
  for identity or mandatory for every dialogue Shot.
- Use existing timing estimates as recommendations. Preserve breathing, pauses,
  intentional interruptions and reactions. Do not shorten, translate or accelerate
  a line silently. Keep the configurable Scene dialogue target advisory.
- Voice direction is prompt guidance, not a promise of the same synthetic voice
  across Takes. External TTS, voice cloning and lip-sync are outside this slice.

### Writer Layout And Derived Video Prompt

Use four ordered full-width sections with restrained dividers; do not nest form
cards. Desktop keeps the existing compact Shot navigator, while smaller screens
use its responsive equivalent. The main reading order is:

1. **Scene and Characters**: environment thumbnail, participants, visibility,
   selected Looks and a compact shared voice summary. Resolve missing bindings here.
2. **Script and performance**: one timeline document, readable exchange, local
   gesture/emotion/reaction direction, duration, explicit Save and AI revision.
   Speaker tools act on this document. Technical camera/lighting fields stay prose.
3. **First Frame**: opening summary, current image and existing image tools. Keep
   optional/direct-video behavior and the current reference policy.
4. **Video Prompt**: separate collapsed section with Prepare/Refresh, plain-language
   prompt, Copy, up-to-date/stale status and Open Video Render. Expanding it does
   not call an LLM. The generated prompt must contain the actual named speakers,
   exact lines, effective voice direction, actions, timing and audio intent.

Confirmed: creators can directly edit Video Prompt. Persist an optional Shot-local
override separately from the generated projection, with its source fingerprint.
Never overwrite custom text when refreshing or changing the Shot. Show stale state
and require explicit review/reconfirmation before using a stale override. Reset to
generated is explicit. Preview, estimate and submission use the same override while
retaining provider reference authority and final payload budget validation. Keep raw
IDs, private URLs, payload metadata and
low-level diagnostics out of the creator view. Derive the preview through the
canonical Cinematic compiler; do not create a UI-only prompt or submit it as a
parallel compiler. The override replaces authored video direction only, not reference
identity/order, duration validation, source ownership or billing controls.
Provider-specific reference ordering is added during preparation.

Dirty source text shows that the preview needs a saved revision. Changes to Cast,
Looks, Environment, dialogue, voice direction or provider settings invalidate the
relevant preview/estimate. Audio-only changes should not invalidate a compatible
still image. Preserve older media/Takes and their submitted snapshots. Final prompt
budget checks apply to the actual provider payload after references, not just the
readable preview. Open Video Render must carry this exact Shot and saved version.

### AI Proposal Behavior

The author can explicitly request Draft dialogue when only Scene intent exists.
AI uses the Chapter/Scene intent, authorized Characters, shared dialogue style and
current Shot sequence. Existing lines are retained verbatim unless the requested
revision explicitly changes them. New lines are proposals requiring Apply; they
cannot introduce an unassigned Character, change the plot or overwrite saved media.
An explicit no-dialogue Shot stays silent. Reuse the current proposal/Apply/version
checks and text-provider router; this is not an automatic generation on opening.

### Acceptance And Delivery Boundary

- SD-A01: Two Characters exchanging multiple lines retain the correct speaker IDs
  after save, rename, reload and proposal Apply; ambiguous names stay unresolved.
- SD-A02: Scene Environment plus the chosen visible Looks reach First Frame and
  video reference preparation; off-screen voices add no face-reference slot.
- SD-A03: Shared voice direction persists through Character/Look changes and future
  Shots; local delivery does not mutate it. Old attempts retain prior inputs.
- SD-A04: The derived prompt preserves exact dialogue, speaker mapping, temporal
  order, actor reactions and author-selected reference/audio mode.
- SD-A05: Long dialogue produces actionable timing advice and preserves all text;
  absent Cast/dialogue remains valid when the intended Shot needs neither.
- SD-A06: Source edits mark derived previews stale; no duplicate submission, hidden
  approval, dropped identity reference or provider-budget bypass occurs.
- SD-A07: Thai/English writing, speaker selection, empty/error/loading states and
  the four-section layout are operable at 390/820/1440 without overlap or caret loss.

Implementation order and scoped tests live in [task 008](tasks/008-shot-writer.md).
The initial runtime slice is implemented with the evidence in task 008. Live
provider speech/identity quality and complete Render round-trip UAT remain open.

### Confirmed Direct-Edit Contract And Runtime Slice

- `speakerBindings` stores alias, stable Cast ID and on-screen visibility on the
  existing Shot. The server converts legacy dialogue; the duplicate browser legacy
  converter is removed. A removed/unresolved speaker retains its prose.
- `videoPromptOverride` is nullable and stores exact creator text plus the source
  fingerprint. It replaces authored video direction in the existing packet compiler,
  retaining reference authority, selected duration and final provider budget checks.
  Existing missing-source/action/timeline gates are not relaxed by a custom prompt.
- `GET .../shots/:shotId/writer-preparation` returns the actor-owned generated prompt,
  dialogue projection, timing advice and freshness. No AI or media dispatch occurs.
- The existing document PATCH accepts bindings and an optional override/reset, with
  Project/Shot optimistic versions and current source-fingerprint validation.
- Targeted AI revisions reuse Scene Shot proposals, with `targetShotId` and
  `sourceShotVersion`; Apply changes that Shot only. Explicit instructions can draft
  dialogue. Previous media and custom prompts remain retained for review.
- Shared voice edits use CinematicSeriesService's dedicated voice-only command,
  preserving pinned identity/Looks and refreshing related Chapter voice snapshots.
- Saved writer -> `?render=video` reuses CinematicProduceRuntime with the selected
  Scene/Shot and Back to Shot. Engine, Queue, Takes and Credits owners are unchanged.
