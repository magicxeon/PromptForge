# Cinematic Studio MVP Master Requirement

**Status:** C1 shared foundation implemented on 2026-08-17; C1.5 UX contract
revised for contextual operations and Project costs; visual revision and owner
approval are required before C2 functional integration
**Source concept:** `momelo-ai-short-film-series-workflow.md`
**Product owner:** Cinematic Studio
**Primary role:** Product And Requirement Architect
**Reviewers:** Cinematic Experience Director, UX/UI Product Designer
**Skills used:** `design-cinematic-experience`, `review-product-ux`
**Implementation in this change:** C1.5 local-only UX mockup implemented; no
provider dispatch, accepted Credit quote, durable Project mutation or export

## 1. Outcome

Momelo shall let a creator produce a coherent vertical short film without
knowing screenplay formatting, shot terminology, provider prompting, continuity
or video editing. The user supplies story intent, Characters and wardrobe;
Momelo converts those choices into an editable production plan and charges only
after an explicit quote is accepted.

The MVP is successful when a first-time user can create, review, selectively
regenerate and export one 20-60 second 9:16 film through six visible stages.

## 2. MVP Scope

### C1.5 UX mockup checkpoint - 2026-08-17

The internal route now presents all six stages with stage-owned workspaces:
Story Enhance comparison, filtered Character picker, wardrobe source choices,
Scene Director detail, per-Shot Storyboard prompt/provider/reset controls,
per-Shot video Produce controls, MVP trim/transition/export controls and a
persistent Project cost summary. Billable actions remain disabled preview
fixtures. The former permanently visible Engine panel is retained as reusable
foundation code but is no longer shown outside a contextual operation.

This checkpoint validates information architecture only. It does not prove
provider capability, pricing, Queue behavior, durable Project state, Credit
reservation or media output.

### 2.1 Launch scope

- Single vertical short film, 20, 30, 45 or 60 seconds.
- One to three reusable Characters with explicit story roles.
- Character default wardrobe, approved wardrobe preset, or uploaded outfit.
- Story brief, genre, mood, pacing, audience feeling and ending intent.
- AI-assisted story plan represented as structured beats, never only prose.
- Scene and shot plan with Character, wardrobe and location continuity.
- Storyboard stills and optional low-cost motion previews.
- Draft video clips, per-shot review and per-shot regeneration.
- Simple ordered timeline, trim points, cut/dissolve/fade, preview and final
  export.
- Credit range before planning and immutable quote before every paid operation.
- Actor-scoped autosave and resume.

### 2.2 Series-lite gate

Series-lite is an MVP extension, not a dependency of first launch. It may be
enabled only after the single-film acceptance gate passes. It supports 2-6
episodes that reuse a Series Bible, cast and continuity baseline. Each episode
still uses the same six-stage production workflow.

### 2.3 Deferred commercial and product advertising

Product commercials, service advertising and campaign production are outside
the first Cinematic MVP. They require a separate Campaign Brief, product
dimensions/scale authority, packaging and logo fidelity, claims/CTA review,
hero/detail/usage/pack shots and advertising-specific qualification. Do not add
an `Advertising` genre or hidden product fields to the MVP Setup form. Preserve
an extension point for a later campaign workflow after single-film closure.

### 2.3 Deferred

- Branching stories, collaboration and real-time co-editing.
- Voice cloning, lip-sync dialogue and complex multi-speaker scenes.
- Automatic continuity repair without user approval.
- Advanced non-linear editor, keyframes and compositing.
- Marketplace licensing, automated social publishing and campaign analytics.
- Provider-specific controls exposed as the default user experience.

## 3. Six-Stage User Model

```mermaid
flowchart LR
  A[1 Setup] --> B[2 Cast and Wardrobe]
  B --> C[3 Story Plan]
  C --> D[4 Storyboard]
  D --> E[5 Produce]
  E --> F[6 Finish and Export]
```

Internal operations may be more granular, but navigation, autosave and progress
must use these six stable stages.

1. **Setup:** project type, platform, duration, story brief and creative intent.
2. **Cast and Wardrobe:** Character roles, identity authority, wardrobe and
   continuity defaults.
3. **Story Plan:** generated beats, scenes, emotional arc and estimated shot
   count; user approves or edits.
4. **Storyboard:** shot composition, duration, camera, performance, continuity
   and preview stills.
5. **Produce:** draft/final clip generation, queue status, selective retry and
   shot approval.
6. **Finish and Export:** timeline order, trims, basic transitions, final quote,
   render and download.

## 4. Product Rules

1. A project is private and owner-scoped by default.
2. No paid generation starts from page load, autosave or AI planning without an
   accepted quote.
3. A Character Profile Version is pinned when production begins. Later Profile
   edits do not silently alter an in-progress film.
4. Wardrobe authority is explicit per Character and may be locked after the
   storyboard is approved.
5. Story, scene, shot and generation attempt are separate versioned concepts.
6. Regenerating one shot must not invalidate approved unrelated shots.
7. Provider/model selection is policy-driven. Simple mode shows quality tiers;
   Advanced mode may show qualified providers only.
