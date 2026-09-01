# Character Look Workflow Redesign Master

**Requirement ID:** `016-CLWR`  
**Status:** Implemented; automated gates and Thai responsive smoke passed, remaining manual release matrix pending  
**Priority:** P0 workflow correction  
**Owning capability:** Character Profiles / reusable Character Looks  
**Entry surface:** Cinematic Studio -> Cast & Wardrobe  
**Parent package:** `requirements/016-cinematic-studio/character-look-sheet-generation/`

## 1. Outcome

Redesign the Character Look preparation experience so a creator can move from
one wardrobe source to one inspectable Character Look Sheet and then explicitly
approve it for the selected film without navigating through duplicated actions,
mixed manual/AI controls, empty reference placeholders or misleading identity
claims.

This is a workflow and presentation redesign over the current Character Look,
Generation, Credit, Job and Cinematic binding owners. It must not create a
second Look lifecycle, provider route, Credit calculator, Job poller, Asset
store or Cinematic-owned reusable Look repository.

## 2. User And Primary Job

**Primary user:** a creator preparing one or more Cast members for Story Plan,
Storyboard and video production.

**Primary job:** select or create one wardrobe direction, produce or upload one
complete multi-view Look Sheet, inspect its identity/outfit consistency, and
use the approved immutable Look in the film.

**Shortest safe paths:**

```text
AI direction
  -> Save & prepare
  -> Generate Look Sheet (quoted)
  -> Review result
  -> Approve & use in film

Owned garment reference
  -> Save & prepare
  -> Generate Look Sheet (quoted)
  -> Review result
  -> Approve & use in film

Owned complete Look Sheet
  -> Upload and preview
  -> rights acknowledgement
  -> Review
  -> Approve & use in film
```

Internally, approval and Cinematic binding remain separate mutations for
recovery and audit. In the Cinematic UI they form one user intent, with a clear
partial-success recovery state when approval succeeds but binding conflicts.

## 3. Visible Information Architecture

The overall workflow has three creator-facing stages:

1. **Choose Source**: AI Wardrobe Suggestion, Upload Wardrobe, or Upload a
   completed Character Look Sheet.
2. **Create Look Sheet**: generate from the saved direction/references, or use
   the uploaded complete Sheet.
3. **Review & Use**: inspect the actual image, understand identity assurance,
   optionally validate Character match, approve and use it in the film.

When the preparation dialog opens from an existing Look, `Source saved` is a
compact context summary, not another active step. `Bind to film` is an automatic
post-approval system action in Cinematic, not a fourth creator task.

## 4. Professional Ownership

- Primary: Product and Requirement Architect.
- UX reviewer: UX/UI Product Designer and `review-product-ux`.
- Contract reviewer: Backend Platform Architect for Look/version/provenance and
  actor authorization.
- QA Release Engineer is the implementation release gate through
  `verify-release-regressions`; it is not claimed as an independent reviewer
  during requirement authoring.
- Existing Generation/Credit contracts are protected. If implementation changes
  estimate, reservation, settlement, Queue or provider dispatch, it must trigger
  `implement-generation-workflow` and `review-commercial-integrity` before code.

## 5. Canonical Owners And Reuse

| Concern | Canonical owner / reuse rule |
|---|---|
| reusable Look and immutable Version | `CharacterLookService.js` and `CharacterLookRepository.js` |
| Character identity and authorized reference | Character Profiles / Character Usage |
| uploaded Asset authority | Assets and Reference Processing |
| global Look Sheet prompt recipe | server prompt-recipe configuration |
| provider/model, estimate and submit | shared `GenerationExperience` and Generation APIs |
| Queue, polling, result and resume | Generation / Job Center |
| Credits | Credit domain and server pricing configuration |
| source/preparation/review orchestration | `web/src/features/profiles/` |
| Cinematic adaptation and binding | `web/src/features/cinematic/` |
| optional Character Match Check | server-owned analysis capability; no direct provider call from React |

## 6. Delivery Order

