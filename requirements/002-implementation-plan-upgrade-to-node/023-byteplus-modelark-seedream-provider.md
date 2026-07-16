# 23. BytePlus ModelArk Seedream Provider

**ID:** `023-byteplus-modelark-seedream-provider`  
**Application:** `ModelPromptForge`  
**Status:** Implemented - Pending Runtime Verification  
**Feature type:** New image generation provider integration  
**Depends on:** Requirement 005 - Modular Generation Providers, Requirement 017 - Config-driven Provider Registry, Requirement 018 - Provider Pricing Catalog, Requirement 020 - AI Model Comparison Workspace  
**Created:** 2026-07-15  
**Pricing snapshot:** 2026-07-13 from BytePlus ModelArk pricing documentation  
**Implementation authorization:** Approved and implemented on 2026-07-15

## 1. Objective

Add BytePlus ModelArk Seedream as a first-class image generation provider that can be selected from the same Provider/Model registry used by Studio, History, Queue and AI Comparison.

This must be implemented through the existing provider architecture:

```text
server/config/providers.json
-> ProviderRegistry
-> ProviderFactory
-> ModelArkSeedreamProvider
-> normalized generation result
```

Do not hardcode Seedream options in client dropdowns or generation routes.

### 1.1 Implementation outcome

Implementation now includes:

- `ModelArkSeedreamProvider` adapter.
- Provider registration through `providerAdapters.js`.
- ModelArk provider configuration in `server/config/providers.json`.
- Local dropdown order from the BytePlus pricing snapshot, cheapest to most expensive.
- Secret lookup for `MODEL_ARK_API-KEY` with aliases `MODEL_ARK_API` and `ARK_API_KEY`.
- Optional `MODEL_ARK_BASE_URL` and `MODEL_ARK_API_TIMEOUT_MS`.
- Text-to-image and reference-image payload mapping to `/api/v3/images/generations`.
- `b64_json` parsing and temporary URL download fallback.
- Unit tests for provider registry order, alias lookup and adapter payload/response handling.

Runtime verification against the live BytePlus API has not been performed yet.

## 2. Official Documentation Reviewed

Primary references:

- BytePlus ModelArk Seedream 4.0-5.0 tutorial: `https://docs.byteplus.com/en/docs/ModelArk/1824121`
- BytePlus ModelArk Region availability: `https://docs.byteplus.com/en/docs/ModelArk/2191806`
- BytePlus ModelArk Pricing: `https://docs.byteplus.com/en/docs/ModelArk/1544106`

Important notes from the Seedream tutorial:

- `seedream-5-0-lite`, `seedream-4-5` and `seedream-4-0` support text, single-image and multi-image inputs.
- The tutorial uses the Image Generation API and says other Seedream models can be used by replacing the `model` field.
- New high-precision model: `dola-seedream-5-0-pro`, Model ID `dola-seedream-5-0-pro-260628`.
- `seedream-5-0-lite` is documented as available in `ap-southeast-1` and `eu-west-1`.
- Base URLs:
  - `ap-southeast-1`: `https://ark.ap-southeast.bytepluses.com/api/v3`
  - `eu-west-1`: `https://ark.eu-west.bytepluses.com/api/v3`
- REST endpoint shown in examples: `POST /images/generations`.
- Auth header shown in examples: `Authorization: Bearer $ARK_API_KEY`.
- Supported output controls include `size`, `response_format`, model-specific `output_format` and `watermark`.
- `response_format` supports `url` and `b64_json`.
- `seedream-4-0` and `seedream-4-5` default to JPEG output and do not support the `output_format` request parameter.
- `seedream-5-0-lite` and `dola-seedream-5-0-pro` support the `output_format` request parameter.
- `sequential_image_generation: "auto"` enables batch image output.
- Stream events include `image_generation.partial_succeeded`, `image_generation.partial_failed` and `image_generation.completed`.
- Pricing page lists Seedream image models in a way that supports local dropdown ordering. Runtime must not fetch pricing.

Implementation must verify the latest official docs again immediately before runtime integration because model IDs, pricing and regional availability may change.

## 3. Product Scope

### 3.1 MVP Scope

Include:

- Text-to-image generation.
- Single image reference input.
- Multi-image reference input.
- Non-streaming single-output generation.
- Optional `b64_json` output mode for direct persistence.
- Provider/model selection through `/api/providers`.
- History, credits, queue and AI Comparison compatibility.
- Region/base URL selected from server configuration.

