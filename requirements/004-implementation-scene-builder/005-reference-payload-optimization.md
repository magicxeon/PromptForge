# Scene-005 Reference Payload Optimization

**Status:** Proposed - Awaiting Review  
**Feature type:** Reference transport optimization and payload safety  
**Depends on:** Scene-003 Scene Template Data Contract, Scene-004 Replaceable Variables and Slot Mapping  
**Created:** 2026-07-19

## 1. Business Requirement

Scene Builder and Template Mode should support reference-heavy workflows without failing because of oversized JSON payloads.

Users will commonly generate from templates that use character references, face references, outfit references, style references, or future product references. If each reference image is sent as base64 inside `/api/generate`, request size grows quickly and can fail before the generation provider receives the job.

The product should move toward lightweight reference transport:

- Use existing History image URLs or job IDs instead of base64 when possible.
- Keep `sceneTemplateSnapshot` free from embedded image data.
- Support upload-first reference registration before generation.
- Keep MVP upload behavior working while preparing a cleaner production path.

## 2. Current Problem

Current reference images may be sent as data URLs:

```text
characterReferenceImageA: data:image/png;base64,...
faceReferenceImageA: data:image/png;base64,...
outfitReferenceImageFront: data:image/png;base64,...
styleReferenceImageA: data:image/png;base64,...
```

This causes:

- Large `/api/generate` request bodies.
- `PayloadTooLargeError` when Express JSON body limits are exceeded.
- Duplicate image data across repeated generation attempts.
- More memory pressure on browser and server.
- Poor scalability for Community `Use Template`.

## 3. Payload Strategy

### 3.1 MVP Strategy

For near-term MVP:

- Allow larger JSON payloads only as a fallback.
- Prefer `/outputs/...` URLs for images selected from History.
- Prefer `jobId` where history entry references an existing generated image.
- Do not put base64 image data inside `sceneTemplateSnapshot`.

### 3.2 Recommended Production Strategy

Introduce a reference registration flow:

```text
POST /api/references
-> stores uploaded reference
-> returns referenceId, imageUrl, thumbnailUrl, metadata

POST /api/generate
-> receives referenceId/imageUrl/jobId
-> server resolves actual image bytes only when needed
```

## 4. Reference Value Contract

Reference slots should support both legacy string values and optimized object values.

### 4.1 Legacy Compatibility

```text
referenceValue: "data:image/png;base64,..."
referenceValue: "/outputs/job_123.png"
```

### 4.2 Optimized Reference Object

```text
ReferenceValue
- source: upload | history | generated | external_later
- referenceId
- jobId
- imageUrl
- thumbnailUrl
- mimeType
- byteSize
- width
- height
- createdAt
- sourceMode
```

Rules:

- `imageUrl` or `referenceId` should be preferred over base64.
- `jobId` should be preserved for audit/history if available.
- `sourceMode` can help suggest compatible slots, such as `headshot`, `character-sheet`, or `normal`.
- `external_later` is reserved for future community/public assets.

## 5. Scene Template Snapshot Rule

`sceneTemplateSnapshot` must not store raw image bytes.

Allowed:

```text
referenceSlotMapping
replaceableVariables
reference policies
source metadata
jobId or referenceId if explicitly allowed
```

Not allowed:

```text
data:image/...base64
large embedded image strings
binary image payloads
```

## 6. Software Development Specification

### 6.1 Client Files

```text
client/core/generationService.js
client/core/referenceManager.js
client/core/lightboxService.js
client/scene-builder/sceneVariableResolver.js
client/scene-builder/sceneVariableControls.js
client/scene-builder/sceneHistorySlotPicker.js
client/scene-builder/sceneTemplateSerializer.js
```

### 6.2 Server Files

```text
server/server.js
server/generationRequestService.js
server/queueManager.js
server/referenceUtils.js
server/sceneTemplates/SceneTemplateValidator.js
server/references/referenceRepository.js
server/references/referenceRoutes.js
```

`server/references/*` is optional for the first pass and should be added when reference registration is implemented.

### 6.3 Required Functions

