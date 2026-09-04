# Current State And Compatibility Matrix

**Requirement ID:** `016-PVP-001`  
**Status:** Requirement complete; Package 001 compatibility foundation implemented  
**Priority:** P0 discovery and contract gate

## 1. Current Runtime Inventory

| Layer | Existing capability | Confirmed limitation | Owner |
|---|---|---|---|
| Storyboard handoff | Approved immutable image source and source fingerprint | Only current approved source may enter Produce | Cinematic / Assets |
| Video packet | Structured motion, performance, environment, continuity and audio packet | One generic rendered prompt; no provider strategy selection | Cinematic |
| Video request | Quote and submit one selected Shot | Product operation and input modality share `operation` | Generation |
| References | One image is resolved for `image_to_video` | Multiple references and last frame are dropped by application normalization | Reference Processing / Generation |
| Seedance adapter | Create task, poll, normalize usage and copy output | No live first-frame qualification is enabled from Produce | Provider / Generation |
| Capability catalog | Duration, ratio, resolution, audio and reference metadata | All video rows remain research/internal and paid routing is false | Generation |
| Credits | Per-Shot estimate, reserve, capture and eligible refund | No aggregate video-set quote and no assembly price contract | Credits |
| Durable media | Clip Asset and poster derivative | No last-frame Asset, technical probe result or final master Asset | Assets |
| Recovery | Durable provider task and UI polling | Recovery helper is not wired as a server-owned background resumer | Generation |
| Timeline | Complete Shot set, trims, transitions and source fingerprints | Metadata only; no media renderer | Cinematic |
| Export | Reconciled qualification manifest | Always returns `cinematic_final_assembly_not_qualified` | Cinematic / Generation |
| Produce UI | Scene rail, Shot board, selected media, prompt, attempts and render dock | Story progression, batch readiness and previous/current/next continuity are weak | Cinematic UI |
| Finish UI | Duration, trim and transition form | No actual preview, quote, render progress, master playback or download | Cinematic UI |

## 2. Operation Compatibility Defect

The current Produce request always uses `image_to_video` because the approved
Storyboard is the first frame. Seedance catalog rows currently declare product
operations such as `cinematic_draft_clip` but not `image_to_video`. Validation
therefore rejects every Seedance Produce request before quote.

The fix is a contract correction, not a catalog exception:

```json
{
  "commercialOperation": "cinematic_draft_clip",
  "inputMode": "image_to_video",
  "referenceStrategy": "approved_storyboard_first_frame"
}
```

Capability validation evaluates both dimensions. Pricing uses the commercial
operation plus provider metrics. Provider mapping uses input mode and resolved
references. Playground may use the same input mode without becoming a
Cinematic operation.

## 3. Seedance Candidate Matrix

The matrix describes implementation candidates, not paid approval.

| Candidate | Useful Produce mode | Duration / output | Audio | Current decision |
|---|---|---|---|---|
| Seedance 1.0 Pro Fast | first-frame I2V | 2-12s; 480p/720p/1080p; 9:16 | silent | First internal vertical slice |
| Seedance 1.0 Pro | first-frame and provider-documented first/last I2V | 2-12s; 480p/720p/1080p; 9:16 | silent | Quality comparison after Fast lifecycle passes |
| Seedance 1.5 Pro | first/last frame, draft candidate | 4-12s; up to 1080p where qualified | optional generated audio | Blocked pending live reference/audio evidence |
| Seedance 2.0 Mini/Fast | first/last and multimodal reference | 4-15s; 480p/720p | generated or silent | Blocked by real-person trust and multimodal mapping |
| Seedance 2.0 | first/last, multimodal, edit/extend | 4-15s; provider-dependent through 4K | generated or silent | Blocked by cost, trust and mode qualification |
| Seedance 2.5 | first/last, multimodal, edit/extend | 4-30s; 480p/720p | generated or silent | Blocked by trust, pricing and live payload evidence |

Official references reviewed for this requirement:

