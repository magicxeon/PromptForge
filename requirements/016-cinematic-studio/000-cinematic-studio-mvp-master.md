# Cinematic Studio MVP Master Requirement

**Status:** Requirement ready for implementation planning
**Source concept:** `momelo-ai-short-film-series-workflow.md`
**Product owner:** Cinematic Studio
**Primary role:** Product And Requirement Architect
**Reviewers:** Cinematic Experience Director, UX/UI Product Designer
**Skills used:** `design-cinematic-experience`, `review-product-ux`
**Implementation in this change:** None

## 1. Outcome

Momelo shall let a creator produce a coherent vertical short film without
knowing screenplay formatting, shot terminology, provider prompting, continuity
or video editing. The user supplies story intent, Characters and wardrobe;
Momelo converts those choices into an editable production plan and charges only
after an explicit quote is accepted.

The MVP is successful when a first-time user can create, review, selectively
regenerate and export one 20-60 second 9:16 film through six visible stages.

## 2. MVP Scope

### 2.1 Launch scope

- Single vertical short film, 20, 30, 45 or 60 seconds.
- One to three reusable Characters with explicit story roles.
- Character default wardrobe, approved wardrobe preset, or uploaded outfit.
- Story brief, genre, mood, pacing, audience feeling and ending intent.
- AI-assisted story plan represented as structured beats, never only prose.
- Scene and shot plan with Character, wardrobe and location continuity.
- Storyboard stills and optional low-cost motion previews.
- Draft video clips, per-shot review and per-shot regeneration.
- Simple ordered timeline, trim points, transitions, music, subtitle and final
  export.
- Credit range before planning and immutable quote before every paid operation.
- Actor-scoped autosave and resume.

### 2.2 Series-lite gate

Series-lite is an MVP extension, not a dependency of first launch. It may be
enabled only after the single-film acceptance gate passes. It supports 2-6
episodes that reuse a Series Bible, cast and continuity baseline. Each episode
still uses the same six-stage production workflow.

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
6. **Finish and Export:** timeline order, trims, transitions, audio, subtitles,
   final quote, render and download.

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

## 6. Requirement Set

- `001-cinematic-studio-screen-and-interaction-flow.md`
- `002-cinematic-project-story-shot-and-continuity-contract.md`
- `003-cinematic-generation-credit-and-media-contract.md`
- `004-cinematic-mvp-delivery-and-validation-plan.md`

The source concept remains product research. These numbered files are the
implementable MVP contract when the documents disagree.

## 7. Global Acceptance

- A new user can complete a single-film project without opening Advanced mode.
- Refresh/restart restores the last committed stage and draft safely.
- Identity, wardrobe and scene continuity sources are inspectable per shot.
- A failed shot can be retried without duplicate charge or full-project reset.
- Cost shown at confirmation equals submitted operation parameters.
- Owner switching never exposes another actor's private project or media.
- Desktop and mobile preserve all six stages without clipped controls.
- All visible text uses i18n and all actions are keyboard reachable.

## 8. Open Decisions Before Implementation

- Initial qualified video provider/model matrix and maximum source-reference
  count per operation.
- Whether voice-over generation ships in launch gate or remains subtitle/music
  only.
- Exact export presets and maximum retained draft duration.
- Commercial prices, refund policy and Series-lite feature flag.

These decisions affect adapters and pricing, not the six-stage product model.
