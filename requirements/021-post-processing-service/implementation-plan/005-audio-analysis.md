# P4 - Audio Analysis

Status: Planned. Depends on P1, private transcript policy and speech-model qualification. Owner: [005](../005-audio-analysis.md).

## Tasks In Order

1. Approve transcript/speaker schema, source rights, actor isolation, retention, languages and correction revisions; define exact mapping boundary from anonymous speaker IDs to Cinematic Characters.
2. Assemble consented Thai, English, mixed-language, rain/music, overlap, silence and short-dialogue fixtures with annotated segments.
3. Benchmark ASR, VAD and diarization independently on chosen hardware; pin versions/licenses and WER/DER plus uncertainty thresholds. Unknown speakers stay unknown.
4. Implement private audio extraction, bounded analysis Job, transcript derivative and Core-owned review persistence. Preserve source AV and raw model evidence; do not change authored Story Plan dialogue automatically.
5. Add accessible timeline playback, correction and manual speaker mapping UI; verify localization and mobile/tablet/desktop controls.
6. Run isolated audio/API/security tests, cross-actor/edit-version tests and human listening UAT. Paid operation requires Credits and privacy gates before visibility.

Document exact commands, prerequisites and dataset access controls when implemented. Completion is a reviewed transcript workflow, not proof of voice identity or consent.
