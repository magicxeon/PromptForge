# 049 - Final Prompt Budget Preflight And Automatic Optimization

Status: Deterministic preflight implemented and verified (2026-09-13).
Semantic fallback/general visual contradiction checks remain open; see evidence.

## Outcome And Scope

Detect prompt overflow before creators reach Storyboard generation, automatically
optimize the execution wording, and avoid repeated late failures in Storyboard
and Produce. Check every affected Shot against the actual selected provider/model,
not only the provider-independent Story Plan text.

This is a technical readiness check, not another approval or navigation lock.
An unresolved overflow blocks only the affected invalid generation request.
Users may still enter Storyboard, edit the Shot or choose another model; other
valid Shots remain usable. Creative timing advice stays advisory under
produce-video-pipeline/022-user-controlled-take-duration.md.

## Ownership And Existing Behavior

- Primary: Product And Requirement Architect. Implementation review: Generative
  Cinematic Production and QA; scoped UX review before changing visible workflow.
  Skill: review-generative-media-pipeline. Reviews are sequential if no independent
  agents are available; do not claim independent verification.
- CinematicStoryboardPromptComposer and CinematicVideoPacketCompiler own final
  still/video wording. Reference Processing owns source ordering and authority;
  Generation owns final request preparation, quote and submission.
- Reuse these owners and versioned server/config/cinematic policies. Do not add
  another prompt compiler, client model-limit table, provider dispatch or queue.
- 012 already requires provider-ready still composition. Video pipeline 003
  already shortens policy wording, duplicate sections, headings and whitespace.
  Both can still fail after final composition. Current still block-boundary
  truncation must not count as safe optimization if it removes required meaning.
- Extend the same public preparation contract for dry-run preflight and actual
  generation; do not approximate success using a different UI-only builder.

## Checkpoints

1. After AI planning/direction repairs and before marking the generated Draft
   Storyboard-ready, dry-run final still prompts for all proposed Shots using
   known engine selections, current Cast/Look assignments and reference roles.
   Report any knowable video prompt risks separately from still readiness.
2. Reuse the same check when entering Storyboard and after manual edits, Scene
   Direction, Cast/reference changes or settings changes. Simple mode without
   Story Plan checks each row directly; it must not acquire a mandatory Plan step.
3. Recheck the affected Shot after changing provider/model, reference order/count,
   Scene environment, facial treatment, enhancement result, motion correction,
   dialogue or Take duration. An old successful check cannot validate new inputs.
4. Validate again after ALL prompt additions in the canonical quote/submit path,
   before reservation/dispatch. Include role mappings, Image numbering, names,
   wrappers, realism/facial reconstruction policies, audio, timeline, buffer,
   prefixes/suffixes and any generated enhancement wording.

When a model, generated source or later-stage input is not yet known, show
provisional/not-checked scope, never a false pass for every provider. A model
switch or new reference can require a new check even after early preflight.

## Limits And Optimization

1. Read limits by provider, model and operation from existing authoritative
   configuration/catalog contracts. Keep provider hard limits distinct from
   internal quality budgets; exceeding a recommended quality budget alone must
   not disable Generate. Do not invent or inflate provider limits to pass.
2. Use the configured counting unit: characters, code points, bytes or tokens as
   applicable. A token limit cannot be certified by a character count. Identify
   fallback estimates and unknown limits honestly; record policy version.
3. Automatically run bounded deterministic compaction first: concise approved
   policy templates, shorter headings, whitespace and only semantically redundant
   repetition. Preserve temporal distinctions and repeated dialogue where intended.
4. If still over a hard limit, support a bounded semantic optimization of eligible
   execution prose through the existing authorized AI text workflow. Keep immutable
   reference/policy sections outside AI editing and recompose them afterward.
   Use configured timeout, attempt and cost bounds; no unlimited retries.
5. Preserve exact dialogue, names/role mappings, reference order/count, numbers,
   authored timestamps, causal sequence, start/end prop states, identity/wardrobe,
   camera geography, motivated light and facial-treatment meaning. Do not remove
   an attached image or essential instruction to make the length fit. Optimized
   prose may be shorter; it may not silently change the requested scene.
6. Validate protected fields/invariants and final length after optimization. Reject
   suspect output rather than assuming semantic equivalence from a shorter string.
   If safe optimization cannot fit, report the overage and targeted alternatives
   such as editing excessive direction or selecting a suitable model. Do not
   silently truncate the remaining text or dispatch an invalid request.
7. Original authored fields and approved images/Takes stay untouched. Store or
   reuse only the derived execution result and its provenance through existing
   contracts. Bind success to input, reference, model and policy fingerprints;
   preserve quote/submission parity and invalidate quotes on final prompt changes.
8. Deterministic preflight makes no AI/provider calls and charges nothing. Extra
   AI text cost must use the existing disclosed/authorized operation budget and
   Credit lifecycle. Automatic is not permission for undisclosed charges; if no
   authorization covers the fallback, retain deterministic results and request
   that authorization. Commercial, Backend and QA gates apply before changing
   any billable behavior; no pricing activation is included in this requirement.