| Phase | Requirement | Priority and gate |
|---|---|---|
| 1 | [State, Provenance And Assurance Contract](001-state-provenance-and-assurance-contract.md) | P0; contract and migration agreed before UI state changes |
| 2 | [Source Selection And Preparation Experience](002-source-selection-and-preparation-experience.md) | P0; source paths converge without losing free upload or draft resume |
| 3 | [Generation Prompt, Reference And Job Workspace](003-generation-prompt-reference-and-job-workspace.md) | P0; 300-character bug fixed and exact quote parity passes |
| 4 | [Review, Validation, Approval And Binding](004-review-validation-approval-and-binding.md) | P0 review/bind; optional validation remains gated until qualified |
| 5 | [Migration, Regression And Rollout](005-migration-regression-and-rollout.md) | Release gate; protected-feature matrix and manual evidence pass |

Implementation must proceed in this order. Phase 3's prompt-wiring correction
may be shipped as an isolated hotfix after its regression tests exist, but no
later phase may bypass Phase 1 data semantics.

## 7. Protected Feature Inventory

The redesign is incomplete if any item below disappears or changes ownership:

- AI Story/Wardrobe analysis and editable AI direction;
- AI direction `Save as draft` and resumable preparation;
- Full Look upload using one required image;
- Separate Pieces with required Upper/Lower and optional Outerwear, Footwear and
  Accessory;
- free user-owned complete Look Sheet upload;
- Character identity/profile version pinning;
- global configurable Look Sheet prompt recipe;
- provider/model capability filtering;
- exact Credit estimate and explicit paid submission;
- durable Queue, Job Center, History, retry and refund behavior;
- navigation away and resume of queued/processing/completed work;
- generated result adoption without automatic approval;
- actual media preview before approval;
- explicit immutable Look approval;
- Cinematic binding and required-Cast Story Plan gate;
- reusable approved Looks and `Look used in this film`;
- removal of unapproved preparation drafts only;
- approved/bound Look deletion protection;
- actor ownership, private media and reference authorization;
- Thai/English, all themes, keyboard/focus and responsive behavior;
- Project Cost, Cast selection, Control Level, Stage footer and sibling tabs.

## 8. Explicit Non-Goals

- no new Character Profile creation flow;
- no automatic media Generation immediately after AI analysis;
- no hard deletion of Generation, Asset or Credit audit records;
- no claim that input lineage proves visual identity match;
- no claim that validating a still Look Sheet verifies identity in a generated
  video;
- no provider-specific UI or duplicated capability/pricing table;
- no new route or page unless modal accessibility cannot be made operable;
- no redesign of unrelated Cast, Story Plan, Storyboard or global shell UI.

## 9. Requirement Closure

This package is ready for implementation only when every child requirement has
an owner, state/error contract, acceptance criteria and regression mapping.
It is complete only after automated checks pass and a human verifies mobile,
tablet and desktop in Thai/English. Optional paid Character Match Check remains
production-gated until provider, price, privacy and accuracy evidence is
recorded; its scaffold does not count as qualification.

## 10. Implementation Evidence (2026-09-01)

- Phase 1 is implemented with additive provenance, identity assurance, rights,
  workflow-state and Cinematic binding projections. Legacy records retain
  conservative `legacy_unknown` behavior.
- Phase 2 is implemented as one source/preparation dialog with three source
  choices, resumable drafts, `Save & prepare`, actual preview gating and no
  change to sibling Cast controls or the global shell.
- Phase 3 uses a separate shared Generation workspace. The long recipe remains
  the main prompt, Additional Direction stays empty, and Separate Pieces are
  normalized by Reference Assets into one owned composite wardrobe authority.
- Phase 4 uses authenticated actual-media review, crop previews, the complete
  human checklist, explicit approval and recoverable approve-then-bind behavior.
- Character Match Check is exposed only as an unavailable server capability;
  there is no UI action, provider dispatch or Credit operation until a later
  qualification phase.
- Automated domain, React, TypeScript, lint, locale and production-build gates
  passed. Playwright verified Thai Cast, Preparation and Generation layouts at
  390/820/1440 with no horizontal overflow. English, all supported themes,
  keyboard/focus and live paid consent remain final release gates, so this
  package is not marked Closed.