### 3.2 Deferred Scope

Defer unless separately approved:

- Streaming UI support for Seedream.
- Batch output via `sequential_image_generation`.
- Interactive coordinate/marker editing.
- Prompt optimization mode UI.
- Live pricing lookup.
- Region failover.
- Public support for user-entered arbitrary ModelArk endpoints.

## 4. Provider Configuration

Add a new provider entry to `server/config/providers.json`.

Recommended provider ID:

```text
modelark
```

Recommended adapter ID:

```text
modelark-seedream
```

Recommended environment variables:

```dotenv
MODEL_ARK_API-KEY=your_modelark_api_key_here
MODEL_ARK_API=optional_alias_for_deployments_without_hyphenated_env_names
ARK_API_KEY=optional_alias_matching_byteplus_examples
MODEL_ARK_REGION=ap-southeast-1
MODEL_ARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```

`MODEL_ARK_API-KEY` should be supported because the current local environment already uses that naming. The adapter should also support `MODEL_ARK_API` and `ARK_API_KEY` as aliases, but only one configured secret should be required.

### 4.1 Local price order

Do not update prices in realtime. Use this snapshot only to set `displayOrder` inside `providers.json`.

| Local order | Model ID | Reference price | `displayOrder` |
|---:|---|---:|---:|
| 1 | `seedream-4-0-250828` | $0.03 / image | 10 |
| 2 | `seedream-5-0-lite-260128` | $0.035 / image | 20 |
| 3 | `seedream-4-5-251128` | $0.04 / image | 30 |
| 4 | `dola-seedream-5-0-pro-260628` | <= 2.36M px: $0.045 / image; > 2.36M px: $0.09 / image | 40 |

Set the default ModelArk model to the cheapest enabled model unless a product decision explicitly chooses quality over cost.

Example config:

```json
{
  "id": "modelark",
  "adapter": "modelark-seedream",
  "enabled": true,
  "displayName": {
    "en": "BytePlus ModelArk Seedream",
    "th": "BytePlus ModelArk Seedream"
  },
  "apiKeyEnv": "MODEL_ARK_API-KEY",
  "apiKeyEnvAliases": ["MODEL_ARK_API", "ARK_API_KEY"],
  "baseUrlEnv": "MODEL_ARK_BASE_URL",
  "displayOrder": 40,
  "defaultModel": "seedream-4-0-250828",
  "models": [
    {
      "id": "seedream-4-0-250828",
      "enabled": true,
      "displayName": {
        "en": "Seedream 4.0",
        "th": "Seedream 4.0"
      },
      "displayOrder": 10,
      "capabilities": {
        "imageGeneration": true,
        "imageEdit": true,
        "imageReferences": true,
        "maxReferenceImages": 14,
        "streaming": false,
        "batchOutput": false,
        "responseFormats": ["b64_json", "url"],
        "supportsOutputFormatParameter": false,
        "outputFormats": ["jpeg"],
        "resolutions": ["1K", "2K", "4K"],
        "aspectRatios": ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "auto"]
      },
      "defaults": {
        "resolution": "2K",
        "responseFormat": "b64_json",
        "outputFormat": "jpeg",
        "watermark": false
      },
      "creditPolicy": "modelark.seedream-4-0.2k"
    },
    {
      "id": "seedream-5-0-lite-260128",
      "enabled": true,
      "displayName": {
        "en": "Seedream 5.0 Lite",
        "th": "Seedream 5.0 Lite"
      },
      "displayOrder": 20,
      "capabilities": {
        "imageGeneration": true,
        "imageEdit": true,
        "imageReferences": true,
        "maxReferenceImages": 14,
        "streaming": false,
        "batchOutput": false,
        "responseFormats": ["b64_json", "url"],
        "supportsOutputFormatParameter": true,
        "outputFormats": ["png", "jpeg"],
        "resolutions": ["2K", "3K", "4K"],
        "aspectRatios": ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "auto"]
      },
      "defaults": {
        "resolution": "2K",
        "responseFormat": "b64_json",
        "outputFormat": "png",
        "watermark": false
      },
      "creditPolicy": "modelark.seedream-5-0-lite.2k"
    },
    {
      "id": "seedream-4-5-251128",
      "enabled": true,
      "displayName": {
        "en": "Seedream 4.5",
        "th": "Seedream 4.5"
      },
      "displayOrder": 30,
      "capabilities": {
        "imageGeneration": true,
        "imageEdit": true,
        "imageReferences": true,
        "maxReferenceImages": 14,
        "streaming": false,
        "batchOutput": false,
        "responseFormats": ["b64_json", "url"],
        "supportsOutputFormatParameter": false,
        "outputFormats": ["jpeg"],
        "resolutions": ["2K", "4K"],
        "aspectRatios": ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "auto"]
      },
      "defaults": {
        "resolution": "2K",
        "responseFormat": "b64_json",
        "outputFormat": "jpeg",
        "watermark": false
      },
      "creditPolicy": "modelark.seedream-4-5.2k"
    },
    {
      "id": "dola-seedream-5-0-pro-260628",
      "enabled": true,
      "displayName": {
        "en": "Seedream 5.0 Pro",
        "th": "Seedream 5.0 Pro"
      },
      "displayOrder": 40,
      "capabilities": {
        "imageGeneration": true,
        "imageEdit": true,
        "imageReferences": true,
        "maxReferenceImages": 10,
        "streaming": false,
        "batchOutput": false,
        "responseFormats": ["b64_json", "url"],
        "supportsOutputFormatParameter": true,
        "outputFormats": ["png", "jpeg"],
        "resolutions": ["1K", "2K"],
        "aspectRatios": ["1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "auto"]
      },
      "defaults": {
        "resolution": "2K",
        "responseFormat": "b64_json",
        "outputFormat": "png",
        "watermark": false
      },
      "creditPolicy": "modelark.dola-seedream-5-0-pro.2k"
    },
  ]
}
```

