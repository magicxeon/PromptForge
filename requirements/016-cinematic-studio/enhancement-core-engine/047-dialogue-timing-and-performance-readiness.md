# 047 - Dialogue Timing And Performance Readiness

Status: Scoped planning and authorized projection/persistence integration verified
2026-09-13 under master 050 workstream 5. Human timing/video UAT remains open;
not a whole-requirement completion claim.
Ordered tasks: [048](048-dialogue-direction-implementation-plan.md).

## Outcome And Evidence

Generate Story Plan must produce performable dialogue and emotional coverage,
not merely an exact runtime total and populated fields. Detect and repair timing
and direction conflicts before a creator spends on Storyboard or video.

Read-only investigation of project `cineproj_1789050713436_vfjpcrx6`, Scene 1,
Shot `cineshot_1789210678867_n2mizlwf` found:

- Active plan `cineplan_1789229486881_ctyb9dx1` has a 4,000ms Shot, dialogue starting
  at 2,000ms and estimated speech duration 3,000ms. Earlier stored script previews
  estimated the same full Thai line at 2,000ms.
- The line promises coffee on every future visit until compensation is complete.
  Delivery is quiet and slightly hurried. Neither estimate is measured speech.
- Framing is a hand/phone/puddle insert; speakerVisible is false, Kin looks at
  the phone and Lalin speaks outside the frame. There is no mutual-gaze beat.
- The approved plan records film_dialogue_timing_overflow as a warning with
  warningsAcknowledged true. Approval did not repair the plan.
- Current normalization accepts the AI speech estimate, reallocates Shot
  durations to the exact Project target and does not calculate a text-based
  speech feasibility range. Visual repair protects duration and dialogue.
- director_review in the current orchestration is normalization of the existing
  answer, not a separate AI reviewer invocation. Do not represent it as one.

The user no longer requires this Shot to remain four seconds. This does not
authorize changing the Project's total runtime or rewriting its saved work now.
The earlier suggested 8-10 seconds is a directing estimate, not a calibrated
universal duration or a provider guarantee.

## Scope And Ownership

- Primary: Product And Requirement Architect. Review lenses: Cinematic Experience
  Director and QA Release Engineer, sequentially if independent agents are absent.
  Skill: design-cinematic-experience; QA Skill applies during implementation.
- CinematicStoryPlanService owns Generate Plan/Scene Direction orchestration;
  StoryPlanFilmReadiness owns findings; CinematicApplicationService owns versioned
  persistence and approval. Existing text routing, Generation and Credits retain
  their public ownership. No second Director service or provider dispatch path.
- Update versioned Story Plan and Scene Direction recipes through existing loaders.
  Language timing assumptions, pause allowances, tolerances and bounded repair
  budgets belong in server/config/cinematic JSON, not UI constants.
- Apply to new AI-generated plans and explicitly requested Scene Direction.
  Manual Simple rows do not acquire a mandatory Story Plan step.

## Timing Contract

1. Estimate speech feasibility from actual text and spoken language independently
   of the AI's supplied duration. Use a language-aware method; Thai must not be
   treated as one word because it lacks spaces. Keep method/policy version,
   confidence and estimated range distinguishable from measured audio.
2. Account for delivery intent, meaningful pauses, breath, preparation and the
   listener's reaction. Model overlap explicitly: speech and movement may occur
   together, so do not blindly sum every action and reaction duration.
3. Validate each cue against the usable editorial Shot interval, including its
   start offset. Validate multiple lines, turn-taking and explicitly intended
   overlap. Off-screen speech is not permission to exceed the clip boundary.
4. Check both the AI proposal and the final normalized duration allocation.
   Reallocation must not silently shrink a playable line into an impossible slot.
   No automatic speech acceleration, dialogue truncation or unrequested paraphrase.
5. Prefer enlarging unlocked Shots or redistributing genuinely spare time. If
   exact Project runtime cannot accommodate the intended speech/action, return
   an unresolved plan decision with alternatives: extend total runtime, split
   coverage or explicitly revise dialogue. Never silently change a locked total.
6. Editorial duration is not fixed to 4/6/8 seconds. Resolve actual model limits
   later through the existing catalog/quote contract. White Previs lead-in is
   non-editorial time and must not be counted as extra speaking time.
7. Do not start TTS or paid media generation merely to estimate speech. Subsequent
   manual read-through or rendered audio may calibrate the estimate; estimates
   alone cannot guarantee lip sync, provider delivery speed or performance.

## Performance And Coverage Contract

1. Distinguish an informational insert from an emotional exchange. For an apology
   or relationship turning point, provide intentional coverage of speaker/listener
   responses, or an explicit off-screen/held-insert choice with a motivated payoff.
2. For visible dialogue, direct observable mouth/lip behavior, gaze target and
   changes, head/body orientation, pauses and listener response. Use existing
   performance, gaze, framing, action and continuity fields; do not duplicate
   the entire direction in the raw prompt.
3. Eye contact is a motivated option, not mandatory throughout every line.
   Avoid forcing every genre into smiling romance. Preserve Cast personality,
   country style, genre and authored emotional intent.
4. Framing must expose the acting detail being directed. A hand-only insert
   cannot deliver visible facial chemistry without a planned change in coverage.
   Still opening state remains separate from subsequent video performance.
