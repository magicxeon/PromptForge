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