The enabled Seedream list must stay local/config-driven. Do not scrape or refresh this order during runtime.

## 5. Adapter Registration

Register the adapter in the code-owned provider map:

```javascript
const PROVIDER_ADAPTERS = {
  openai: OpenAIProvider,
  gemini: GeminiProvider,
  xai: GrokImagineProvider,
  "modelark-seedream": ModelArkSeedreamProvider
};
```

Configuration may reference only registered adapter IDs. Do not allow configuration to define arbitrary import paths, endpoints or classes.

## 6. Request Mapping

### 6.1 Endpoint

The adapter calls:

```text
POST {baseUrl}/images/generations
```

For `ap-southeast-1`:

```text
POST https://ark.ap-southeast.bytepluses.com/api/v3/images/generations
```

Headers:

```http
Content-Type: application/json
Authorization: Bearer <MODEL_ARK_API>
```

### 6.2 Text-to-image payload

Normalized application input:

```javascript
{
  prompt,
  model,
  resolution,
  aspectRatio,
  outputFormat,
  responseFormat
}
```

Provider payload:

```json
{
  "model": "seedream-5-0-260128",
  "prompt": "<compiled_prompt>",
  "size": "2K",
  "output_format": "png",
  "response_format": "b64_json",
  "watermark": false,
  "stream": false
}
```

For `seedream-4-0` and `seedream-4-5`, omit `output_format` entirely and rely on the provider default JPEG output.

### 6.3 Reference image payload

If one reference image exists:

```json
{
  "image": "<authorized_image_url_or_data>"
}
```

If multiple reference images exist:

```json
{
  "image": [
    "<authorized_image_url_or_data_1>",
    "<authorized_image_url_or_data_2>"
  ]
}
```

The adapter must normalize current workflow reference images into a ModelArk-supported `image` value without leaking private local paths or unsigned internal asset URLs.

## 7. Aspect Ratio and Size Policy

Seedream supports explicit dimensions and resolution labels, but the first integration should use resolution labels to avoid overfitting to provider-specific dimension rules.

Initial mapping:

```text
1:1  -> prompt includes square composition; size uses model default resolution
16:9 -> prompt includes wide landscape composition; size uses model default resolution
9:16 -> prompt includes vertical portrait composition; size uses model default resolution
6:8  -> prompt includes 3:4 portrait composition; size uses model default resolution
4:5  -> prompt includes 4:5 portrait/product composition; size uses model default resolution
auto -> no aspect-ratio prompt injection beyond existing compiled prompt
```

Do not send explicit `widthxheight` in MVP unless the current official constraints are verified and encoded per model.

## 8. Response Parsing

The adapter must return the normalized provider result contract:

```javascript
{
  base64,
  imageUrl,
  mimeType,
  usage,
  providerMetadata
}
```