## Reference-Aware Compaction And Conflicting Direction

This section incorporates the user's Storyboard-image discussion. It belongs to
the same optimization contract, not another AI pass or prompt compiler.

1. Separate STILL creation from VIDEO using an existing approved composition image.
   A still prompt with only Look Sheets cannot assume that a finished Scene image
   supplies setting, framing or lighting. Keep the necessary authored description.
2. For an actually attached, authorized composition/environment reference, compact
   repeated static descriptions of its setting, palette, material and placement
   into a concise role-specific preservation clause. Do not assume all invisible
   details are known, or remove essential story-specific spatial constraints.
3. A style-only reference remains style-only. Do not silently promote it to scene,
   pose, facial or blocking authority to save characters. Derive mappings from
   actual payload order and assigned roles, not assumed Image 1/2/3 numbering.
   Look Sheets retain each named person's identity/wardrobe authority; faceless/
   White Previs composition never becomes final-video facial authority.
4. Consolidate duplicate identity/wardrobe and photographic rules into one concise
   block per responsibility. Keep only relevant negative constraints once. Internal
   contract IDs/headings belong in metadata unless required for provider execution;
   retain diagnostic provenance outside the provider prompt.
5. Spend the freed budget on information a static image cannot establish: ordered
   actions, duration/intervals, hand/prop contact changes, facial performance and
   gaze, exact dialogue, pauses/listener reaction, camera motion, sound and end state.
   "Preserve the image" alone is not a complete motion instruction.
6. Flag contradictory authored states for user choice; never silently select a new
   plot or overwrite approvals during compaction. The supplied sample describes
   phone-underwater/wrist-holding at time zero but also phone pickup, and a hand
   insert versus visible faces. Its attached image shows Kin gripping the phone,
   no wrist hold and a fallen pot. Choosing that image as the start does not justify
   reintroducing the earlier pickup/hold state as if it were visible.
7. Enforce contradictions among structured protected fields deterministically where
   possible. Do not claim vision verification from metadata or introduce a hidden
   paid image-analysis call. When image/text correspondence cannot be checked,
   expose uncertainty or an existing user review action, not a false verified result.
   Creative discrepancies remain advisory; malformed required payloads are separate.
8. Do not infer that a shorter prompt guarantees photorealism or provider adherence.
   Keep raw authored text, reference bindings and existing images/Takes unchanged;
   attach derived wording and protected-invariant findings to the same fingerprint.

Initial implementation inventory must distinguish configured internal 4,000-character
budgets from verified model limits. Audit VideoGenerationApplicationService's current
prompt slice(0, 4000) and downstream adapters: no final silent truncation after a
validated quote. Confirm the actual limit/unit from authoritative provider evidence
before labeling a local budget as a provider rejection. Unknown limits must be
reported as unknown, not used to create a new undocumented Generate lock.

## Presentation And Failure States

- Show concise per-Shot states: checking, optimizing, passed, optimized,
  still over limit, provisional or unable to check. Expose before/after size,
  limit/unit and model in existing details instead of dumping raw prompt objects.
- When overflow is detected, show a localized warning and begin the permitted
  optimization automatically, without a separate optimize button in the normal
  authorized path. On success replace the active warning with a compact result.
- Use shared ProcessingSpinner while actual work runs; never tie whole-page
  loading to every background fetch. Debounce edits, deduplicate unchanged input
  work and discard obsolete responses. Persisted check results remain actor-scoped.
- A navigation action must not trigger unbounded repeated AI calls. Reuse existing
  actor-scoped Query/draft ownership; no new polling/cache owner. If a new cache
  is unavoidable, document TTL, invalidation, size and ownership before adding it.
- Timeout/error retains all user work, allows navigation and exposes retry for
  that check. A request known to exceed an authoritative hard limit, or whose
  required technical validation failed, must not be dispatched. Unknown provider
  limits alone are not proof of overflow or a new blanket lock. Neither Project
  nor other valid Shots are globally locked.
- Do not auto-approve, submit image/video generation, change a model or create a
  new Take as a side effect of checking/optimizing prompt length.

## Ordered Tasks And Acceptance

Implementation authorized; evidence and remaining scope are recorded below. Cross-feature
sequence is owned by [050](050-pilot-stability-consolidated-plan.md); inventory can
start early, but final integration follows selected Take timing and AI direction.

1. Inventory final still/video composition paths and actual limit units; add
   fixtures for the recurring overflow cases including reference-added overhead.
2. Expose reusable dry-run results from canonical final preparation, with stable
   per-Shot findings and input/policy fingerprints. No paid request or live-data
   mutation in preflight tests.
3. Extend safe deterministic optimization; add authorized bounded AI fallback
   only through existing text-operation contracts. Prove protected content is
   retained and invalid/overlong fallback output never reaches dispatch.
