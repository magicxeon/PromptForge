# 003 - Story Authoring And Revisions

Status: in progress. Provisional text dossiers are implemented behind the Rewamp
flag; Full Story revisions and remaining scoped proposal UX are planned.
Owner: Cinematic authoring; Generation owns AI execution.
Depends on [002](002-project-contracts-and-configuration.md). Shot document:
[009](009-single-mode-writer-shot-authoring.md). UX:
[006](006-ux-ui-workspaces-and-interactions.md).

## 1. Minimal Input And Story Flow

Latest scope: [011](011-story-chapters-and-shared-characters.md) supersedes the
earlier combined Full Story/Chapter concept and mandatory separate dossier step.
Full Story and Chapter revisions are independent. Optional Looks can be selected
while writing; the shared Character library is available on both pages.

```text
Brief and optional settings
  -> Full Story with optional provisional Characters and Looks
  -> user confirms Full Story revision
  -> Generate/Manual Chapters; revise/finalize optional production assets
  -> Chapter Scene proposals
  -> Scene Shot proposals
  -> Production
```

An empty brief is allowed when the user explicitly requests an AI story. Use saved
format/genre/settings and generate a draft with provisional Characters. Never
silently submit AI work on page load. Manual authoring works without AI requests.

Visible initial fields: optional brief, Movie/Mini Series, genre and orientation.
Additional settings disclose Chapter count/duration, optional Season, country
style, period/place, audience feeling, pacing, ending and dialogue target. Seed
these from configuration; all inherited values are editable.

Country style influences story rhythm, character interactions and direction, not
automatic casting ethnicity or unauthorized changes to Character identity.
Genre, country, period and audience feeling reach enhancement, role analysis,
Full Story, Scene and Shot proposal inputs consistently.

## 2. Provisional Characters And Full Story

Text dossiers contain stable role ID, name, narrative purpose, personality,
objective, relationships, authored age when specified, provisional appearance
and wardrobe notes. They can change while the Full Story is being developed.
Do not require Character profile creation, Look Sheet generation or image binding
to write or confirm the story.

Reuse role analysis to propose dossiers; keep it distinct from story enhancement:
role analysis proposes Cast, enhancement proposes prose. UI uses separate result
types even if both share a scoped AI command composer.

The Chapter workspace shows readable Chapter prose and outline. AI prepares Chapters against
one bible and prior accepted context, using bounded chapter-by-chapter operations.
Persist completed proposals; show which Chapter is running. Stop on interruption
with explicit retry/resume for incomplete work through existing operation owners.
Never regenerate accepted Chapters automatically on reload.

Each proposal records base revision, scope, input versions and proposed changes.
Apply checks those versions, previews affected Characters/Scenes/Shots and stores
one atomic change. Routine Enhance preserves IDs and structure. Add/remove/reorder
requires structural editing intent and a visible change preview.

Confirm Story sets a versioned authoring baseline and enables Finalize Looks.
It is not a payment approval and does not require image/film-readiness blockers.
Later edits preserve media, mark impacted descendants for review and allow explicit
reconfirmation. Existing prepared Looks can be reused after suitability review.

## 3. Revision Rotation

Scope: independent Full Story content and each Chapter's title/prose per 011. Keep the active
saved head plus 10 previous revisions by default, configured in 002. Draft typing
does not consume a revision; explicit Save, Apply AI proposal and Restore do.

- Restore creates a new current revision linked to its source; it does not rewind
  IDs, remove Chapters with media, overwrite Takes or roll back financial state.
- Rotate the oldest unpinned previous revision after a successful atomic save.
- Production approvals/receipts retain their immutable source evidence. A revision
  referenced by production is pinned or its exact used snapshot is retained before
  trimming. Rotating the authoring UI cannot break lineage or historical approval.
- Referenced Chapters removed from the active story become archived/needs-review,
  preserving reachable media. Physical deletion is a separate existing action.
- Changing the limit affects future saves, not an immediate destructive sweep.
- No new rotation of Character, Shot, Job, Take, Audit or Credit history.

History shows timestamp, manual/AI/restore source, changed scope and Preview/Restore.
On a version conflict preserve the local draft and offer reload/compare; do not
silently merge text or count a failed save as a revision.

## 4. Scene And Shot Planning

Generate Scenes expands one Chapter. Group continuous location/time into a Scene;
camera changes, dialogue beats and small actions become Shots within that Scene.
Location/time changes start another Scene. Authors may adjust boundaries manually.

The selected Chapter owns the handoff into Scene planning. Its primary action is
`Generate Scenes for this Chapter`; it saves any valid Chapter draft first, pins
the active Chapter revision, and opens a reviewable Scene proposal. It never means
generate Scenes for every Chapter. Authors may instead add a blank Scene manually.
After accepted Scenes exist, the Chapter action becomes `Open Scenes`; full Scene
regeneration belongs inside the Scene workspace and must disclose its impact before
Apply.

Scene generation creates Scene outlines only. It does not silently generate Shots,
media, references or provider Jobs. The Scene workspace is the explicit boundary
for later per-Scene Shot proposals. AI Scene results remain proposals until Apply;
reload preserves the pending review, and stale Chapter revisions cannot be applied.

The Chapter navigator shows compact derived production metadata for every Chapter:
actual Scene count, actual Shot count, pending Scene review and stale-planning state.
Use readable labels with icons, not icon-only counts. When Scenes exist but Shots
have not been planned, display `Shots not planned` instead of the misleading
`0 Shots`. Proposal counts remain visually separate from accepted counts.

