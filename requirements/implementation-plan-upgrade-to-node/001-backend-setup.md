# Upgrade Step 1: Backend Server Setup
**ID**: 001-backend-setup
**Target**: `ModelPromptForge`

This step covers setting up the Node.js project environment, installing basic dependencies, writing the Express server shell, and configuring environment variables.

---

## 1. Environment & Dependencies
We will convert the project root to a Node.js project using `package.json`.
- **Node version**: `>= 18.x`
- **Dependencies**:
  - `express`: Web server framework.
  - `dotenv`: Load environment variables from `.env`.
  - `cors`: Allow cross-origin requests during development.
  - `node-fetch`: (Optional, only if Node version < 18, otherwise use native global `fetch`).

---

## 2. Proposed File Structure Changes

```
ModelPromptForge/
├── package.json         [NEW]
├── server.js            [NEW]
├── .env.example         [NEW]
├── .env                 [NEW] (Local gitignored file)
├── app.js               [MODIFY] (Adapt UI endpoints)
├── index.html           [MODIFY] (Serve from server)
```

---

## 3. Implementation Specification

### 3.1 `package.json` [NEW]
Initialize Node.js package with type `"module"` to continue using ES modules:
```json
{
  "name": "model-prompt-forge",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5"
  }
}
```

### 3.2 `.env-sample` and `.env` [NEW]
Provide a detailed template for environment variables and API credentials. During setup, the user will copy `.env-sample` to `.env` and fill in the active keys.

**File contents for `.env-sample` / `.env`**:
```env
# Application Port Config
PORT=3000

# Backend Environment Vibe
NODE_ENV=development

# OpenAI API Key (Required for DALL-E 3 image generation)
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini API Key (Required for Imagen 3 generation via AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here

# PoC Authentication & Administration Passwords
ADMIN_PASSCODE=Admin123!
DEMO_USER_PASSCODE=User123!

# PoC Credit Settings
DEFAULT_USER_CREDITS=20
```

### 3.3 `server.js` [NEW]
Create the core Express server that serves static frontend files and exposes API routes:
```javascript
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from root directory
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

---

## 4. Verification Plan
- **Verification Commands** (To be run by user):
  1. `npm install`
  2. `npm start`
  3. Verify the console logs: `Server running at http://localhost:3000`
  4. Open `http://localhost:3000` in browser and confirm UI loads statically.
  5. Fetch `http://localhost:3000/api/health` and verify the JSON response is `{ "status": "ok", ... }`.
