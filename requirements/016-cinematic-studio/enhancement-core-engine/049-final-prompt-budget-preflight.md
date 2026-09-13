# 049 - Final Prompt Budget Preflight And Automatic Optimization

Status: Planned / documentation only (2026-09-13). Implementation not started.

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
  that check. An affected request without a validated hard-limit result must not
  be dispatched, but neither Project nor other valid Shots are globally locked.
- Do not auto-approve, submit image/video generation, change a model or create a
  new Take as a side effect of checking/optimizing prompt length.

## Ordered Tasks And Acceptance

All tasks pending; execute only after an implementation instruction.

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

Requirement written only. No implementation, tests, builds, API calls, pricing
changes or live Project edits performed for this request.
