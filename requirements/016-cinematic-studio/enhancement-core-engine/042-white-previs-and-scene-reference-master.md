# White Previs, Lead-In And Scene References

Status: implemented; offline checks passed, paid visual UAT pending. Parent: 038-041; 2026-09-13.
Primary: Product Requirement Architect. Backend, UX and QA review gates are
applied sequentially, with Generative Cinematic and Commercial checks because
reference transport and billable render duration change. This broader role set
is required by those cross-capability risks; no independent review is claimed.

## Reconciliation

- Preserve the Faceless toggle and its existing Blank treatment. Add White Previs
  as an explicit treatment while Faceless is ON. OFF remains normal faces.
- White Previs is pale matte-white visible facial surfaces with faint orientation
  lines, not a wearable mask. Every selected visible face, including background
  people, receives it. Hair, ears, neck, body, clothes and scene stay photographic.
- User observes about 0.5 s of unresolved faces in some video outputs. Preserve
  the requested usable Shot duration, add a configurable lead-in to video requests
  using an approved White Previs source, and offset action/audio timing. Continue
  asking for complete Look Sheet faces from frame zero; buffer is not proof of
  facial completion. Do not hard-code Lalin/Kin, K-drama or the example action.
- Add explicit generation/approval of an empty environment image per Scene in
  both Simple and Advanced Storyboard. Reuse it for that Scene's later stills,
  with environmental authority only. Do not add extra people or replace Looks.
- Existing frames, Takes, manual drafts, modes, prices, source rejection handling
  and real first_frame feature gate remain intact. No automatic generation or
  retries, no media relabel/backfill or destructive cleanup.

## Ownership

Cinematic owns Scene environment settings/approval and video lead-in derivation.
Generation remains the only batch/quote/submit/queue owner. Reference Processing
owns environment-reference ordering, limits and transport parity; Assets verifies
owned immutable image content. Credits charge the actual reconciled provider
duration. No new repository or durable runtime file is introduced.

Details: [043](043-white-previs-and-video-lead-in.md),
[044](044-scene-environment-generation.md). Ordered tasks/evidence:
[045](045-white-previs-scene-implementation-plan.md).
