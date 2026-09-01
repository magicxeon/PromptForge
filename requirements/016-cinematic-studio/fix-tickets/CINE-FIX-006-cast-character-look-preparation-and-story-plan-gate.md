# CINE-FIX-006 Cast Character Look Preparation And Story Plan Gate

**Priority:** P0  
**Status:** Implemented - pending manual Cast and Look Sheet validation  
**Reported surface:** Cast & Wardrobe -> Story Plan -> Storyboard

## Incident

Cast currently allows a required Character to continue with identity only and
an empty `looks` collection. Garment and AI wardrobe flows save a source-ready
draft, but the Cast screen disables `Prepare Look` instead of offering the
remaining review and approval work. A creator can therefore generate and
approve Storyboard images without an outfit authority; the tested Project
changed a white top to a black top between Scenes.

## Product Decision

The canonical preparation point is **Stage 2: Cast & Wardrobe**, before a new
Story Plan is generated or approved. Character Profiles owns reusable Look
records and media review. Cinematic owns only the Project binding.

One required Cast Assignment is ready only when it has:

```text
eligible pinned Character identity
+ approved Character Look Version
+ front / exact-side / back review authority
+ locked film-wide Cinematic Look binding
= cast_look_ready
```

## Supported Paths

### A. User-supplied complete sheet

1. Open `Create a Character Look` from the selected Cast dossier.
2. Select `Upload Wardrobe` and `Complete Character Look Sheet`.
3. Upload one owned sheet using the standard front/side/back/face layout.
4. Confirm rights, review the contained image, approve the Look Version and
   bind it to the Project.
5. This path is free and must not create a Generation Job or Credit operation.

### B. Garment or AI direction draft

1. Upload a Full Look / Separate Pieces, or analyze the Story for an AI
   wardrobe suggestion.
2. Save one private source-ready Look draft.
3. The Cast Look library exposes `Prepare Look Sheet`, never a disabled dead
   end.
4. Until paid generation is qualified, preparation accepts a user-supplied
   complete sheet and then uses the same review, approval and binding contract
   as Path A.
5. `Generate Look Sheet with AI` remains visibly qualification-gated. It must
   not dispatch, reserve Credits or imply a quote until provider capability,
   reference parity, immutable estimate and media-quality qualification pass.

## Cast Screen Contract

- Preserve the current Cast heading, Control Level, role strip, dossier tabs,
  Project Cost summary, Stage footer and sibling layout.
- Add a compact four-step readiness strip in the Wardrobe tab: Source,
  Prepare Sheet, Review, Bind.
- The current binding distinguishes `Ready for Story Plan` from
  `Preparation required`.
- Draft/review Look cards expose the next valid action. Approved unbound Looks
  expose `Use this Look`; an approved Look created from Cast is bound
  automatically after approval.
- Required-role progress counts identity and Look readiness separately.
- Continue to Story Plan is disabled with an actionable explanation while any
  required role lacks an approved bound Look.
- Continuity states no longer describe Look preparation as optional for a
  required on-screen Character.

## Server Gate

- New Story Plan proposal generation rejects a missing required Character Look.
- Story Plan v2 approval rejects the same condition independently of the UI.
- A ready binding must resolve an approved Character Look Version with
  multi-view approved Assets; a label-only `character_default` binding with no
  media authority is insufficient.
- Existing approved Plans remain readable for recovery. The new gate applies
  when generating or approving a new Plan and never mutates existing media or
  Credits.

## Presentation Validation Contract

The closeout story must exercise:

- at least one required speaking Character and one optional/supporting role;
- explicit dialogue plus a no-dialogue reaction Shot;
- one approved complete Character Look Sheet per required Character;
- wide, medium and close-up Storyboard compositions;
- visible Scene-to-Scene emotional change;
- stable identity, hair, wardrobe, props and screen direction;
- exact quote before each paid image/video operation;
- no Video submission until all Storyboard sources pass human review;
- queue/restart recovery, selective retry and Credit settlement evidence.

## Implementation Steps

1. Extend the shared Character Profile-owned Look dialog with a preparation
   mode for an existing source-ready draft.
2. Upload one complete sheet, attach the standard crop manifest, approve the
   exact Look Version and return the updated Look.
3. Update Cast to open preparation, refresh its Look library and bind an
   approved result through the existing Cinematic Look endpoint.
4. Add separate required-role identity and Look readiness indicators and Stage
   footer blocking copy.
5. Enforce the same readiness in the Story Plan server boundary.
6. Add focused domain, shared-dialog, Cast, i18n and responsive regression
   tests plus a Thai presentation checklist.

## Acceptance

- A saved garment/AI draft never appears Storyboard-ready.
- `Prepare Look Sheet` opens and can complete upload -> review -> approval.
- Completing preparation from Cast binds the approved immutable Look to the
  selected Character without creating a parallel Look record.
- A new Story Plan cannot be generated or approved with `looks: []` for a
  required assigned Character.
- User-supplied complete-sheet preparation creates no Credit reservation.
- AI media generation remains unavailable with a truthful qualification
  explanation.
- Existing Setup, Character picker, Direction, Continuity, Project Cost,
  navigation and footer layout remain present.

## Implementation Evidence

- The shared Character Profile-owned dialog prepares an existing source-ready
  Look by uploading, reviewing and approving one complete Look Sheet without
  creating a second Look.
- Cast exposes Source -> Prepare Sheet -> Review -> Bind readiness and binds an
  approved result through the canonical Cinematic wardrobe endpoint.
- Required roles distinguish assignment from identity/Look readiness; the
  Stage footer and server reject a new Story Plan until every required role has
  an approved locked multi-view Look binding.
- Thai presentation validation is recorded in
  `_temp/test-case/cinematic-presentation-story-e2e-th.md`.
- Automated evidence: Cinematic server tests `25 passed`; focused Character
  Look/Cast Web tests `48 passed`; full Web tests `344 passed`; TypeScript and
  i18n validation passed on 2026-08-30.
- Manual visual checks remain required at mobile, tablet and desktop widths,
  plus one real upload -> approve -> bind workflow before closing this ticket.
