# Upgrade Step 6: UI/UX Refinement, Concurrency Queue & Image Lightbox
**ID**: 006-ui-ux-refinement-and-queue
**Target**: `ModelPromptForge`

This document specifies the UX workflow changes, the background generation queue architecture, the preview lightbox modal, and the history persistence mechanism.

---

## 1. Step-by-Step UI Layout Flow

The layout will be restructured into a top-to-bottom logical pipeline reflecting the natural creative process:

1. **Creative Inputs (Top/First Section)**: Character selectors, clothing, smile attributes, quick presets.
2. **Technical Output Configuration (Middle Section)**: Provider engine (OpenAI/Gemini), Submodel version, Aspect Ratio selection.
3. **Trigger Action (Bottom Section)**: Highlighted, glow-styled "Generate Image" button.

---

## 2. Collapsible Panels & State Transitions

The UI viewport will be split into two primary dynamic sections:
- **Visual Dashboard (Top Panel)**: Displays the active render screen and the generation history grid.
- **Aesthetic Configurator (Bottom Panel)**: Displays the attribute inputs and technical selectors.

### 2.1 Transition Logic
- **On Click Generate**:
  - The Configurator Panel collapses automatically (slides down/hides).
  - The Visual Dashboard expands to occupy maximum screen space, drawing complete focus to the active rendering viewport.
- **On Click "Tweak Attributes" (Floating Button)**:
  - The Configurator Panel re-expands to full screen.
  - The Visual Dashboard collapses back to a compact status bar (showing progress/active queue counters).

---

## 3. Concurrency Queue (Backend Background Processing)

To prevent locking the UI during long generations and allow queueing of multiple jobs, we will implement a background job manager.

### 3.1 Backend Job Queue Manager (`server/queueManager.js`)
- **Queue limit**: Configured in `.env` via `MAX_CONCURRENT_GENERATIONS` (default: `2`).
- **Endpoint changes**: `/api/generate` will push the request to the queue and instantly return a `jobId` with status `queued` or `processing`.
- **Status API**: Client polls `/api/jobs/:id` or listens to SSE `/api/jobs/stream` for status updates (`queued` -> `processing` -> `completed` / `failed`).

---

## 4. Preview Lightbox & Loaders

- **Progressive drawing**: For OpenAI SSE streams, render base64 partial chunks progressively in the active viewport.
- **Pulse Loading**: For Gemini, show a glassmorphic blur loader with a pulse ring animation.
- **Modal Lightbox**: 
  - Clicking any completed image preview launches a full-screen overlays (Lightbox).
  - The Lightbox displays the image in full resolution, provides a direct "Download" button, and shows the metadata properties (Prompt, Model, Aspect Ratio).

---

## 5. History Storage & Resource Cleanup

- **Static Assets Directory**: Save generated images to `server/public/outputs/<jobId>.png`.
- **History Database**: Save references inside `server/history.json`:
  ```json
  [
    {
      "id": "job_98765",
      "prompt": "A beautiful portrait...",
      "imageUrl": "/outputs/job_98765.png",
      "timestamp": 1713833628,
      "provider": "gemini",
      "submodel": "gemini-3.1-flash-image"
    }
  ]
  ```
- **Delete Endpoint**: Calling `DELETE /api/history/:id` removes the database entry and deletes the actual image file on the disk using Node's filesystem module.