```text
normalizeReferenceValue(value) -> NormalizedReferenceValue
isBase64Reference(value) -> boolean
isHistoryReference(value) -> boolean
getReferenceTransportValue(value) -> string | ReferenceValue
stripEmbeddedReferenceDataFromSnapshot(snapshot) -> SceneTemplateSnapshot
resolveReferenceForProvider(value) -> { dataUrl | filePath | imageUrl, metadata }
```

### 6.4 Server Endpoint Plan

Future endpoint:

```text
POST /api/references
Content-Type: multipart/form-data
Input:
- file
- referenceType
- username
- sourceMode

Output:
- referenceId
- imageUrl
- thumbnailUrl
- mimeType
- byteSize
- width
- height
```

Generate endpoint should accept:

```text
faceReference: ReferenceValue
characterReference: ReferenceValue
outfitReferenceFront: ReferenceValue
outfitReferenceBack: ReferenceValue
styleReference: ReferenceValue
```

Legacy fields may remain until migration is complete.

## 7. Impact

### 7.1 UX Impact

- Users can reuse History images without re-uploading.
- Template generation becomes faster and less error-prone.
- Fewer failures from oversized payloads.

### 7.2 Technical Impact

- Requires normalization of legacy string references and future object references.
- Requires server-side reference resolution before provider calls.
- Reduces network and memory overhead.
- Improves readiness for Community template sharing.

### 7.3 Security and Privacy Impact

- Reference ownership must be checked before resolving a history/job/reference ID.
- Public community templates must not expose private reference image URLs unless explicitly shared.
- Signed URLs or protected reference endpoints may be needed later.

## 8. References

Related requirements:

```text
requirements/004-implementation-scene-builder/003-scene-template-data-contract.md
requirements/004-implementation-scene-builder/004-replaceable-variables-and-slot-mapping.md
requirements/004-implementation-scene-builder/006-history-image-slot-picker-for-template-mode.md
requirements/004-implementation-scene-builder/007-reference-slot-ownership-and-privacy.md
requirements/005-implementation-community-plan
```

Related code areas:

```text
client/core/generationService.js
client/core/referenceManager.js
client/core/lightboxService.js
client/scene-builder/sceneReplacementChecklist.js
server/server.js
server/generationRequestService.js
server/queueManager.js
server/referenceUtils.js
```

Known temporary mitigation:

```text
server/server.js
express.json({ limit: process.env.JSON_BODY_LIMIT || '20mb' })
```

This is a compatibility fallback, not the final optimization strategy.

## 9. Testing

### 9.1 Manual UI Tests

```text
TC-005-001
Given a template requires character_reference
When user fills the slot with a History image
Then /api/generate payload uses imageUrl/jobId instead of base64
```

```text
TC-005-002
Given user uploads a new local image directly
When user generates
Then legacy base64 fallback still works within configured JSON limit
```

```text
TC-005-003
Given sceneTemplateSnapshot is created
When payload is inspected
Then snapshot contains no data:image base64 strings
```

```text
TC-005-004
Given a history image belongs to another user
When user tries to resolve it as a reference
Then server rejects the reference or hides it from the picker
```

### 9.2 Node Test Coverage

Recommended tests:

```text
test/referenceValueNormalization.test.js
test/sceneTemplateSnapshot.test.js
test/sceneHistorySlotPicker.test.js
```

Test targets:

- base64 detection
- history URL detection
- reference object normalization
- snapshot stripping of embedded image data
- provider reference resolution compatibility

### 9.3 Payload Budget Checks

Recommended budget targets:

```text
Guided scene without references: < 100 KB
Template with history reference URLs: < 250 KB
Template with one legacy base64 upload: allowed fallback, warn if > 5 MB
Template with multiple legacy base64 uploads: warn or require reference upload service
```

## 10. Acceptance Criteria

- History-based template slot assignment does not send base64 in `/api/generate`.
- `sceneTemplateSnapshot` never embeds base64 image data.
- Legacy local upload still works during MVP.
- Server can resolve lightweight references before provider calls.
- Oversized payload errors are reduced and become exceptional rather than common.
