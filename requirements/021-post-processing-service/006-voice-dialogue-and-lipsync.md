# 021-VOICE - Voice, Dialogue Repair And Lip Sync

Status: Planned, deferred P5. Owns source-proposal sections 15-19, 24, 42-45. This is a separate release gate after audio analysis and cannot be inferred from Faceless previs availability.

## Rights And Voice Asset

A Voice Asset requires documented, revocable consent from the voice owner and evidence that the requester may use the recording for the stated project and use. Store the consent scope, identity of consenting party, provenance, permitted languages/uses, expiration, revocation and audit record with private voice media. Do not use a Look Sheet, Character mapping, speaker diarization or uploaded clip as proof of voice rights. An unavailable/revoked voice asset disables new synthesis, with retention and treatment of existing outputs governed by an approved policy.

## Workflows

- Replace Voice: user selects exact dialogue segments, target approved Voice Asset and language; source ambient/sound effects remain preserved. Present a preview and require explicit adoption.
- Repair Dialogue: user selects a damaged/mispronounced portion, supplies corrected text and target voice; preserve the rest of the clip and handle boundaries with crossfades.
- Timing: expose natural, match-original and fit-segment policies with explicit tolerance. Never silently speed up a line until it sounds unnatural; report an overlong line and let the user extend/rewrite/choose another take.
- Lip Sync: an optional subsequent operation bound to a specified final audio derivative and selected visible face/track. It must not auto-run after voice repair or change the selected Take.

All operations use immutable derivatives with segment lineage, text revision, source and target versions, model IDs, consent proof reference and usage. The video, audio and final mux outputs are separate accountable artifacts until explicitly published.

## Safety And Quality

The system must reject missing/revoked consent, cross-actor voice use, unqualified models, disallowed languages and impossible segment timing. Future policies for impersonation, minors and public-figure likeness must be approved before public access. Thai pronunciation and prosody require native-speaker benchmark data; a generic English pass does not qualify Thai output. Test lip-sync on side faces, occlusion, two speakers and short/fast speech. Preserve intelligibility, ambience, sync and spatial continuity; make edits reversible by choosing the original.

## Acceptance

- Server authorization and consent checks are re-evaluated on submit and retry; audit records cannot be forged from client fields.
- Preview, correction, cancellation, derivative selection and export are actor-safe; original media is never overwritten.
- Automated fixtures plus human listening/viewing gates cover Thai, multi-speaker, overlapping speech, noise and AV drift.
- No public or paid release before [007 model/license](007-model-registry-quality-and-licensing.md) and [008 commercial/operations](008-usage-pricing-and-operations.md) gates.

See [voice implementation plan](implementation-plan/006-voice-dialogue-and-lipsync.md).