Expected ModelArk response handling:

- If `response_format` is `b64_json`, read `data[0].b64_json`.
- If `response_format` is `url`, read `data[0].url`, download and persist the image immediately because BytePlus documents generated image URL retention as temporary.
- Preserve `data[0].size` when present.
- Preserve `usage` when present.
- Map provider errors to the standard queue error contract.

MVP should prefer `b64_json` to avoid dependency on temporary external URLs.

## 9. Streaming and Batch Boundary

The official tutorial shows streaming examples with:

```text
image_generation.partial_succeeded
image_generation.partial_failed
image_generation.completed
```

MVP requirement:

- Set `stream: false`.
- Do not expose Seedream streaming in the UI.
- Do not enable `sequential_image_generation` by default.

Future phase:

- Map `partial_succeeded` to SSE progress events.
- Map `completed` to final queue completion and usage settlement.
- Add batch output persistence for multiple images returned in `data`.
- Add `sequential_image_generation_options.max_images` with explicit quote/credit policy.

## 10. Security Requirements

- API key remains server-side only.
- Public `/api/providers` catalog must not expose API key, base URL env variable name if considered sensitive, raw account region or internal endpoint overrides.
- Reject any client-supplied base URL.
- Reject any client-supplied model that is not enabled in `ProviderRegistry`.
- Validate reference image count against selected model capability.
- Validate reference image type/size using existing reference workflow limits before sending to ModelArk.
- Never log full prompt plus raw image payload together in normal logs.
- Persist only normalized response metadata required for History and support.

## 11. Credit and Pricing Policy

Requirement 018 currently uses local ordering and does not implement live provider pricing. Seedream should follow that policy.

MVP:

- Add placeholder `creditPolicy` IDs for Seedream models.
- Use the existing per-generation credit deduction model unless a pricing update is approved.
- Do not fetch pricing from BytePlus during application startup.
- Do not display a guaranteed USD price in UI until pricing is verified and versioned.

Before public release:

- Verify BytePlus pricing from official pricing documentation.
- Record pricing snapshot date.
- Update local display order only after price/value review.

## 12. UI and Comparison Requirements

- Provider dropdown shows `BytePlus ModelArk Seedream` from `/api/providers`.
- Model dropdown shows enabled Seedream models sorted by `displayOrder`.
- Capabilities drive visibility for reference image controls.
- AI Comparison can select Seedream models as slots using the same provider/model IDs.
- History metadata stores provider `modelark`, model ID, display name, resolution, output format and response source.
- If `MODEL_ARK_API` is missing, provider is hidden or marked unavailable according to existing registry policy without breaking OpenAI/Gemini/xAI.

## 13. Testing Plan

### 13.1 Unit tests

- Provider registry accepts `modelark` configuration.
- Missing API key disables/unpublishes provider according to environment policy.
- Adapter builds correct text-to-image payload.
- Adapter builds correct single-reference and multi-reference payload.
- Adapter rejects too many references.
- Adapter parses `b64_json` response.
- Adapter parses `url` response and hands off to persistence/download path.
- Adapter normalizes provider error responses.

### 13.2 Integration tests

- `/api/providers` includes ModelArk when enabled and configured.
- `/api/generate` accepts ModelArk provider/model IDs only from registry.
- Queue/history record contains normalized ModelArk metadata.
- AI Comparison can run a ModelArk slot alongside OpenAI/Gemini/xAI.

### 13.3 Manual runtime verification

1. Set `MODEL_ARK_API` and `MODEL_ARK_BASE_URL`.
2. Start the Node server.
3. Open Studio and select BytePlus ModelArk Seedream.
4. Generate a text-only image using `seedream-5-0-260128`.
5. Generate with one reference image.
6. Generate with multiple reference images if reference workflow supports it.
7. Verify image is persisted locally and appears in History.
8. Verify missing/invalid API key displays a normal provider unavailable state.

## 14. Acceptance Criteria

- ModelArk Seedream is added through provider registry and adapter registration only.
- Client provider/model selectors require no hardcoded Seedream list.
- Text-to-image generation works through `/api/generate`.
- Reference image generation maps to ModelArk `image` field safely.
- `b64_json` and `url` responses are normalized into the existing result contract.
- Missing ModelArk API key does not break other providers.
- Unsupported model IDs and reference counts are rejected server-side.
- History and AI Comparison can consume Seedream outputs without provider-specific branching.
