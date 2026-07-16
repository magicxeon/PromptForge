# Upgrade Step 9: Multi-Slot Loopback Referencing & Provenance Tracking
**ID**: 009-loopback-referencing
**Target**: `ModelPromptForge`

This document details the requirements for visual multi-slot loopback referencing, allowing users to load up to 2 generated or history images as active inputs (Face or Style), trace parent generation lineage, and record execution duration in history metadata.

---

## 1. Multi-Slot Reference Concept
- **Goal**: Allow users to combine up to **2 face reference images** (for face structure interpolation) and **2 style reference images** (for style/outfit details combination).
- **Benefit**: Using multiple face references allows the Google Gemini interactions API to stabilize face consistency across multiple angles and lighting settings.
- **Reference Slots**:
  - **Face Match**:
    - Slot A: `state.faceReferenceImageA` (Base64 or local `/outputs/` URL path)
    - Slot B: `state.faceReferenceImageB` (Base64 or local `/outputs/` URL path)
  - **Style Match**:
    - Slot A: `state.styleReferenceImageA` (Base64 or local `/outputs/` URL path)
    - Slot B: `state.styleReferenceImageB` (Base64 or local `/outputs/` URL path)

---

## 2. UI Elements & Reference Managers

### 2.1 Action Controls in Viewport & Lightbox
- Below the viewport `#generated-image` card and inside the `#lightbox-modal` metadata column, provide two action buttons:
  - **"👤 Use as Face Reference"** (`#btn-use-face-ref` / `.btn-use-face-ref`)
  - **"🖼️ Use as Style Reference"** (`#btn-use-style-ref` / `.btn-use-style-ref`)
- **Slot Allocation Logic**:
  - When clicking either button:
    - If Slot A is empty: load the active image path/ID into Slot A.
    - Else if Slot B is empty: load it into Slot B.
    - If both slots are full: overwrite Slot B and show a brief indicator.

### 2.2 Visual Reference Dock
- **Face Match Dock**: Inside the `#face-match-upload-container` (which slides open when Face Match is checked):
  - Render two visual preview boxes: **Face Slot A** and **Face Slot B**.
  - If a slot is loaded, display its thumbnail with a clear button (`&times;`) to let the user clear the slot individually.
- **Style Match Dock**: Add a dynamic preview container next to or below the `#sheet-use-reference-img` checkbox:
  - Render two visual preview boxes: **Style Slot A** and **Style Slot B**, showing thumbnails with individual clear buttons (`&times;`).

---

## 3. Provenance (Lineage) Tracking

### 3.1 Lineage Metadata
- When enqueuing and saving a job, the system must record the parent lineage in the metadata:
  - Save the IDs of the active reference parent jobs in `referencedFaceJobIds` (array of up to 2 IDs) and `referencedStyleJobIds` (array of up to 2 IDs).
  - Also record the **Generation Duration** (execution time in seconds, e.g., `5.4s`) as `generationDuration` in the metadata.
- Save this metadata into the local `history.json` database.

### 3.2 Clickable Parent Links in Lightbox
- When viewing a history item inside `#lightbox-modal`:
  - Read `referencedFaceJobIds` and `referencedStyleJobIds` from the item metadata.
  - If parent lineages are found, render miniature clickable thumbnails of these parent images labeled:
    - `"Face Reference: Job #12345"`
    - `"Style Reference: Job #67890"`
  - **Action**: Clicking these miniature parent thumbnails will instantly switch the active Lightbox view to display that parent image's details, enabling the user to explore the character's generation lineage recursively!
- Display the recorded **Generation Duration** prominently in the metadata column: e.g. `Duration: 4.8s`.

---

## 4. Backend Strategy & Image Path Resolution
- The enqueuing payload to `/api/generate` will include:
  - `faceReferenceImageA`, `faceReferenceImageB`
  - `styleReferenceImageA`, `styleReferenceImageB`
  - `faceReferenceJobIds`, `styleReferenceJobIds`
  - `generationDuration` (computed in client upon job completion and saved via update/completed endpoint or saved directly by backend duration logging).
- **Backend File Loading & Provider Integration**:
  - If any reference path starts with `/outputs/`, the backend Express router (`server/queueManager.js`) must resolve the local static file on disk, read it, and encode it back to base64 before proceeding with provider-specific logic.
  - **Google Gemini**: Appends all active face/style base64 objects into the Interactions `input` array as native image parts.
  - **OpenAI**: Uploads resolved base64 images to the OpenAI Files API (`POST /v1/files`) with `purpose: "vision"` using native Node 18 `FormData`, and appends the resulting `file-xxxxxxxxxxxx` ID values to the request body under `reference_images` / `input_images` parameters.

---

