# 021-AUD - Audio Analysis And Speaker Mapping

Status: Implemented (P4). Owns speech-to-text transcription (/v1/audio/transcribe), word timestamps, language detection, and speaker diarization (/v1/audio/diarize). This is transcription/analysis, not voice generation.

## Analysis Pipeline

Accept an owner-scoped audio Asset or selected video Take, extract audio without modifying the source, detect speech regions, transcribe with word/segment timestamps and language tags, diarize speakers, then produce a versioned transcript artifact. Keep source media and machine transcript separate. Return speaker-local IDs, time intervals, text, confidence/uncertainty, overlap flags and model versions. User edits create a new transcript revision; do not overwrite model evidence.

The Core UI must let an authorized user review timeline-aligned segments, play context, correct words and speaker boundaries, and map a speaker-local ID to a project Character only after review. Unknown/overlapping speakers remain unknown rather than being assigned to the most likely Character. Story Plan dialogue and generated audio should not be rewritten merely because analysis inferred a transcript.

## Difficult Cases And Limits

Explicitly label uncertain overlapping speech, music over dialogue, short phrases, noise, silence and unknown speakers. A no-speech result is valid. Detect source language rather than assuming Thai; benchmark Thai and code-switched speech separately. Define segment/time bounds, maximum duration, channel layout and format capability before enabling. No false claim that diarization proves identity or consent.

## Acceptance

- Fixtures include two and three speakers, interruptions, overlap, rain/music/noise, Thai/English switching, short dialogue and silence.
- Timeline ordering, word timestamps, speaker IDs and edit history survive reload and actor switching; private transcripts do not leak to another actor.
- Model-only uncertainty is visible and does not auto-map a speaker to a Look Sheet or voice asset.
- Quantitative WER/DER and human review thresholds are recorded in [007](007-model-registry-quality-and-licensing.md) before public rollout.

See [audio-analysis implementation plan](implementation-plan/005-audio-analysis.md).
