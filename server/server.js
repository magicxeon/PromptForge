import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import pathModule from 'path';
import fs from 'fs/promises';
import { compilePromptOnServer } from './promptCompiler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from client directory (relative to root)
app.use(express.static(pathModule.join(__dirname, '../client')));

// Fallback to serve attributes and sub-app-game-character from root if they exist there
app.use('/attributes', express.static(pathModule.join(__dirname, '../attributes')));
app.use('/sub-app-game-character', express.static(pathModule.join(__dirname, '../sub-app-game-character')));

// Mock user role middleware (reads X-User-Role header, default to 'user')
app.use((req, res, next) => {
  req.userRole = req.headers['x-user-role'] || 'user';
  next();
});

const DB_PATH = pathModule.join(__dirname, 'database.json');

// Helper to check/deduct credit
async function checkAndDeductCredit(username) {
  try {
    const dbData = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbData);
    
    const user = db.users[username];
    if (!user) throw new Error('User not found');
    if (user.credits <= 0) throw new Error('Insufficient credits');
    
    user.credits -= 1; // Deduct 1 credit
    
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return { credits: user.credits, role: user.role };
  } catch (err) {
    throw new Error(`Credit error: ${err.message}`);
  }
}

// Helper to get credits and role
async function getUserInfo(username) {
  try {
    const dbData = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbData);
    const user = db.users[username];
    if (!user) return { credits: 0, role: 'user' };
    return { credits: user.credits, role: user.role };
  } catch (err) {
    return { credits: 0, role: 'user' };
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Endpoint to fetch current user's credits and role
app.get('/api/credits', async (req, res) => {
  const username = req.query.user || 'user_demo';
  const info = await getUserInfo(username);
  res.json(info);
});

// Simulated Credit Recharge Route
app.post('/api/credits/recharge', async (req, res) => {
  const { username } = req.body;
  const targetUser = username || 'user_demo';
  try {
    const dbData = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbData);
    
    if (!db.users[targetUser]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    db.users[targetUser].credits += 10; // Add 10 credits
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    
    res.json({ credits: db.users[targetUser].credits, role: db.users[targetUser].role });
  } catch (err) {
    res.status(500).json({ error: `Recharge failed: ${err.message}` });
  }
});

// Secret API Generation Route
app.post('/api/generate', async (req, res) => {
  const { provider, submodel, selections, aspectRatio, imageReferences, mode, template, isGptSafe, username } = req.body;
  const targetUser = username || 'user_demo';
  
  // 1. Check and deduct credits first
  let newCredits;
  let userRole = 'user';
  try {
    const deductRes = await checkAndDeductCredit(targetUser);
    newCredits = deductRes.credits;
    userRole = deductRes.role;
  } catch (err) {
    return res.status(402).json({ error: err.message });
  }

  // 2. Build the prompt secretly on the server side
  const compiledPrompt = compilePromptOnServer(
    selections, 
    aspectRatio, 
    imageReferences, 
    mode, 
    template || 'portrait', 
    isGptSafe
  );

  const activeSubmodel = submodel || (provider === 'openai' ? 'dall-e-3' : 'imagen-3.0-generate-002');
  console.log(`[API Generate] Provider: ${provider}, Model: ${activeSubmodel}, User: ${targetUser}, Role: ${userRole}, Remaining Credits: ${newCredits}`);
  console.log(`[API Generate] Compiled Prompt: "${compiledPrompt}"`);

  try {
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        return res.status(500).json({ error: 'OpenAI API Key not configured on server' });
      }

      // Map aspect ratio to DALL-E sizes
      const sizeMap = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '6:8': '1024x1792' };
      let size = sizeMap[aspectRatio] || '1024x1024';
      if (activeSubmodel === 'dall-e-2') {
        size = '1024x1024'; // DALL-E 2 only supports 1:1
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: activeSubmodel,
          prompt: compiledPrompt,
          n: 1,
          size: size
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      return res.json({
        imageUrl: data.data[0].url,
        credits: newCredits,
        prompt: userRole === 'admin' ? compiledPrompt : null // Secret prompt check
      });

    } else if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return res.status(500).json({ error: 'Gemini API Key not configured on server' });
      }

      // Map aspect ratio to Imagen parameters
      const ratioMap = { '1:1': '1:1', '16:9': '16:9', '9:16': '9:16', '6:8': '3:4' };
      const imageRatio = ratioMap[aspectRatio] || '1:1';

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeSubmodel}:predict?key=${apiKey}`, {
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
        credits: newCredits,
        prompt: userRole === 'admin' ? compiledPrompt : null // Secret prompt check
      });
    }

    res.status(400).json({ error: 'Invalid provider' });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
