# Voice Studio configuration

`models.v1.json` declares speech models, adapters and their native token or duration limits.
`voices.v1.json` contains the curated prebuilt voices; modelIds must reference the model catalog.
`policy.v1.json` contains editor/storage-count bounds and the inline tag allowlist.

The Generation-owned `SpeechCatalog.js` validates these files and projects safe values.
Gemini uses its existing provider credentials. Seed Audio uses the server environment variable
`BYTEPLUS_SEED_SPEECH_API_KEY`. Both use ProviderAvailabilityPolicyService and expose availability in the catalog.
Changing a JSON file affects subsequent catalog reads/new requests; existing accepted requests
retain their model/catalog/compiler/pricing snapshots. No file watcher is installed.

To add a model using the same REST protocol, add its entry, compatible voices and Credits
rate evidence. A new protocol requires a registered adapter in code. Never place keys here.
To disable synthesis, disable the model or use existing provider/model/workflow controls.
Existing audio files are unaffected. Editor limits can be adjusted in policy without UI edits.

Pricing is owned by `../credit-pricing-policy.json` under `speechGeneration`, not this catalog.
Gemini reserves the maximum configured input/output token cost. Seed Audio reserves up to the provider's
120-second output cap and captures the reported `original_duration` at the frozen USD/second rate.
Both use existing text-service markup/FX. Credits releases the unused reservation.
Unknown provider outcomes or missing usage require reconciliation; no automatic paid retry.

Custom Voice Design uses `models[].capabilities.voiceDesign/customVoiceSynthesis`.
`maxDesignLength`, `maxCustomVoices` (per actor including candidates),
`maxDesignCandidates` and `maxProjectVoices` live in policy.v1.json. The project cap is
local headroom under Google's 200 stored voices; external project voices can still cause
a provider quota rejection. `eventGroups`/`eventToolbarTags` control editor categories and
quick buttons, and may only reference the existing inlineTags allowlist.

`speechGeneration.voiceDesign` in the Credit policy records the model-rate mapping and
evidence. Model pricing links plus CreateVoice usage support that inference; a separate
creation tariff has not been confirmed. Design settlement uses explicitly reported
text-input/audio-output counts with frozen rates and total caps. A live response showed
input totals exceeding the text breakdown and separate thought metadata. Unclassified
input and thoughts are retained as unpriced evidence, not charged at an invented rate.
`usageEvidence.costCoverage=priced_modality_subtotal` means `providerCostUsd` is only the
priced subtotal; invoice comparison remains outstanding. Cached/tool usage and unknown
modalities still require reconciliation. Design is not assumed to be free.
Delivered jobs retry settlement through Check status without requesting another voice;
settlement errors remain visible with stable codes and clear on successful capture.
The existing pricing service caches its policy; changing pricing requires service reload,
unlike the speech catalog which is read for subsequent requests.

Official evidence checked 2026-11-15:
- https://aistudio.google.com/docs/speech-generation
- https://aistudio.google.com/docs/models/gemini-3.8-flash-tts
- https://aistudio.google.com/docs/pricing#gemini-3.8-flash-tts

Focused isolated check: `node --test test/voiceSpeech.test.js`. No provider request is made.
