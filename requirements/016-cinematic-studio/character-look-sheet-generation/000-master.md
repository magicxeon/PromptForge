# Character Look Sheet Generation Master

**Requirement ID:** `016-CLSG`  
**Status:** Core implementation complete; workflow redesign and live provider qualification pending  
**Owning capability:** Character Profiles / reusable Character Looks  
**Entry surface:** Cinematic Studio -> Cast & Wardrobe  
**Parent requirements:** `013-cinematic-character-look-pack-and-cast-readiness.md`, `fix-tickets/CINE-FIX-006-cast-character-look-preparation-and-story-plan-gate.md`

## 1. Outcome

Make the Wardrobe tab explain what already exists, what is ready, and what the
creator must do next. Then enable one qualified, quoted and resumable
`Generate Look Sheet with AI` workflow that creates a compact multi-view Look
Sheet without creating a second Character Look lifecycle.

The implementation must preserve the current Cast, uploaded-sheet approval,
AI wardrobe analysis, Project Cost, stage navigation and Cinematic binding
contracts unless a child requirement explicitly changes them.

## 2. Role Routing

- Primary: Product and Requirement Architect.
- UX reviewer: UX/UI Product Designer and `review-product-ux`.
- Workflow/financial reviewers: Backend Platform Architect,
  `implement-generation-workflow` and `review-commercial-integrity`.
- Release reviewer: QA Release Engineer and `verify-release-regressions`.
- Cinematic continuity guidance: `design-cinematic-experience`.

Four professional roles are justified because this package simultaneously
changes a material authoring workflow, a cross-capability Generation lifecycle,
customer Credits and media-continuity qualification. They are applied in
sequence; this document does not claim independent parallel review.

## 3. Capability Ownership

| Concern | Canonical owner |
|---|---|
| Character Look draft, immutable version, review and approval | `server/domain/character-profiles/CharacterLookService.js` |
| Character Look persistence | `server/repositories/character-profiles/CharacterLookRepository.js` |
| Cast binding and downstream stale propagation | Cinematic |
| Uploaded/reference Asset authority | Assets and Reference Processing |
| Estimate, Queue, provider dispatch, polling and durable result | Generation |
| Reservation, capture and refund | Credits |
| Reusable Look UI | `web/src/features/profiles/components/CharacterLookDialog.tsx` |
| Cinematic adaptation | `web/src/features/cinematic/components/CinematicStageContent.tsx` |

No child requirement may introduce a Cinematic-owned Look repository, a direct
provider call from React, a feature-local Credit calculation, or a second Job
poller.

## 4. Delivery Order

| Phase | Requirement | Gate |
|---|---|---|
| 1 | [001 Wardrobe Source Action Hierarchy](001-wardrobe-source-action-hierarchy.md) | Presentation-only regression and responsive review |
| 2 | [002 Character Look Sheet Media Contract](002-character-look-sheet-generation-contract.md) | Provider-neutral input/output and authority contract approved |
| 3 | [003 Generation, Credit And Job Lifecycle](003-generation-credit-and-job-lifecycle.md) | Exact quote, idempotency, settlement and durable Job tests pass |
| 4 | [004 Shared UI, Review, Approval And Binding](004-shared-ui-review-approval-and-binding.md) | Generated result can be reviewed, approved and bound through existing owners |
| 5 | [005 QA, Provider Qualification And Rollout](005-qa-provider-qualification-and-rollout.md) | Automated, visual, financial and real-provider evidence passes |
| 6 | [006 Separate Source, Generation And Review Dialog Flow](006-separate-source-generation-and-review-dialog-flow.md) | Modal state, lineage handoff and responsive regressions pass |
| 7 | [007 Discard Unapproved Look Preparation](007-discard-unapproved-look-preparation.md) | Owner-only soft delete, approval guard and list regression pass |
| 8 | [Character Look Workflow Redesign](workflow-redesign/000-master.md) | Prompt wiring, source-specific UX, assurance, Review and protected-feature gates pass |

Each phase is independently reviewable. Phase 1 must not wait for paid media
generation. Phases 3-4 must remain feature-gated until Phase 5 qualifies at
least one provider/model.

## 5. Protected Behavior

- Upload Wardrobe and AI Wardrobe Suggestion continue to open the shared dialog.
- AI Suggestion analysis remains explicit and never generates media silently.
- Uploading and approving an owned complete Look Sheet remains free.
- An existing approved Look remains pinned until the user explicitly approves
  and binds a successor.
- Required Cast cannot continue to a new Story Plan without one approved,
  locked multi-view Look.
- Existing Character Profile, Playground, Studio, Fashion, Storyboard, Credits,
  Job Center and Community behavior remains unchanged.

## 6. Release Decision

Documentation completion does not enable `Generate Look Sheet with AI`.
Customer-paid routing remains closed until the qualification requirement records
provider/model, quality, reference parity, price, failure and refund evidence.

## 7. Implementation Record (2026-08-31)

- Phase 1 presentation hierarchy is implemented with the existing dialog
  callbacks and responsive scoped styles.
- Character Profiles now owns an authorized, immutable Look generation plan
  backed by the versioned `character-look-sheet` prompt recipe.
- AI generation reuses the canonical image estimate, Credit reservation,
  Generation Job, polling, history and result UI through
  `GenerationExperience`.
- Completed owned results can be adopted into the existing Look review state;
  approval and Cinematic binding remain explicit existing mutations.
- Phase 5 live provider quality evidence and viewport/manual release evidence
  remain open. The upload-complete-sheet path remains the no-Credit fallback.
- Phase 6 removes the inline Generation workspace from the source/review modal.
  Generation is presented in a dedicated modal and returns one adopted review
  candidate to the source/review modal without approving or binding it.
- Cast now uses Project Cast as the adjacent portrait authority, orders
  Wardrobe work by Source -> Prepare/Review -> Look used in this film, and
  removes the duplicate Add Look shortcut and ambiguous Primary Look wording.
- Unapproved preparation drafts and review candidates can now be removed through
  the existing owner-scoped retire lifecycle. Approved Looks remain protected,
  while retired records are hidden without deleting media or Credit history.
- A planned workflow-redesign package now owns the remaining prompt duplication,
  source-path simplification, actual-media Review, upload assurance, optional
  Character Match Check and approve/bind recovery work. It is documentation
  only until its ordered child requirements are implemented and verified.
