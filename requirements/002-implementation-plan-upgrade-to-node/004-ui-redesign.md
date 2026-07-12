# Upgrade Step 4: UI Redesign & Model Options
**ID**: 004-ui-redesign
**Target**: `ModelPromptForge`

This document specifies the requirements and implementation details for a complete visual redesign of the ModelPromptForge UI. The new UI will prioritize premium aesthetics (glassmorphism, neon accents), integrate submodel selection for each provider, allocate a prominent viewport for generated images, and include a professional footer.

---

## 1. UI Layout & Component Design

We will replace the current two-column layout with a highly optimized dashboard interface:

### 1.1 Header & Control Bar
- **Account Panel**: Move to a compact, glassmorphism card on the top right. Displays user name, role badge, and credit balance (with a reload animation on change).
- **Simulated Credits Top-Up**: Add a "+" button next to the credit count. Clicking it triggers a simulated backend endpoint (`POST /api/credits/recharge`) which adds +10 credits to the active user profile, facilitating frictionless sandbox testing.
- **Aesthetic Presets**: Reorganize into a horizontal scrollable chip bar with subtle hover scaling to save vertical space.

### 1.2 Layout Split (Workspace)
- **Left Panel (60% width)**: Dynamic Form Builder. Collapsible accordions with smooth transition animations, neon indicator borders, and custom-styled dropdown selections.
- **Right Panel (40% width)**: Sticky Output Dashboard.
  - **Provider & Submodel Config**: Segmented buttons for Provider (OpenAI / Gemini) and a dynamic dropdown for Submodels.
  - **Visual Viewport (Image Output)**: A large, premium dark-glass card dedicated to image results. Features a modern pulse-glow loader during active API requests and smooth transitions for loaded images.
  - **Embedded Viewport Error Handling**: Instead of native browser `alert()` popups, connection or credit validation errors will render directly inside the viewport card as a neon red warning banner (`.viewport-error-banner`).
  - **Download Generated Image**: Integrate a "Download Image" action button overlay on the image viewport that becomes active once an image is successfully rendered, allowing standard and admin users to save their results locally.
  - **Generation Telemetry Metadata**: Display subtle stats beneath the viewport showing metrics like "Model: DALL-E 3 | Time: 4.8s | Aspect Ratio: 6:8".
  - **Live Prompt Preview**: Glass card with colored token highlighting and responsive character counts.
  - **Action Hub**: Prominent, glowing neon call-to-action buttons (Generate, Reset, Surprise Me).

### 1.3 Professional Footer
- A clean, modern footer spanning the bottom of the page containing:
  - System status indicators: "API Proxy: Active", "Local Database: Sync", "CORS Tunnel: Connected".
  - Active model indicator and general copyright info.
  - Designed with minimal opacity text and neon active status dots.

---

## 2. Dynamic Model & Submodel Selectors

We will update the backend `/api/generate` and the frontend selectors to support choosing specific model variations:

| Provider | Submodel Value (API) | Display Name | Cost (Credits) |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | `imagen-3.0-generate-002` | Imagen 3 (Default, High Quality) | 1 Credit |
| | `imagen-2.0` | Imagen 2 (Fast, Legacy) | 1 Credit |
| **OpenAI** | `dall-e-3` | DALL-E 3 (High Detail) | 1 Credit |
| | `dall-e-2` | DALL-E 2 (Standard, Legacy) | 1 Credit |

---

## 3. Proposed Code Specifications

### 3.1 Frontend HTML Modification (`client/index.html`)
- Integrate new layout wrappers (`.workspace-wrapper`, `.viewport-card`, `.footer-bar`).
- Add the Submodel `<select>` dropdown next to the Provider selection.
- Incorporate a "+" top-up button next to the credit count.
- Integrate download icon button inside the image output box.

### 3.2 Frontend Style Enhancement (`client/style.css`)
- Inject premium CSS rules for:
  - Deep-space gradient backgrounds (`linear-gradient(135deg, #09090b 0%, #030008 100%)`).
  - Glassmorphic panels with soft purple borders.
  - Neon animations (`pulse-glow-pink`, `card-glow-cyan`).
  - Styled custom scrollbars for accordion container.
  - Neon red warning banners for inline error outputs.

### 3.3 Backend API Update (`server/server.js`)
- **New API Route**: `POST /api/credits/recharge` - Adds +10 credits to a user's record inside `database.json`.
- **Generation Route**: Read `submodel` from the request body and pass it to the respective external REST API endpoints instead of hardcoding. Include generation time metrics in the response payload.

---

## 4. Verification Plan
- **Verification steps**:
  1. Open the updated web interface on `http://localhost:6500`.
  2. Select **Google Gemini** -> verify that the Submodel dropdown list updates to show *Imagen 3* and *Imagen 2*.
  3. Select **OpenAI** -> verify that the Submodel dropdown updates to show *DALL-E 3* and *DALL-E 2*.
  4. Click **Generate Image** and check the console logs to confirm that the server receives and forwards the chosen submodel to the respective API.
  5. Verify that the layout adjusts fluidly to mobile viewports.
