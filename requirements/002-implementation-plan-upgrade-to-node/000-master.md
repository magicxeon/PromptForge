# Node.js Upgrade Master Plan (Phase 1: PoC)
**ID**: 000-master
**Application**: `ModelPromptForge`

This master document tracks the implementation checklist for upgrading **ModelPromptForge** from a static frontend app to a Node.js full-stack application (Phase 1: Proof of Concept).

---

## 1. Upgrade Goals
- **Backend API proxy**: Move API keys and image generation calls to a Node.js/Express server to prevent client-side key leakage and solve CORS.
- **Role-based prompt visibility**: Block standard users from seeing the raw text prompt, while allowing Admin users to view it.
- **PoC Credit System**: Simulated credit consumption per generation, saved in-memory or in a local JSON file.
- **Multi-Provider Support**: Backend endpoints for OpenAI (DALL-E 3) and Google Gen AI (Imagen 3).

---

## 2. Implementation Checklist

- [ ] **Step 1: Backend Server Setup** (`001-backend-setup.md`)
  - Initialize Node.js project.
  - Install dependencies (`express`, `dotenv`, `cors`).
  - Write `server.js` to serve static files and run on port 3000.
  - Create `.env` file template for API keys.
- [ ] **Step 2: API Integrations** (`002-api-integrations.md`)
  - Build server-side prompt compiler (moving compiler logic to server).
  - Implement OpenAI DALL-E 3 route (`/api/generate/openai`).
  - Implement Google Gemini Imagen 3 route (`/api/generate/gemini`).
  - Handle base64 image data transmission to frontend.
- [ ] **Step 3: Role Hiding & PoC Credits** (`003-role-controls-and-credits.md`)
  - Implement basic user authentication simulation (headers or query params).
  - Hide/show Prompt Preview based on role (Admin vs User).
  - Implement local simulated credit checks and balance deduction.
- [ ] **Step 4: UI Redesign & Model Options** (`004-ui-redesign.md`)
  - Redesign dashboard UI for premium visual experience.
  - Integrate dynamic provider submodel selectors (DALL-E 2/3, Imagen 2/3).
  - Create a dedicated generated image viewport card with pulse loaders.
  - Add status-oriented professional footer.
- [ ] **Step 5: Modular Providers & SSE Image Streaming** (`005-modular-generation-providers.md`)
  - Implement Provider Strategy pattern on backend (OpenAI, Gemini, others).
  - Integrate OpenAI `gpt-image-*` models via `/v1/images/generations`.
  - Implement progressive SSE streaming proxy for real-time viewport drawing.
  - Refine billing to support token analytics and display telemetry statistics.
- [ ] **Step 6: UI/UX Refinement, Concurrency Queue & Image Lightbox** (`006-ui-ux-refinement-and-queue.md`)
  - Restructure page layout (logical creator pipeline).
  - Implement collapsible/expandable Visual Dashboard and Aesthetic Configurator.
  - Develop background concurrency job queue on backend.
  - Add Full-screen Modal Lightbox with download/metadata features.
  - Save outputs as static assets and implement history local database with file deletion.
- [ ] **Step 7: Advanced UI/UX Refinement & Dynamic Aspect Ratios** (`007-ui-ux-enhancements.md`)
  - Replace presets scroll chips with dropdown and load button.
  - Fix dynamic accordion height constraints and scrolling.
  - Remove redundant Prompt Template selector.
  - Implement linked aspect ratio dimensions (Width/Height) with validation constraints.
  - Redesign Generate button with cost indicator and enhance theme contrast.
  - Auto-collapse viewport on page load if history is empty.
  - Hide Live Prompt Preview card completely for non-admin users.
- [ ] **Step 8: Advanced Validations & Attribute Localization** (`008-advanced-validations-and-localization.md`)
  - Implement mandatory field validation and autofocus scrolling.
  - Add scroll-to-focus on Open Studio Configurator click.
  - Update character.json schema to support multilingual translation keys and load language toggle.
- [ ] **Step 9: Loopback Referencing** (`009-loopback-referencing.md`)
  - Add Face and Style reference selection buttons to active Viewport and Lightbox Modal.
  - Bind client-side JS to store base64/local paths and show thumbnail previews.
  - Adjust backend to resolve local static file paths and read references.
- [ ] **Step 10: Secure Attribute Aggregation & Caching API** (`010-attribute-bundling-and-security.md`)
  - Build server-side attributes bundle aggregation endpoint.
  - Hide/restrict the raw static `/attributes/` directory path on the Express web server.
  - Implement server-side warming memory cache for attributes database.
  - Refactor frontend `initApp()` to load all configurations in a single bundle request.
- [ ] **Step 11: Presets Externalization, Hair Textures & Color Pickers** (`011-presets-json-and-color-pickers.md`)
  - Extract presets from `client/app.js` code variables to server-side JSON.
  - Correct hair texture attribute mappings to represent actual hair qualities.
  - Implement interactive custom Color Pickers for hair colors/highlights.
  - Add optional custom Color Pickers for clothing components (tops, bottoms, dresses, shoes).
- [ ] **Step 12: Session Persistence & Engine Selection Validation** (`012-session-persistence-and-engine-validation.md`)
  - Add validation inside `validateForm()` for selected Provider Engine and Submodel Version.
  - Implement automatic selections persistence in browser `localStorage` on any form inputs change.
  - Partition saved configurations by current mode (`headshot`, `character-sheet`, and `normal`).
  - Restore active mode settings on application load and switch.
- [x] **Step 13: Image Collections, Navigation & UI Reliability** (`013-image-collections-navigation-and-ui-fixes.md`)
  - Add persistent image Collections with description, story, cover, and default behavior.
  - Prepare Collection metadata for a future AI story-to-character workflow without implementing AI automation yet.
  - Fix stale Face Match references when the checkbox is disabled.
  - Fix language switching and preserve dynamic form behavior.
  - Add a floating control that returns users to Visual Viewport & Queue.
- [ ] **Step 14: Optional AI Story Studio & Character Generation** (`014-optional-ai-story-studio-and-character-generation.md`)
  - Add an opt-in Story Studio without changing the default manual generation workflow.
  - Use Gemini structured analysis to build a reviewable story bible, cast, and attribute mappings.
  - Require human approval before canonical character generation and batch progression.
  - Charge configurable credits for analysis, re-analysis, AI remapping, and each generated image.
  - Provide cost previews, server-authoritative billing, idempotent deduction/refund, and resumable generation plans.

## 3. Later Requirement Addendum

- [ ] **Step 23: BytePlus ModelArk Seedream Provider** (`023-byteplus-modelark-seedream-provider.md`)
  - Add BytePlus ModelArk Seedream through the config-driven provider registry.
  - Support `MODEL_ARK_API`, region/base URL configuration, and server-side bearer authentication.
  - Map text-to-image and reference-image workflows to ModelArk `/api/v3/images/generations`.
  - Normalize `b64_json` and temporary `url` responses into existing History, Queue and Comparison result contracts.
  - Defer Seedream streaming and batch output until pricing/credit and UI behavior are approved.
- [ ] **Step 24: UI Improvement 1** (`024-UI-improvement-1.md`)
  - Hide unused pixel width/height controls for resolution-driven providers such as Seedream and Grok.
  - Prune Headshot Grid and Character Sheet categories so story/commercial controls do not leak into identity workflows.
  - Add subtle application navigation fade behavior at the top of the page.
