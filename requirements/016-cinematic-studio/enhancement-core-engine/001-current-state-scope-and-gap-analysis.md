# Current State, Scope And Gap Analysis

**Status:** Approved planning baseline; implementation pending  
**Owning requirement:** `000-master.md`

## 1. Current Canonical Owners

| Concern | Current canonical path | Decision |
|---|---|---|
| Cinematic Project orchestration | `server/domain/cinematic/CinematicApplicationService.js` | Extend; do not create a second application facade |
| Film readiness and script preview | `server/domain/cinematic/StoryPlanFilmReadiness.js` | Extend with structured linkage and semantic findings |
| AI Story/Scene proposals | `server/domain/generation/CinematicStoryPlanService.js` | Retain provider adapter usage; expose through Cinematic facade |
| Prompt recipes | `server/config/prompt-recipes/cinematic/` | Extend with schema-backed recipe/config registry |
| Storyboard prompt assembly | `web/src/features/cinematic/components/storyboardGenerationAdapter.ts` | Migrate final authority to server compiler after parity tests |
| Shared image generation | `server/domain/generation/GenerationApplicationService.js` and `web/src/components/generation/` | Reuse unchanged |
| Video capability/duration | `server/config/cinematic-video-models.json` and Generation video services | Reuse unchanged |
| React Cinematic stage orchestration | `web/src/features/cinematic/components/CinematicStageContent.tsx` | Decompose only cohesive repeated responsibilities |
| Scene Director Simple completion | `sceneDirectorSimpleContract.ts` | Replace client-derived hidden authority only after server parity exists |
| Client API boundary | `web/src/features/cinematic/api/cinematicApi.ts` and Zod schemas | Extend additively |

## 2. Confirmed Strengths To Preserve

- Stable Project, Story Plan Version, Scene, Shot and Cast Assignment IDs exist.
- Simple and Advanced controls already operate on one Scene draft object.
- Simple save currently preserves populated Advanced fields.
- Story Plan and Scene AI operations return review proposals before persistence.
- Scene Cast and Look selections use durable IDs rather than labels.
- Storyboard manual and batch workflows share Generation, Queue and Credit
  owners.
- Approved Storyboard sources and downstream video attempt lineage exist.
- Provider/model capabilities and video durations are server-configured.
- Actor-scoped preferences and optimistic Project version checks exist.
- Existing tests cover major Cast, Story Plan, Storyboard and navigation
  regressions.

## 3. Confirmed Gaps

### 3.1 Authoring Authority

- Fields do not carry an explicit `user`, `ai`, `inherited` or `default` source.
- AI-derived values cannot be marked stale precisely after an upstream edit.
- Users cannot lock individual decisions against later AI proposals.
- Hidden Simple defaults are derived in the client, so another client could
  persist a different completion result.

### 3.2 Configuration

- Recipe instructions are externalized, but field visibility, dependency,
  precedence, limits and downstream-consumer rules are not.
- Story Plan and Scene Direction provider output schemas remain provider-code
  concerns rather than versioned Cinematic contracts.
- Capture profile, keyframe policy and qualification rubric are not complete
  executable configurations.

### 3.3 Prompt And Keyframe Compilation

- Final Storyboard section assembly is partly hard-coded in React.
- Current compilation can repeat broad Project context even when a Shot needs a
  narrow current-state contract.
- Still-frame semantics and future video movement semantics need an explicit
  transformation boundary.
- Manual and batch parity is tested at the UI adapter level rather than proven
  by one server compilation identity.

### 3.4 Data Linkage

- There is no single report showing which Setup, Cast, Look, Beat, Scene and
  Shot authority reaches a selected keyframe or video packet.
- Missing, duplicate, inactive or stale IDs are discovered by separate screens
  rather than one structured handoff validator.
- Readiness findings do not yet cover every semantic conflict required by the
  Story Improvement Loop.

### 3.5 UX And Component Boundaries

- Large route components own rendering, editing, proposal orchestration and
  readiness presentation together.
- Similar field groups, status summaries and proposal states are not expressed
  through explicit reusable contracts.
- Consolidation must avoid turning a shared visual component into a new
  business-state owner.

## 4. Preservation Contract

The enhancement must preserve:

- AppShell, workspace header and Stage navigation;
- Setup save/autosave and Story Role analysis;
- Character selection, replacement and removal rules;
- Character Look upload, AI suggestion, preparation, approval and binding;
- Story Plan proposal review, draft save and immutable approval;
- Scene and Shot stable IDs and ordering;
- Storyboard card reorder, manual generation, Generate All and approval;
- provider/model selection, exact estimate, Queue submission and polling;
- Job Center, History, Download, Collection and Share actions;
- Produce duration capability checks and video provider-task lifecycle;
- actor isolation, authorization and optimistic version recovery;
- localization, themes and responsive behavior.

Any intentional relocation or removal requires a named acceptance criterion.
Proximity to a changed component is not authorization to alter sibling UI.

## 5. Compatibility Strategy

1. Add metadata as an optional sidecar; do not wrap or replace existing string,
   ID, array or duration fields.
2. Existing Projects without metadata load with deterministic inferred source
   state and remain editable.
3. Existing approved Story Plan and Storyboard sources remain valid until an
   owning authority is actually changed and saved.
4. Read-only linkage reporting ships before any compiler cutover.
5. Server compilation runs in comparison mode before becoming authoritative.
6. Client compiler removal happens only after fixture parity and live Project
   inspection pass.
7. New required fields must have migration defaults or readiness findings; they
   must not make every old Project fail schema parsing.

## 6. Success Measures

- A new user can prepare one Scene in Simple mode without opening Advanced.
- An AI-generated Scene can be fully inspected and edited in Advanced.
- Switching modes changes presentation only and loses no values.
- Every Storyboard Shot, approved video source and Finish timeline entry has a
  trace report back to Setup, Cast, Look, Beat and Scene authority.
- Every data conflict identifies the smallest upstream field or ID to fix.
- Manual and Generate All produce the same keyframe-contract fingerprint for
  the same Shot version.
- Unchanged Cinematic and shared Generation functions retain their existing
  tests and user-visible behavior.
