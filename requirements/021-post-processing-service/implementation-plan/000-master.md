# 021-PPS - Ordered Implementation Master

Status: Faceless API-first local pilot in progress, 2026-09-14. Later phases remain planned. Requirement owner: [021 master](../000-master.md). Primary Product Requirement Architect; Backend/Security and QA review the P0 implementation, Commercial joins before any paid phase. Reviews are sequential until independent reviewers are available.

## Dependency Order And Delivery Gates

| Order | Plan | Dependency | Exit gate |
|---|---|---|---|
| P0 | [001 Faceless previs first](001-faceless-previs-first.md) | Existing Assets last-frame and Cinematic Storyboard contracts | Private, bounded, non-billable facemask derivative; existing Generate modes unaffected |
| P0-config (done locally) | [007 Service structure and configuration](007-service-structure-and-configuration.md) | Existing P0 API pilot | Scoped agent rules and validated config without changing API behavior |
| P1 | [002 Platform readiness](002-platform-readiness.md) | P0 findings and measured demand | Production ownership, security, persistence, retention, license, cost/ops decisions |
| P2 | [003 Image processing](003-image-processing.md) | P1 + image model qualification | Upscale/restore derivative with visual and commercial gates |
| P3 | [004 Video processing](004-video-processing.md) | P1 + video model/capacity qualification | Audio-preserving video derivatives and selected rendition workflow |
| P4 | [005 Audio analysis](005-audio-analysis.md) | P1 + speech/privacy/UX qualification | Reviewed transcript and speaker mapping |
| P5 | [006 Voice and lip sync](006-voice-dialogue-and-lipsync.md) | P4 + consent, license and rights decisions | Opt-in reviewed voice, repair and separately selected lip sync |

The source proposal's suggested Phase 1 image/video order is intentionally superseded by the approved Faceless-first pilot. P2-P4 can be reprioritized after P1 evidence but never assumed enabled by P0.

## Canonical Ownership And Proposed Placement

Existing Core owners remain in server/domain/assets, server/domain/cinematic, server/domain/generation and server/domain/credits, with HTTP through server/app/routes. The API-first service now lives in post-processing-service/ with api/, domain/, adapters/ and models/; later workers/ and deployment/ remain planned. The Core PostProcessingServiceClient in server/providers invokes its private loopback API; FacelessPrevisAssetService registers derivatives and Cinematic alone chooses/approves them. The current local model file is ignored by Git and the service returns unavailable without a pinned valid model.

One status/dispatch contract serves all future operations; add adapters under it, not another route-local queue or ledger. P0 must not introduce shared local-disk assumptions that prevent later private signed object transport. See [001](../001-api-jobs-assets-and-security.md) for contracts.

## Validation Discipline

Implement one numbered task at a time, update its status/evidence in its phase plan, then advance. Extend an owning focused runner under scripts/ when code exists, with selectable groups named api, mask, cinematic, security and all for P0; later phases add image, video, audio, commercial groups to that aggregate. The all command must be explicit and fail on errors; isolated checks use fixtures/mocks, never invoke paid providers, modify live Project data or restart workers. Each phase documents actual command and prerequisites at implementation time. UAT with real private media and optional paid provider calls is separate and opt-in.

After each implementation slice: schema/contract checks, focused unit/integration tests, actor isolation, interruption/cutoff, error/fallback, adjacent workflow regression and responsive UI at approximately 390/820/1440px if UI changes. Record unverified viewports or unavailable runtime. For P0, verify new white-mask path and existing blank/white provider Generate plus full-face flow independently.

## Decision Log Required Before Code

P0 may use local development media only after an explicit scoped private grant design. Before production decide service deployment region, signed transport/object-store owner, retention/erasure, internal auth, model rights and documented model checksums. Before any charge decide pricing, consent, refund, partial failure and reconciliation in Core Credits. Before voice decide consent and misuse policy. Record the chosen policy/version in the phase plan rather than silently deriving it from a source-document example.

## Master Closure Criteria

Each phase status advances only with linked test evidence, owner review and release decision. P0 completion does not complete 021-PPS as a whole. The master is complete only after the full source-proposal scope is either shipped with evidence or explicitly retired by a later approved requirement.
