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
├── client/              [NEW DIRECTORY - Move frontend assets here]
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── attributes/
├── server/              [NEW DIRECTORY]
│   └── server.js        [NEW]
├── package.json         [NEW]
├── .env.example         [NEW]
├── .env                 [NEW] (Local gitignored file)
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
  "main": "server/server.js",
  "scripts": {
    "start": "node server/server.js",
    "dev": "node --watch server/server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "dotenv": "^16.4.5",
    "cors": "^2.8.5"
  }
}
```

### 3.2 `.env.example` [NEW]
Provide template for developers to plug in their credentials:
```env
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3.3 `server/server.js` [NEW]
Create the core Express server that serves static frontend files from the client directory and exposes API routes:
```javascript
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'url';
import { fileURLToPath } from 'url';
import pathModule from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from client directory (relative to root)
app.use(express.static(pathModule.join(__dirname, '../client')));

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