## 5. DALL-E 2 & DALL-E 3 Limitations (Lockout Rules)
- **Problem**: OpenAI's DALL-E 2 and DALL-E 3 APIs do not support standard multi-slot base64 reference images or face consistency parameters through their generation endpoint.
- **UI Lockout Specification**:
  - When the user selects `dall-e-3` or `dall-e-2` as the active submodel under OpenAI:
    - Automatically uncheck and disable `Face Match`, `Style Match`, and the Character Sheet reference checkboxes.
    - Set the checkboxes container to `opacity: 0.35` and `pointer-events: none` to indicate visual disabled states.
    - Clear all active reference states (`state.faceReferenceImageA`/`B` and `state.styleReferenceImageA`/`B` = `null`), clear the lineage arrays, and hide the upload previews dock.
    - Hide the loopback buttons (`"Use as Face Reference"` and `"Use as Style Reference"`) under the Viewport image card and inside the Lightbox modal.
  - When switching back to compatible models (`gpt-image` series or Gemini models), restore inputs to active states.

---

## 6. OpenAI Image Edit Safety Rejection Handling

### 6.1 Observed Stream Sequence
- An OpenAI image edit can emit one or more `image_edit.partial_image` events before the safety decision is final.
- A rejected request can then emit a terminal `error` event such as:
  - `error.type`: `image_generation_user_error`
  - `error.code`: `moderation_blocked`
  - `error.message`: human-readable rejection details, request ID, and safety violations such as `safety_violations=[sexual]`
- A partial image received before a terminal error is only a preview. It must not be treated as a successfully generated final image.

### 6.2 Provider Stream State and Event Support
- Update `server/providers/OpenAIProvider.js` so the stream consumer recognizes both generation and edit event families:
  - `image_generation.partial_image`
  - `image_edit.partial_image`
  - `image_generation.completed`, when provided
  - `image_edit.completed`, when provided
  - terminal `error`, `image_generation.failed`, and `image_edit.failed`
- Track stream state explicitly as `pending`, `completed`, or `failed`.
- Store the latest partial image only as a temporary candidate while the stream remains `pending`.
- If a terminal error arrives after any partial image, change the state to `failed`, discard the candidate final result, and throw a structured provider error.
- Only return the latest partial image as the final result when the stream closes normally without any terminal failure and the API's stream contract identifies the last partial event as the final image.
- Preserve the OpenAI `x-request-id`; if it is absent, extract the request ID from the API error message when possible.

### 6.3 Structured Error Contract
- Normalize OpenAI stream failures into an error object with these fields where available:
  - `provider`: `openai`
  - `type`: for example `image_generation_user_error`
  - `code`: for example `moderation_blocked`
  - `message`: safe human-readable API message
  - `requestId`: for example `req_...`
  - `safetyViolations`: parsed array such as `["sexual"]`
  - `retryable`: `false` for moderation rejection; `true` only for transient failures such as rate limits or upstream availability
- Do not include Base64 partial-image content in logs, stored job errors, or client-facing error events.
- Keep the original error as `cause` for server-side diagnostics without exposing secrets or full response payloads.

### 6.4 Queue and SSE Terminal Behavior
- Update `server/queueManager.js` so a failed provider stream produces exactly one terminal application-level error event.
- Do not forward the raw OpenAI terminal `error` event and then emit a second wrapped `error` event for the same failure.
- Forward non-terminal partial-image events for progress display, but mark them as previews and never persist them as completed outputs.
- On failure:
  - set `job.status` to `failed`
  - save only normalized error metadata in `job.error`
  - do not write an output image file
  - do not add a successful history entry
  - do not emit `image_generation.completed`
  - close listeners only after the single normalized error event has been sent
- Define the credit policy explicitly during implementation review. Recommended behavior: refund the deducted credit for `moderation_blocked` because no usable output is delivered, while preventing duplicate refunds if the same error is handled more than once.

### 6.5 Client Error Presentation
- Update the client SSE handler to distinguish `moderation_blocked` from network and retryable provider errors.
- For moderation rejection, clear any temporary partial preview associated with the failed job and show a concise message explaining that the request did not pass the safety system.
- Offer prompt adjustment guidance without displaying internal Base64 data or raw stack traces.
- Display the request ID in an expandable technical-details area so it can be supplied to OpenAI support.
- Do not automatically retry moderation failures with the same prompt and reference images.

### 6.6 Verification Scenarios
- Add provider-level stream tests for:
  - `image_edit.partial_image` followed by normal stream completion
  - `image_edit.partial_image` followed by `moderation_blocked`
  - terminal error before any partial image
  - multiple partial images followed by a terminal error
  - malformed error payload with an `x-request-id` header
- Add queue-level tests confirming that moderation rejection emits one client error, writes no output file, creates no successful history item, and applies the reviewed credit policy once.
- Add a client-level test confirming that a partial preview is removed when the same job later fails moderation.

### 6.7 Implemented Structure Notes
- Implemented the provider, queue, and client behavior described above.
- The actual OpenAI edit stream uses `image_edit.partial_image`, while the application completion event remains `image_generation.completed` after the queue has persisted the final output.
- The existing client uses an embedded `#viewport-error` banner rather than a toast system. Safety messaging and expandable technical details were added to that component to preserve the current dark glassmorphism and neon-red theme.
- Credit deduction is owned by `server/queueManager.js`; moderation refunds are therefore performed in the same module and guarded by the per-job `creditRefunded` flag.
- Provider terminal errors and completion events are suppressed in the queue callback. Errors are emitted once from the queue catch path, while completion is emitted once after output and history persistence succeed.
