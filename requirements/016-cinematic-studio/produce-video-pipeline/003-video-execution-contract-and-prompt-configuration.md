# Video Execution Contract And Prompt Configuration

**Requirement ID:** `016-PVP-003`  
**Status:** Requirement and Package 001 execution-contract implementation complete  
**Priority:** P0 runtime contract

## 1. Contract Layers

Video execution is represented by four separate layers:

1. **Cinematic authority:** approved Story, Scene, Shot, Character, Look,
   continuity and audio intent.
2. **Provider-independent packet:** start/end state, one temporal action,
   camera, performance, environment, references and prohibitions.
3. **Qualified execution selection:** commercial operation, input mode,
   provider/model and supported output controls.
4. **Provider request:** adapter-owned payload and protocol fields.

No layer may replace or silently weaken an earlier authority.

## 2. Prepared Execution Shape

The canonical prepared request must distinguish product intent from input mode:

```json
{
  "commercialOperation": "cinematic_draft_clip",
  "inputMode": "image_to_video",
  "providerId": "modelark",
  "modelId": "seedance-1-0-pro-fast-251015",
  "projectId": "cineproj_...",
  "sceneId": "cinescene_...",
  "shotId": "cineshot_...",
  "videoPacketVersion": "cinematic-video-packet-v2",
  "videoPacketFingerprint": "...",
  "referencePlanFingerprint": "...",
  "references": [
    {
      "role": "first_frame",
      "assetId": "asset_...",
      "assetVersionId": "asset_...",
      "sourceFingerprint": "..."
    }
  ],
  "output": {
    "aspectRatio": "9:16",
    "resolution": "720p",
    "durationSeconds": 6,
    "audioMode": "none"
  }
}
```

Signed URLs, Base64 and provider asset tokens are resolved after authorization
at dispatch and are not persisted in the Cinematic Project.

## 3. Commercial Operations

Allowed product operations remain:

- `cinematic_motion_preview`;
- `cinematic_draft_clip`;
- `cinematic_final_clip`;
- `cinematic_audio` when separately qualified;
- `cinematic_final_assembly`.

They determine quote policy, lifecycle and media role. They do not describe how
a provider consumes references.

Each provider/model qualification declares whether it may fulfill preview,
draft and/or final clip operations. Promotion is metadata-only only when the
same immutable output already meets the final operation's qualified media and
quality policy; otherwise a new final generation requires a new quote and
explicit consent.

## 4. Input Modes

Allowed input modes are capability-derived:

- `text_to_video`;
- `image_to_video` using one first frame;
- `first_last_frame` using exactly two ordered images;
- `multimodal_reference` using named image/video/audio authorities;
- `video_extend` and `video_edit` only after separate qualification.

The provider catalog exposes supported combinations instead of one flat list of
mixed operation names.

## 5. Reference Strategy

The Cinematic compiler proposes semantic needs. Reference Processing produces
an ordered compatible plan. Generation validates it against the selected model.

Precedence:

1. approved Storyboard first-frame authority;
2. optional authored last-frame target;
3. approved Character/Look authority when the mode supports it;
4. previous approved clip last frame for a qualified continuing action;
5. optional environment/audio reference.

If all authorities cannot fit, the operation blocks or selects a separately
qualified compiled authority Asset. It never removes identity or wardrobe
references silently.

## 6. Prompt Configuration

All stable wording, section order, budgets and prohibitions live in versioned
server configuration. Proposed ownership:

```text
server/config/cinematic/video-packet-policy.v2.json
server/config/cinematic/video-provider-prompt-strategies.json
```

The packet policy owns provider-neutral section intent. The strategy file owns
how a provider family renders the same packet, including:

- maximum prompt budget;
- ordered sections and omitted empty fields;
- first/last/reference token syntax;
- temporal timing format;
- audio cue inclusion policy;
- negative/prohibition placement;
- language handling and fallback;
- strategy ID and version.

Model capability, rate and qualification data remains in Generation-owned
catalog configuration. Prompt configuration must not duplicate pricing,
duration or reference limits.

React, routes and adapters must not contain cinematic prose templates. An
adapter may contain protocol field names but receives an already rendered,
versioned provider prompt.

## 7. Prompt Content Rules

The rendered motion prompt contains only actionable execution information:

- immutable approved start-frame instruction;
- one primary action with start, development and end state;
- planned duration and optional timing cue;
- camera movement and screen direction;
- visible performance cue and gaze;
- motivated light/environment changes;
- prop and Character/wardrobe continuity;
- supported audio intent;
- concise prohibitions.

It must not concatenate the complete Story Plan, repeat fields, mix future Shot
actions or ask the provider to redesign the approved frame.

## 8. Fingerprints And Provenance

Persist and compare:

- Storyboard Asset Version and source fingerprint;
- Shot and Scene versions;
- video packet version/fingerprint;
- prompt strategy ID/version and rendered prompt fingerprint;
- reference-plan version/fingerprint;
- provider catalog and pricing-policy versions;
- selected commercial operation and input mode;
- quote, reservation, task, attempt and output Asset IDs.

Changing any cost-bearing or visual-authority input invalidates the quote.
Changing only a collapsed panel or local selection does not mutate the packet.

## 9. API Compatibility And Migration

- Add new fields while temporarily reading legacy `operation` requests.
- Legacy `image_to_video` maps to input mode only; the workflow context supplies
  its commercial operation.
- Existing Playground requests retain their current behavior through an adapter.
- Existing tasks remain readable with inferred fields and are never rewritten.
- New quote responses expose the normalized selection and fingerprint so the UI
  can prove quote/submit parity.
- Remove compatibility inference only after every current caller and fixture is
  migrated and a deletion checkpoint is recorded.

## 10. Stable Findings

The compiler returns structured findings with severity, code, field path and
recovery stage. Blocking findings include missing first frame, missing action,
action overflow, stale source, unsupported audio and incompatible references.
Warnings include legacy authority and recommended last-frame continuity.

## 11. Acceptance

- The same Shot and strategy produce the same prompt and fingerprint.
- Manual and batch Produce use the same compiler entry point.
- A browser prompt override fails before pricing or dispatch.
- Seedance and Gemini can render different provider prompts from one immutable
  packet without changing Cinematic authority.
- Prompt policy changes are versioned, schema-tested and independently
  rollbackable.
- Existing Playground Video contract tests remain green.