The existing `Example/scene-example.md` expands the Chapter encounter labelled
Scene 4; it is not a second unrelated canon. Historical micro-scene numbering in
`Example/chapter-example.md` is input to normalize, not a migration mapping for
live records. Planning fixtures must represent continuous events as Shots.

Each Scene holds objective, location, time/weather, environment state, cast,
dramatic purpose, dialogue target and start/end situation. Director Shot proposals
produce one readable `shotDocument` in the form defined by 009. Duration,
start/action/end, entry/exit continuity, visible Cast, framing, camera, lighting,
art direction, gaze, emotion, prop contact and audio are expressed inside that
chronological document, not exposed as separate authoring fields.

Shots may contain no people. Only visible Characters need visual references;
off-screen dialogue has speaker identity/voice direction but no automatic face
attachment. Opening Scenes may use a configured opening treatment checkbox that
directs visual interest through composition, action or sound. It must not generate
titles, captions or readable text unless explicitly requested by the author.

## 5. Dialogue And Timing

For a dialogue-driven Scene, planning targets at least 60% spoken time by default:

`coverage = sum(duration(union(dialogue intervals per Shot))) / sum(Shot durations)`

Intervals are clamped to each Shot. Overlapping speakers count once, not twice.
Report estimated coverage before speech exists; measured coverage is a later
audio-analysis capability, not a claimed result of text estimation. Include normal
pauses/breathing and reaction time when proposing Shot duration.

Action, montage, establishing and atmosphere Scene purposes are exempt. The user
can override target/purpose or write a deliberately silent Scene. Below-target
coverage and fast speech are actionable recommendations, not Generate locks.

Dialogue records multiple lines with speaker, exact text, language, start/end,
delivery, gaze and reaction. Never shorten or translate a user's line silently to
meet a provider duration. Suggest longer duration, fewer lines or a Shot split.
For the long apology/coffee promise example, the Director must budget speech and
emotional reaction together, instead of forcing an arbitrary four-second shot.

Natural performance may include looking down, meeting the other person's eyes and
holding a reaction, according to intent; do not require continuous eye contact.
Auto-generated direction must identify who speaks and who reacts without forcing
all faces toward the camera.

## 6. Automation And Locks

Deterministic preparation may fill inherited settings and check readiness on open.
LLM generation/enhancement is an explicit operation, using the current text model
policy and existing cost/qualification behavior. Do not call an LLM automatically
while browsing and describe that as free preparation.

| Condition | Behavior |
|---|---|
| Empty optional brief | Allow explicit AI draft with configured defaults |
| No Look while writing story | Allow story/dossier/Scene/Shot text authoring |
| Missing main Character Look at media generation | Explain and link directly to Character asset selection |
| Dialogue below target or estimated too fast | Warn with editable suggestion; allow user override |
| Changed story baseline | Preserve media; show affected scope for review |
| Unsaved valid Chapter at Generate Scenes | Save the Chapter, then generate from the saved revision |
| Empty Chapter at Generate Scenes | Keep the action unavailable and explain that Chapter prose is required |
| Existing accepted Scenes | Open Scene workspace; regeneration is an explicit reviewed action there |
| Scene proposal after Chapter revision changes | Reject Apply as stale and retain both the current Chapter and proposal evidence |
| Existing Scene with Shots/Takes during regeneration | Preserve stable IDs and production evidence; mark affected continuity for review |
| Version conflict or unauthorized access | Reject mutation, retain recoverable local draft |
| Invalid timeline or provider hard limit | Explain the exact invalid input at the affected action |

## 7. Acceptance

- S01: Empty-brief AI and fully manual paths both create a one-Chapter draft;
  story confirmation succeeds with text-only dossiers.
- S02: Enhance and Analyze Roles return distinct scoped previews; stale proposals
  cannot overwrite newer story edits or silently change Chapter/Shot IDs.
- S03: Eleven saved prior versions rotate to ten without losing active content,
  pinned production evidence or media; restore creates a new version.
- S04: Continuous location/time yields multiple Shots in one Scene; environment-only
  Shots are valid and attach no unnecessary Character references.
- S05: Dialogue ratio uses time intervals, handles overlapping speech and exempt
  purposes, and never blocks generation solely for an artistic recommendation.
- S06: Country/genre/feeling/period inputs reach each applicable AI operation and
  configured defaults remain editable; interrupted generation resumes explicitly.
- S07: Opening direction, gaze and physical sequence are expressed visually;
  text/captions are absent by default; dialogue wording is preserved.
- S08: A saved Chapter can generate a reviewable Scene-only proposal or add a
  manual Scene; Apply opens Scene Overview and never creates a hidden Shot.
- S09: Chapter navigation reports accepted Scene/Shot counts and pending/stale
  status truthfully; regeneration preserves existing Shot/Take/media evidence.

## 8. Chapter-To-Scene Implementation Evidence

The 2026-09-21 increment implements S08 and the Scene-planning portion of S09.
Runtime ownership remains under Cinematic application/domain services; the React
screens call only the versioned Cinematic API. Configuration owns Scene proposal
history and maximum generated Scene count. The focused `rewamp-scenes` runner
verifies proposal lifecycle, stale revision protection, manual Scene creation,
absence of hidden Shots, stable production evidence and the Chapter/Scene UI.
Responsive read-only verification covers Thai and English at 390, 820 and 1440 px.

This evidence does not close later Shot-document generation, Scene reorder or
Environment authoring. Those remain owned by tasks 007 and 008.
