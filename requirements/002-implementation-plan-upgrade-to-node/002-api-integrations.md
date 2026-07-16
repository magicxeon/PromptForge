# Upgrade Step 2: API Integrations (OpenAI & Google Imagen)
**ID**: 002-api-integrations
**Target**: `ModelPromptForge`

This step covers moving the prompt compilation logic to the server side and integrating OpenAI's DALL-E 3 and Google's Imagen 3 API endpoints.

---

## 1. API Specifications

### 1.1 OpenAI DALL-E 3
- **REST Endpoint**: `POST https://api.openai.com/v1/images/generations`
- **Request Headers**:
  - `Authorization: Bearer OPENAI_API_KEY`
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "model": "dall-e-3",
    "prompt": "<COMPILED_PROMPT>",
    "n": 1,
    "size": "1024x1792" // mapped dynamically from state.aspectRatio
  }
  ```
- **Response Handling**: Extracts `data[0].url` (expires after 1 hour) or downloads image bytes to serve locally.

### 1.2 Google Imagen 3 (Gemini REST API)
- **REST Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=GEMINI_API_KEY`
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "instances": [
      { "prompt": "<COMPILED_PROMPT>" }
    ],
    "parameters": {
      "numberOfImages": 1,
      "outputMimeType": "image/jpeg",
      "aspectRatio": "3:4" // mapped dynamically: "1:1", "3:4", "4:3", "9:16", "16:9"
    }
  }
  ```
- **Response Handling**: Extracts `predictions[0].bytesBase64Encoded` and returns a Base64 Data URL (`data:image/jpeg;base64,...`) to the frontend.

---

## 2. Dynamic Aspect Ratio Mappings
The frontend aspect ratios (e.g. `6:8`) must be translated to matching specifications for each model:

| Frontend Ratio | OpenAI DALL-E 3 Size | Google Imagen 3 Ratio |
| :--- | :--- | :--- |
| `6:8` (Portrait) | `1024x1792` (maps to vertical) | `3:4` |
| `1:1` (Square) | `1024x1024` | `1:1` |
| `9:16` (Mobile) | `1024x1792` | `9:16` |
| `16:9` (Wide) | `1792x1024` | `16:9` |
| `4:5` (Instagram) | `1024x1024` (or `1024x1792`) | `3:4` |

---

## 3. Backend Code Specification

### 3.1 Prompt Compiler Relocation
We will move the prompt building logic from `app.js` into a shared backend module `promptCompiler.js` or directly inside the generation routes.

### 3.2 Express Route Handlers
Add the generation endpoint `/api/generate` to `server.js`:

```javascript
import fetch from 'node-fetch'; // if node < 18, otherwise use global fetch

app.post('/api/generate', async (req, res) => {
  const { provider, selections, aspectRatio, imageReferences, mode, headshotPanels } = req.body;
  
  // 1. Build the prompt secretly on the server side
  const compiledPrompt = compilePromptOnServer(selections, aspectRatio, imageReferences, mode, headshotPanels);

  try {
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'OpenAI API Key not configured on server' });

      // Map aspect ratio to DALL-E sizes
      const sizeMap = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '6:8': '1024x1792' };
      const size = sizeMap[aspectRatio] || '1024x1024';

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: compiledPrompt,
          n: 1,
          size: size
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return res.json({
        imageUrl: data.data[0].url,
        prompt: req.userRole === 'admin' ? compiledPrompt : null // Only return prompt to Admin
      });

    } else if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'Gemini API Key not configured on server' });

      // Map aspect ratio to Imagen parameters
      const ratioMap = { '1:1': '1:1', '16:9': '16:9', '9:16': '9:16', '6:8': '3:4' };
      const imageRatio = ratioMap[aspectRatio] || '1:1';

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: compiledPrompt }],
          parameters: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: imageRatio
          }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const base64Bytes = data.predictions[0].bytesBase64Encoded;
      return res.json({
        imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
        prompt: req.userRole === 'admin' ? compiledPrompt : null // Only return prompt to Admin
      });
    }

    res.status(400).json({ error: 'Invalid provider' });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 4. Verification Plan
- **Verification steps**:
  1. Add valid API Keys in `.env`.
  2. Send a mock HTTP request to `/api/generate` via Postman or curl.
  3. Verify that the response contains a valid image URL/base64 payload.
  4. Verify that the returned prompt field is correctly censored or shown according to mock role middleware.
