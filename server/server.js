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

import { queueManager } from './queueManager.js';

// Secret API Generation Route (Queue-based)
app.post('/api/generate', async (req, res) => {
  const { 
    provider, submodel, selections, aspectRatio, imageReferences, mode, template, isGptSafe, username,
    faceReferenceImageA, faceReferenceImageB, faceReferenceJobIds,
    styleReferenceImageA, styleReferenceImageB, styleReferenceJobIds
  } = req.body;
  const targetUser = username || 'user_demo';
  
  try {
    // 1. Check user credit before queueing
    const info = await getUserInfo(targetUser);
    if (info.credits <= 0) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // 2. Build prompt secretly on the server
    const compiledPrompt = compilePromptOnServer(
      selections, 
      aspectRatio, 
      imageReferences, 
      mode, 
      template || 'portrait', 
      isGptSafe
    );

    // 3. Determine submodel default
    const activeSubmodel = submodel || (provider === 'openai' ? 'gpt-image-1-mini' : 'gemini-3.1-flash-lite-image');

    // 4. Check if stream option should be active
    const stream = req.body.stream !== false && provider === 'openai' && activeSubmodel.startsWith('gpt-image');

    console.log(`[API Generate] Enqueueing Job. Provider: ${provider}, Model: ${activeSubmodel}, User: ${targetUser}, Stream: ${stream}`);
    
    // 5. Enqueue job
    const jobId = queueManager.enqueue(provider, activeSubmodel, compiledPrompt, {
      aspectRatio,
      imageReferences,
      mode,
      template,
      isGptSafe,
      username: targetUser,
      stream,
      faceReferenceImageA,
      faceReferenceImageB,
      faceReferenceJobIds,
      styleReferenceImageA,
      styleReferenceImageB,
      styleReferenceJobIds
    });

    res.json({ jobId, status: 'queued' });

  } catch (error) {
    console.error('Generation enqueuing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Job Status Endpoint
app.get('/api/jobs/:id', (req, res) => {
  const status = queueManager.getJobStatus(req.params.id);
  if (!status) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(status);
});

// Job SSE Stream Endpoint
app.get('/api/jobs/:id/stream', (req, res) => {
  const jobId = req.params.id;
  const success = queueManager.addListener(jobId, res);
  if (!success) {
    return res.status(404).json({ error: 'Job not found or closed' });
  }

  req.on('close', () => {
    queueManager.removeListener(jobId, res);
  });
});

// Get Generation History List
app.get('/api/history', async (req, res) => {
  const history = await queueManager.getHistory();
  res.json(history);
});

// Delete Generation History Item
app.delete('/api/history/:id', async (req, res) => {
  const success = await queueManager.deleteHistoryEntry(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'History entry not found' });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
