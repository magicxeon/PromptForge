# Story Improvement Round 001 - Story-to-Storyboard Coherence

**Status:** Generic improvement requirement recorded; implementation pending  
**Scope:** Cinematic Story generation, Story Plan, Scene Director and Storyboard preparation  
**Primary role:** Product and Requirement Architect  
**Reviewers:** Cinematic Experience Director, QA Release Engineer  

## 1. Outcome

Improve the Cinematic story-generation loop so every generated Story Plan can
be translated into clear, economical Storyboard stills and later into coherent
video Shots without relying on corrections written for one specific story.

This requirement defines reusable relationships and validation rules. A real
Project may provide evidence for a round, but its names, locations, dialogue,
props and visual style must not become hard-coded generator behavior.

## 2. Improvement Loop

Each improvement round follows this evidence loop:

1. Generate or manually author a Project Intent.
2. Produce a structured Story Plan with Beats, Scenes and Shots.
3. Compile one provider-independent Storyboard Still Contract per Shot.
4. Generate a low-cost still candidate only after reference and Credit gates.
5. Evaluate the result against story, composition, identity, wardrobe and
   continuity authority.
6. Classify drift by the owning upstream field rather than patching only the
   final prompt.
7. Improve the generator recipe, schema validation or compiler precedence.
8. Re-run the same case and at least one different regression story.

Round findings become system rules only when they remain valid across different
stories, Characters, locations, genres and providers.

## 3. Canonical Relationship Model

```text
Project Intent
  -> Character and Look authority
  -> Story emotional arc
  -> Beat purpose and visible change
  -> Scene entry/exit state
  -> Shot visible moment and one primary action
  -> Storyboard Still Contract
  -> Image candidate and qualification evidence
  -> Approved Storyboard source
  -> Provider-aware video attempt
```

Each downstream level narrows its parent. It must not introduce a new story
event, Character, Look, prop, emotional state, lighting state or screen
direction without explicit upstream authority.

## 4. Generic Story Generator Rules

### 4.1 Project Intent Owns Global Invariants

The generator must extract and preserve:

- format, aspect ratio and target duration;
- genre, audience feeling, pacing and ending intent;
- Character visibility constraints;
- global screen direction and spatial anchors;
- realism or stylization level;
- forbidden content, text and presentation effects;
- beginning and ending lighting or emotional states.

Ambiguous motion language must be normalized into an observable direction. For
example, use `movement axis: camera-left to camera-right` instead of prose such
as `camera moves on the left`.

### 4.2 A Beat Owns One Narrative Change

Every Beat must define:

- dramatic purpose;
- cause entering the Beat;
- one visible story change;
- consequence leaving the Beat;
- emotional start and emotional end;
- target duration.

A Beat may contain multiple Scenes, but each Scene must advance the same Beat
change. The generator must reject a Beat that only describes atmosphere and has
no observable consequence.

### 4.3 A Scene Owns Entry-to-Exit Continuity

Every Scene must define:

- location and time;
- entry and exit state;
- objective and visible pressure;
- Character blocking and screen direction;
- lighting state;
- Scene emotional start and end;
- transition intent;
- participating Cast Assignments and approved Looks.

Environment state must be physically explicit. For example, `rain outside with
wet pavement` must not compile into an unexplained wet interior floor.

### 4.4 A Shot Owns One Visible Moment

Every Shot must define:

- visual purpose;
- exact visible moment;
- one primary physical action;
- framing and camera angle;
- camera movement intent for video;
- blocking and gaze;
- one visible emotional target;
- observable performance cue;
- lighting and environment state;
- entry and exit continuity anchors;
- duration and transition to the next Shot.

The generator must split a proposal when it contains multiple framings, cuts or
primary actions. A Shot such as `hold a prop and press a phone, then cut from a
wide frame to a close-up` is at least two Shots.

### 4.5 Still and Video Camera Semantics Remain Separate

The Story Plan may retain camera movement for the future video attempt. The
Storyboard compiler must translate that movement into one still-frame position,
for example:

```text
cameraMovement: slow track left-to-right
storyboardFramePosition: midpoint of the track, subject sharp, no motion blur
```

The still prompt must not ask one image to depict camera travel, multiple
framing states or a temporal edit.

### 4.6 Current Shot State Overrides Future Story Context

Project and Beat context explain narrative meaning but do not authorize all
future events in the current image. The compiler must emit explicit current
state and exclusions:

- props currently held or not yet held;
- lights currently on or off;
- current emotional target rather than the final arc;
- current Character position and gaze;
- people currently visible;
- actions that have not happened yet.

This prevents ending light, later props, dialogue moments or emotional
resolution from leaking into an opening still.

### 4.7 Character and Wardrobe Use Reference Authority

Character names and Look names are labels, not sufficient visual authority.
Before quote and submission, the shared Generation workflow must resolve:

- the pinned Character Profile Version and identity reference;
- the approved Character Look Version and Look Sheet;
- actor ownership and reuse authorization;
- provider reference capability and count limits;
- the current Scene and Shot source fingerprint.

