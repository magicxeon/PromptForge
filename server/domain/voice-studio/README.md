# Voice Studio

Start at `VoiceStudioApplicationService.js`: it owns scripts, row editing, character
voice presets and Take selection/library commands. `voiceStudioRoutes.js` only
translates HTTP. `VoiceStudioRepository.js` owns versioned actor-scoped metadata.

Synthesis enters `GenerationApplicationService` speech methods. The internal
`SpeechGenerationService` owns quotes, queue admission and terminal operations;
`SpeechRequestCompiler` is pure. `GeminiSpeechProvider` owns Google transport.
`AudioAssetService` owns WAV validation/storage and private output registration.
Credits stays behind `CreditApplicationService`.

`CustomVoiceService.js` is internal to the Voice Studio facade. It owns saved/candidate
voice metadata and character bindings; it never calls Google. Design operations use the
same durable SpeechGenerationService and queue with `operation: voice_design`.
Google identity, credential fingerprint and original creation usage stay in the private
Generation record. Clients receive an actor-owned application voice ID. The customVoices
projection stores name/prompt/language/sample references separately from dialogue Takes;
saving a candidate only sets savedAt.

An ambiguous CreateVoice outcome is never automatically retried. When the provider ID
was persisted before sample storage failed, reading the operation recovers using GET.
Missing/unrecognized usage remains delivered awaiting settlement. Deletion blocks bound
presets/active synthesis and retries by the same remote identity. Existing dialogue audio
survives voice deletion. Concurrent sample recovery cleans up any losing duplicate file.

Remote voices are conservatively bound to the credential fingerprint used to create them.
Changing the API key needs explicit support reconciliation even for the same Google project.
Provider expiry is currently cached at creation; the API can extend expiry after reuse,
so local expiry may require refreshing provider metadata during support recovery.

Edit model and voice IDs in `server/config/voice-studio/*.v1.json`; configuration
never contains credentials. Adding another protocol requires an explicit provider
adapter. Existing preset/Take snapshots are not migrated by changing defaults.

Data files resolve via `server/config/paths.js` so isolated local fixtures use
their own roots. Do not read another capability's files from this domain. Binary
audio belongs to Assets under OUTPUTS_DIR, never metadata JSON or browser storage.

Focused checks: `node --test test/voiceStudio.test.js test/voiceSpeech.test.js`.
See `requirements/023-voice-studio/` for contracts, UI and rollout checks.