- [BytePlus Video Generation API](https://docs.byteplus.com/en/docs/ModelArk/Video_Generation_API)
- [Seedance 1.0 Pro Fast](https://docs.byteplus.com/en/docs/ModelArk/1901652)
- [Seedance 1.0 Pro](https://docs.byteplus.com/en/docs/ModelArk/1587798)
- [Seedance model releases](https://docs.byteplus.com/en/docs/ModelArk/2172655)
- [Seedance 2.x enhanced/basic generation](https://docs.byteplus.com/en/docs/byteplus_las/video_gen_enhanced)
- [ModelArk pricing](https://docs.byteplus.com/docs/ModelArk/1099320)

Provider documentation and account entitlement must be rechecked on the live
qualification date. A pricing row is not capability evidence.

## 4. Reference Compatibility

### 4.1 Required preflight dimensions

Every quote and submit validates:

- approved source Asset ID, Asset Version ID and source fingerprint;
- MIME type, byte size, dimensions and aspect ratio;
- owner authorization and provider delivery method;
- number and semantic role of references;
- model support for first frame, last frame and additional references;
- real-person/face trust status, provider source and expiry when applicable;
- current Character and wardrobe authority fingerprints;
- provider maximum request-body and reference limits.

### 4.2 Provider trust rule

Seedance 2.x must not receive an arbitrary human-face reference. The source
must have an explicit provider-compatible trust/authorization record or an
approved provider material-library identifier. Missing trust blocks before
Credit reservation with a recovery action; it never silently falls back or
strips the Character reference.

### 4.3 First implementation boundary

The first Seedance 1.0 Pro Fast slice sends exactly one approved Storyboard
first frame. Last frame, Character image, wardrobe image and previous video are
not appended until their distinct mode is qualified. The visible Character and
wardrobe authority remains embedded in the approved first frame and packet.

## 5. Duration And Timeline Compatibility

- Planned Shot duration remains Cinematic authority.
- Catalog-supported render duration is reconciled before quote.
- Any generated excess is represented as proposed trim, not silently discarded.
- A transition overlaps two clips and reduces assembled duration. Finish must
  show resulting duration delta against the Project target.
- A model that cannot cover the Shot action duration is ineligible unless the
  user explicitly returns to Storyboard to split or change the Shot.
- Provider-generated duration metadata is verified with `ffprobe`; provider
  response metadata alone is not final media evidence.

## 6. Audio Compatibility

| Project/Shot requirement | Eligible output |
|---|---|
| Explicitly silent | Silent model or audio-disabled model |
| Ambient sound only | Generated clip audio or approved ambient Asset |
| Exact voice message/dialogue | Approved audio Asset with timing, or a separately qualified exact-speech operation |
| Visible synchronized speech | Model/provider route with qualified speech/lip-sync evidence |

Generated audio must not be treated as exact authored dialogue without evidence.
A silent candidate may be approved visually, but cannot satisfy a final audio
gate for a Shot that requires exact speech.

## 7. Media And Assembly Compatibility

The assembly processor must accept persisted MP4 and MOV inputs while producing
one normalized MP4 master. It must not concatenate container bytes directly.
Before assembly, each source is probed and normalized to the selected output:

- resolution and sample aspect ratio;
- 24 fps or configured final frame rate;
- H.264-compatible video profile and pixel format;
- AAC sample rate/channel layout, adding explicit silence when permitted;
- monotonic timestamps and bounded duration;
- orientation metadata resolved into pixels.

The existing local development machine has FFmpeg, but deployment readiness
requires an explicit startup capability check and version/codec evidence.

## 8. Stable Compatibility Errors

| Code | Meaning | Recovery |
|---|---|---|
| `cinematic_video_input_mode_unsupported` | Model cannot use the selected source mode | Choose an eligible model |
| `cinematic_video_reference_trust_required` | Provider cannot accept this human reference | Prepare compatible source or choose another model |
| `cinematic_video_reference_limit_exceeded` | Reference plan exceeds model limit | Change qualified strategy, never silently drop authority |
| `cinematic_video_duration_unsupported` | Shot timing cannot fit the model | Choose model or edit Shot in Storyboard |
| `cinematic_video_audio_requirement_unmet` | Required sound has no eligible source | Configure audio source/model |
| `cinematic_video_media_invalid` | Output probe failed | Retry affected Shot or Support review |
| `cinematic_final_assembly_unavailable` | Assembly runtime is not available | Keep approved clips and retry later |
| `cinematic_final_sources_stale` | Timeline references stale clips | Regenerate only listed Shots |

## 9. Acceptance

- Compatibility can be decided without a provider call and revalidated before
  dispatch.
- The same capability result drives UI options, quote and submit.
- No Seedance Produce request fails merely because product operation and input
  mode were conflated.
- Unsupported trust, audio, duration and reference combinations fail before
  reservation with stable recovery.
- Existing Gemini/Veo and Playground video behavior remains unchanged.
