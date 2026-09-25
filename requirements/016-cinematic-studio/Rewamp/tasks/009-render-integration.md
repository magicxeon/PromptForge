# 009 - Existing Render Entry And Return

Screen: UX08. Status: Partially implemented; reconciled 2026-09-25.
Parent tasks: T02.2, T05.3, T05.4, T05.6, T05.7, T05.8 (integration scope).
Sources: [005 production](../005-shot-production-and-final.md),
[010 protected surfaces](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic Render host/context; existing Generation/References/Credits unchanged.
Depends on RW00.01/RW00.03 baseline/context and saved Shot/ref contracts from 006/008.
Protected runtime extraction can proceed earlier against old-record fixtures.

## Scope And Ownership

This packet is the sole extraction owner for `CinematicStageContent.tsx` Produce/
Finish logic. Keep current image `GenerationExperience` render regions, live
EngineTargetPanel/VideoEngineTargetPanel, ProduceMediaReview, VideoTakeList,
ProduceShotQueue, GenerationQueueStatus and Job Center unchanged in presentation.
Add only context wiring and Back to Shot; existing Edit Shot actions open packet 008.
Do not clone the qualification-only CinematicEngineTargetPanel.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW08.01 | Extract protected Render/Finish hosts only where needed and update consumers once. | Baseline screenshots/actions match; no extra controller, polling or submit path | Planned |
| RW08.02 | Wire image Render entry and return for optional First Frame, previous last frame and facial treatment. | Original context restored; absent prior video explains disabled extraction; original asset retained on failure | Partial: Shot First Frame entry delivered under 013; full legacy-source/return parity remains |
| RW08.03 | Wire video Render context to the saved document, actual references and composition ON/OFF. | OFF has no hidden source or image-approval gate; source/version/quote match; entry never submits | Planned |
| RW08.04 | Restore writer/Shot/Take selection on return, reload and concurrent completion; reuse existing recovery and queues. | Correct preview changes; old Takes retained; completion belongs to submitted Shot; terminal cutoff | Planned |
| RW08.05 | Verify protected UI and new round-trip interactions; apply integration-only feedback. | R04-R06/R09, V01-V06; three widths; no surprise credits or automatic retry | Planned |

## First Review And Closure

Show writer -> image Render -> writer and writer -> video Render -> writer using
mocked completed/failed tasks, then switch Shot while another task is pending.
No provider generation is needed for this UI review. Existing qualified paid behavior
is exercised only in a separately authorized pilot.
Planned group: `rewamp-render-integration`. Relevant existing groups include
`preview-selection`, `last-frame`, `take-eligibility` and `rewamp-production`; use
the smallest affected selection. UI comparison must include Engine and both queues.
Lifecycle/financial boundary changes trigger their required reviewers and skills.

## Feedback And Evidence

The Shot Writer already exposes inherited Scene Environment and First Frame tools
under packet 013; document OPENING/timeline projection also exists. Dedicated video
entry/return now reuses the exported CinematicProduceRuntime on the Shot route with
`?render=video`, the exact Scene/Shot IDs and Back to Shot. No duplicate Render
controller was created. Packet 008 SD01-SD06 supplies
Cast/dialogue/voice bindings and the separate creator Video Prompt before RW08.03.
Record protected-baseline comparison, submitted Shot/version,
return navigation/draft evidence and any drift. Do not classify UI redesign requests
inside Render as authoring cleanup; they require an explicit scope update.

2026-09-25 scoped evidence: existing Produce runtime (55 tests) and Rewamp schemas
(3 tests) pass. The writer's editable prompt save/reload passes the isolated browser
fixture at 390/820/1440 in TH/EN. Full live Render round trips and provider-quality
verification are not claimed by this authoring slice.