4. Connect after-plan, row-entry/edit and final quote/submit checks. Reconcile
   with 047 direction repair and 022 user-selected Take timing before UI work.
5. Add scoped localized status in existing workflow/Shot details. Preserve all
   controls, navigation, old results and manual Simple behavior.
6. Run small focused groups and EN/TH responsive checks where UI changes; record
   evidence before closing. Keep manual provider-quality UAT separate.

Acceptance includes: exactly at/over hard limit, internal budget versus provider
limit, Thai/non-ASCII counting, multiple named references, environment/Look/facial
policies, repeated dialogue, conflicting start/end wording, near-limit overhead,
unknown/finalized model selection, changed duration/reference invalidation,
stale async responses, timeout, no safe shortening, and mixed valid/invalid Shots.
Include Look-only stills versus composition-backed video, style-only authority,
phone-underwater versus already-gripped conflicts, faceless/White Previs rules,
duplicate-policy removal and no post-validation truncation. Do not count a
reference-aware rewrite as correct merely because its text is shorter.
An early pass is never reused after inputs change; final quote and request must
use the same validated text. Test short prompts remain unchanged where possible.

Extend existing tests: cinematicStoryboardPromptComposer,
cinematicVideoPacketCompiler, cinematicStoryPlanService and owning generation
entry-point parity tests. Add selectable prompt-budget groups to existing
Cinematic runners and keep aggregate runs explicit. Record exact commands and
prerequisites during implementation; no paid UAT or worker restart in tests.

## Reconciliation And Current Delivery

This extends 012 and video pipeline 003. Automatic AI fallback is a planned,
budget-authorized exception to 012's original no-additional-AI-at-render rule,
not blanket permission for new charges. Prompt preparation stays shared and
visual authority stays immutable. Before-storyboard results are provider/input
scoped, never a promise that every future request will fit.

### Implemented 2026-09-13

- GenerationPromptBudget.js is one pure final-text validator, not a new compiler.
  server/config/generation-prompt-budget.json owns Unicode-code-point counts,
  internal image/video recommendations (4700/4000) and a separate 32000-character
  application request bound. providerLimits is empty until direct API limit/unit
  evidence is verified. The application bound is NOT a claimed Seedance limit.
  Sourced per-provider/model/operation limits can be added in this configuration.
- Video normalization no longer slices to 4000. Existing keyframe/still composers
  retain authored text beyond recommended budgets. Video compaction removes
  headings/spacing and simplifies static setting only when an attached primary
  composition reference owns it. Look-only/style-only sources do not authorize
  removing scene geometry. Dialogue, timestamps, named mappings, face rules,
  prop states and motion remain. Unknown provider limits do not lock Generate.
- Still prepare/preview and final execution share the existing composer. Final
  validation follows refinement and runs again before single/group reservations.
  Video validates after reference-legend assembly; quote/create use identical
  selected-Take rendering and final request validation. No paid optimizer runs
  implicitly. Over the application bound fails explicitly, never truncates.
- Read-only owner-scoped GET projects/:projectId/prompt-preflight examines up to
  128 Shots independently. Plan/Storyboard Query keys include actor, Project and
  version, staleTime 20s, GC 60s, no polling or AI. Checks are explicitly provisional
  before final model/references. Actual still preview and video quote recheck final
  inputs; edits use existing request keys. Failed checks permit navigation/retry.
- Shared PromptBudgetStatus and Cinematic PromptPreflightSummary expose localized
  pending/count/recommendation/error states using ProcessingSpinner. No auto-submit,
  auto-approval, model switch, live repair or reference removal.

Compatibility: keyframe sourceFingerprint retains the legacy prompt projection,
while full text is used for new execution. Structured semantic fields still bind
the fingerprint. legacyProviderIndependentPrompt exists only to match prior approved
records; no second compiler or storage owner. Remove this compatibility projection
only after an explicit migration of all approved keyframe consumers with fixture
parity. Plan-version-only identity fixes remain intact.

### Evidence And Remaining Scope

node scripts/test-cinematic-video.js prompt-budget: 61 passed (composer, packet,
keyframe, Unicode/known-vs-unknown bounds, final single/group pre-reservation checks).
Application preflight fixture proves actor isolation, no Project mutation, no raw
prompt response, and one failed Shot does not prevent another result. Backend
review independently checked preflight, selected timing and legacy fingerprints.
Produce/browser and layout evidence is linked by 050. No live/paid submission.

Not claimed complete: semantic AI fallback needs an explicitly authorized existing
text-operation budget and is documented as deferred, not a working enable switch.
General image/text contradiction detection (for example underwater versus already
gripped phone) is not proven by metadata-only preflight; existing compiler findings
remain advisory and no visual verification is claimed. Early preflight is a bounded
Project-version pass rather than an incremental persisted per-Shot cache. Provider
limit qualification and actual adherence/photorealism remain user UAT. This is
scoped deterministic delivery, not closure of every future acceptance case above.
