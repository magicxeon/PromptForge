# P5 - Voice, Dialogue And Lip Sync

Status: Planned. Depends on P4 transcript review and explicit rights/commercial/privacy approvals. Owner: [006](../006-voice-dialogue-and-lipsync.md).

## Tasks In Order

1. Approve voice-owner consent text, verification, permitted scope, revocation/deletion and anti-impersonation policy; model rights and regional storage must be documented before any enrollment.
2. Implement private, auditable Voice Asset enrollment and server-side consent recheck on submission, retry and sharing; prove actor isolation and revocation.
3. Qualify Thai and other declared language synthesis with native listening fixtures. Add segment-level Replace Voice with reviewed transcript and immutable audio derivative; preserve ambience and unaffected speech.
4. Add Repair Dialogue as a separate selectable operation, boundary matching/crossfade and timing choices natural/match_original/fit_segment. Reject impossible timing rather than silently distort delivery.
5. Qualify optional lip-sync independently on selected final audio and selected face/track. Benchmark occlusion, profiles, two speakers and audiovisual drift; never auto-run it after repair.
6. Add preview, compare, correct, adopt and rollback controls. Run security/consent, audio/video quality, Credit single-capture/refund and adjacent Cinematic tests; follow with controlled human UAT.

Each operation can remain disabled until its own gate passes. The explicit aggregate uses fixtures and mocks, never synthesizes with paid models or mutates live customer media. Record commands and evidence at implementation time; no P5 implementation exists today.