8. Every long-running operation exposes queued, processing, completed, failed,
   cancelled and recoverable states.
9. Generated media stores Asset/Generation identifiers, not durable browser
   Base64 payloads.
10. Public sharing is a separate explicit workflow after export; it is not part
    of generation consent.
11. Produce uses the exact approved immutable Storyboard Asset Version for each
    Shot. Replacing that source preserves history but makes dependent clips and
    exports stale until the affected Shot is regenerated and approved again.

## 5. Capability Ownership

| Concern | Canonical owner | Cinematic use |
|---|---|---|
| Project membership | Projects | Project identity, owner and collaborators later |
| Film aggregate | Cinematic Studio | Story, scenes, shots, continuity and timeline |
| Character identity | Character Profiles | Pinned Profile/Version and identity pack |
| Outfit media | Assets / Fashion | Uploaded references and approved wardrobe assets |
| Reference authority | Reference Processing | Per-shot Character/wardrobe/scene plan |
| Provider dispatch | Generation | Image, video, audio and export jobs |
| Generated media | Assets | Durable media metadata and object references |
| Quote and settlement | Credits | Estimate, reservation, capture and refund |
| Provider qualification | Generation/provider catalog | Eligible models by operation |
| Trace and support | Observability / Support | Correlation, diagnosis and recovery |

Cinematic Studio may orchestrate these public contracts but must not access a
foreign repository or provider directly.

## 5.1 Architecture principles

1. Cinematic Studio is a new orchestration capability, not a second
   Generation, Credit, Asset, Character, Reference, theme or Admin platform.
2. Shared image-generation UI behavior is extended through typed media and
   operation adapters. Existing image consumers remain protected by tests.
3. Video-specific story, Scene, Shot, continuity and timeline behavior remains
   inside the Cinematic capability and is not pushed into generic components.
4. Browser storage holds only actor-scoped recoverable drafts and presentation
   preferences. Server records remain authoritative for accepted quotes, Jobs,
   attempts, Assets, approvals and financial state.
5. Admin and Support inspect Cinematic through bounded read models and invoke
   owner commands; they never mutate Cinematic, Generation or Credit storage.
6. Every operation is traceable through Project, Scene, Shot, attempt,
   Generation Group, Job, provider task, quote, reservation and settlement IDs.
7. The active application theme applies to Cinematic through existing semantic
   tokens. Cinematic must not introduce a route-local theme system.

## 6. Requirement Set

- `001-cinematic-studio-screen-and-interaction-flow.md`
- `002-cinematic-project-story-shot-and-continuity-contract.md`
- `003-cinematic-generation-credit-and-media-contract.md`
- `004-cinematic-mvp-delivery-and-validation-plan.md`
- `005-video-provider-pricing-and-credit-model.md`
- `006-video-generation-provider-contract.md`
- `007-cinematic-shared-component-state-and-project-structure.md`
- `008-cinematic-admin-support-and-observability-contract.md`

The source concept remains product research. These numbered files are the
implementable MVP contract when the documents disagree. Requirement 004 owns
delivery order; Requirement 007 owns code placement and reuse boundaries;
Requirement 008 owns operational visibility without taking business ownership
from Cinematic, Generation, Credits or Assets.

## 7. Implementation order

```text
C0 contract and protected-behavior freeze
-> C1 shared component/state/schema foundation
-> C1.5 six-stage UX/UI prototype and usability approval
-> C2 private Project Setup and Cast vertical slice
-> C3 Story Plan, continuity and Storyboard vertical slice
-> C4 qualified draft-video production and financial lifecycle
-> C5 Finish, export and recovery
-> C6 Admin/Support operational completion and launch hardening
-> C7 optional Series-lite
```

No later checkpoint may be started merely because its screen is easy to build.
Each checkpoint must prove its domain, UI, persistence, authorization and
recovery path together.

### C1.5 UX/UI-first boundary

All six stages shall be reviewable with actor-scoped local fixture state before
Project, provider, Generation or Credit integration begins. The prototype may
navigate, edit presentation fields and demonstrate terminal states, but it must
not invent accepted quotes, provider Jobs, durable Assets or server approval.
UX approval freezes the principal information architecture, responsive behavior
and shared Generation shell before C2 vertical slices.

## 8. Global Acceptance

- A new user can complete a single-film project without opening Advanced mode.
- Refresh/restart restores the last committed stage and draft safely.
- Identity, wardrobe and scene continuity sources are inspectable per shot.
- A failed shot can be retried without duplicate charge or full-project reset.
- Cost shown at confirmation equals submitted operation parameters.
- Owner switching never exposes another actor's private project or media.
- Desktop and mobile preserve all six stages without clipped controls.
- All visible text uses i18n and all actions are keyboard reachable.

## 9. Open Decisions Before Implementation

- Final promotion decisions from the Veo/Seedance qualification matrix in
  `006-video-generation-provider-contract.md`; candidate capability and pricing
  contracts are now documented, but no candidate is launch-qualified yet.
- Exact export presets and maximum retained draft duration.
- Commercial prices, refund policy and Series-lite feature flag.

These decisions affect adapters and pricing, not the six-stage product model.