5. For the reported case, a valid proposal may separate the phone-damage insert
   from a longer apology exchange, or redesign one continuous Shot to show both.
   Preserve cause/contact/prop continuity and exact dialogue unless user changes
   are explicitly accepted. Do not hard-code these Characters or this plot into
   reusable recipes or checks.

## Integrated Review And Repair

Generate Plan remains one operation: generate -> normalize -> timing/performance
assessment -> bounded targeted direction repair -> reallocate/revalidate ->
existing visual validation/repair -> final readiness -> editable Draft.

- Reuse the existing router for any real AI review/repair call, with configured
  timeout and attempt bounds. Check normalized input, not just raw model output.
- Timing/direction repair may propose allowed duration and coverage changes;
  it is separate from visual-only repair, whose protected fields stay protected.
  Exact dialogue, Cast/Look authority, story meaning and user locks remain safe.
- Structural edits on an existing plan are reviewable, not silent Shot deletion
  or ID reuse by index. Preserve existing images/Takes and use canonical stale/
  revision handling when an explicitly accepted change affects their source.
- Record actual assessed issues, changed fields, before/after timing and unresolved
  decisions. No completed AI review stage without an actual corresponding call;
  deterministic assessment and model self-review must be named honestly.
- On timeout/no progress, retain the Draft and expose unresolved findings. Do not
  claim repaired readiness, auto-approve or start generation automatically.
- Extra AI calls must fit the existing authorized text-operation budget, pricing
  and idempotency contract. Do not silently enable new charges or uncapped retries.
  Any required financial contract change needs Backend, Commercial and QA gates
  before implementation; this requirement does not change rates or activate billing.

Implementation boundary (2026-09-13): new Story Plan v9 and Scene Direction v8
opt into the independent `CinematicDialogueTiming` assessment. Timing/performance
repair shares the existing maximum two visual-repair calls and timeout; there is
no added loop, TTS, media generation or charge. Timing proposals only redistribute
known spare time within the exact total, preserve all cue authority except start
offset, and are rejected on new conflicts or no improvement. Unknown silent-action
budgets cannot donate time. Visual-only repair still cannot change cue/duration
authority. Existing field locks conservatively suppress automatic dialogue repair
because new-plan IDs cannot safely be mapped back by index. Explicit Scene
Direction preserves supplied dialogue, timing, stable order and media; unmatched
or reordered Shots retain their original contracts. Structure changes remain
unresolved alternatives for explicit review, not automatic ID reassignment.

The helper uses script-unit ranges (Thai base letters, CJK characters, words for
recognized spaced languages and a low-confidence fallback), not a calibrated
speech model. Delivery and pause assumptions live in dialogue-timing.v1.json.
Independent findings are `info` with advisory metadata, avoiding the old warning
acknowledgement gate. `evaluateStoryPlanFilmReadiness(..., { dialogueTiming: true })`
adopts this behavior explicitly; default calls preserve legacy readiness. The
authorized integration now adopts that option at new-plan persistence when the
current versioned `dialogueReview` is present. Proposal, draft, saved-version and
Scene Direction schemas retain its before/allocation/final evidence. Saving
recomputes final assessment from normalized current content, bounds submitted
history to 256000 characters and two rounds, and labels history as submitted
advisory evidence. Unknown versions do not opt into changed approval semantics.
Old plans and unrelated warnings retain their existing acknowledgement rules.

## Readiness And Compatibility

User-choice clarification (2026-09-13):
[Produce 022](../produce-video-pipeline/022-user-controlled-take-duration.md)
owns explicit Take duration. This requirement improves AI defaults, not a minimum
time the user must obey. Estimated overload is advisory and must not require
acknowledgement, forced repair or reapproval to Generate with a supported choice.
Keep technical/provider/authority/financial validation separate from directing
advice. Do not automatically invoke AI when a user changes duration.

| Finding | Treatment |
| --- | --- |
| Start outside Shot / invalid authority | Preserve current hard validation. |
| Strong estimated speech/action overload | Targeted repair or explicit plan decision before claiming ready. |
| Uncertain speech estimate | Advisory with range/reason, not unconditional approval blocker. |
| Deliberate off-screen dialogue or cross-cut audio | Require coherent authored coverage/timing, not generic warning acknowledgement as proof. |
| Impossible locked runtime | Retain draft and offer explicit alternatives; do not force shorter speech. |
| Existing approved plan | No retroactive lock, reapproval, media loss or automatic regeneration. |

Do not solve this by converting every timing warning into a blocking error.
Keep manual overrides intentional and traceable; an unresolved override is not
reported as verified timing. Any new review metadata is additive/versioned within
existing contracts. Preserve prior approval behavior until an explicit new-plan
or review operation adopts this contract.

## Acceptance

- A fixture equivalent to the reported Thai line at start=2s in a 4s Shot is
  flagged even if the model claims its speech duration is only 2s.
- Detect overflow introduced by final duration allocation, not only raw output.
- Preserve legitimate short lines, non-dialogue Shots, multiple speakers,
  intentional overlaps and explicit off-screen performance.
- Validate visible acting against framing without requiring universal eye contact.
- Repair preserves locked words, authorized speakers, causal continuity and runtime
  constraints; unsatisfiable constraints yield a reviewable decision.
- Visual repair cannot undo resolved timing or alter protected dialogue.
- Existing approved plans, Simple navigation, old media/Takes, source references
  and quote/submission parity remain intact.
- Focused automated checks and an explicit manual timing UAT are documented in
  048. No claim of natural delivery based on offline tests alone.