If required authority is missing, generation is disabled with a specific
recovery action. The system must not silently ask a provider to reinterpret a
Character or outfit from its name.

### 4.8 Text Constraints Distinguish Physical Props from Overlays

The generator must distinguish:

- physical in-world text required by the story;
- phone or device content that must remain unreadable;
- forbidden captions, subtitles, logos and overlay text.

`No text` must not conflict with a required physical sign. When exact physical
text is important, the Shot must identify it as the only permitted readable
text and qualification must check its accuracy.

### 4.9 Timing Must Reconcile Before Video Qualification

For every Shot:

```text
estimatedActionDurationMs <= durationMs
```

Scene duration must equal the sum of its Shot durations, and total Scene
duration must equal the Project target within the configured tolerance. Audio
cues may overlap but must remain inside their owning Shot timeline unless an
explicit carry-over is defined.

Provider duration support is evaluated after the provider-independent Story
Plan is approved. Unsupported durations require a visible split, trim or
extension decision and must not silently change story timing.

## 5. Storyboard Still Compiler Precedence

The compiler assembles information in this order:

1. Current Shot visible moment and current-state exclusions.
2. Character identity and approved Look reference authority.
3. Shot framing, blocking, gaze, performance, light and environment.
4. Scene entry/exit continuity and spatial anchors.
5. Beat purpose and emotional transition as narrative context only.
6. Project intent and global prohibitions.

When fields conflict, the compiler must report the conflict. It must not merge
both values into the prompt or silently choose one.

## 6. Required Validation Findings

The Story generator and Storyboard compiler expose structured findings with an
owning field path and severity:

| Finding | Severity | Owner |
|---|---|---|
| More than one primary action in a Shot | blocking | Shot generation |
| Multiple framings or cuts in one still | blocking | Shot generation |
| Future-state prop, light or emotion leakage | blocking | Prompt compiler |
| Missing Character or Look authority | blocking | Reference resolution |
| Conflicting weather or environment state | blocking | Scene generation |
| Ambiguous screen direction | warning | Project/Scene generation |
| Empty gaze for a performance-critical Shot | warning | Shot generation |
| Action estimate exceeds Shot duration | blocking before video | Timing reconciliation |
| Physical text conflicts with `no text` | warning or blocking by story importance | Prompt compiler |

Every finding must link the user to the smallest editable owning section.

## 7. Qualification Rubric

A generated still is evaluated on:

1. **Story moment:** only the selected Shot event is visible.
2. **Identity:** face, apparent age, proportions and hair match authority.
3. **Wardrobe:** the approved Look is unchanged and contains no invented item.
4. **Performance:** posture, gesture and gaze express one emotional target.
5. **Composition:** framing, blocking, screen direction and spatial anchors
   match the Shot.
6. **Lighting:** current Scene light is correct and later light does not leak.
7. **Environment:** weather and surfaces remain physically plausible.
8. **Continuity:** entry/exit anchors support adjacent Shots.
9. **Prohibitions:** no extra Character, overlay text, logo, beauty filter or
   other forbidden element appears.

Each failed dimension records the originating field path so the next
improvement round can distinguish story-generation drift from provider drift.

## 8. Acceptance Criteria

- The same rules can evaluate at least two stories with different locations,
  props and emotional arcs.
- Every generated Shot has one visible moment, one primary action and one
  emotional target.
- The Storyboard still compiler does not flatten an entire Project or Beat into
  one image prompt.
- Current-state exclusions prevent future events from leaking into earlier
  Shots.
- Character and Look references are resolved before the Credit-bearing action.
- Conflicting fields produce actionable findings with exact owner paths.
- Timing remains internally consistent and can be reconciled with video
  provider duration capabilities later.
- Improvements extend the canonical Story and Generation workflows; they do
  not create a Project-specific prompt path.

## 9. Round 001 Evidence Appendix

The following Project exposed the generic gaps in this round and remains test
evidence only:

- Project: `cineproj_1787841798259_d5rmu2tx`
- Scene: `cinescene_1788255072429_s4asat3j`
- Shot: `cineshot_1788255072429_pzz9vdgr`

Observed reusable findings:

- ambiguous global camera-direction prose;
- active rain conflicting with `after rain` Scene time;
- wet exterior context capable of becoming a wet interior floor;
- video camera movement copied directly into a still contract;
- later props capable of leaking into the opening Shot;
- Character and Look names used where reference authority is required;
- action estimates exceeding owning Shot durations.

No cafe-specific name, dialogue, prop, wardrobe or lighting value in this
appendix is a generator default.

## 10. Verification Plan

1. Re-run the evidence Project after implementing the generic rules.
2. Run a second story with multiple Characters and different Looks.
3. Run a story with no physical text and one with required in-world text.
4. Verify Storyboard still contracts before provider submission.
5. Compare generated outputs with the qualification rubric.
6. Confirm displayed and submitted provider, model, aspect ratio, references
   and Credit estimate remain identical.
7. Confirm no approved Storyboard source or downstream video attempt is
   invalidated until the user saves and approves a changed Shot contract.
