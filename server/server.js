import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import pathModule from 'path';
import fs from 'fs/promises';
import zlib from 'zlib';
import { compilePromptOnServer } from './promptCompiler.js';
import { collectionManager, CollectionError } from './collectionManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from client directory (relative to root)
app.use(express.static(pathModule.join(__dirname, '../client')));

// Serve sub-app-game-character static files from root if they exist there
app.use('/sub-app-game-character', express.static(pathModule.join(__dirname, '../sub-app-game-character')));

// Mock user role middleware (reads X-User-Role header, default to 'user')
app.use((req, res, next) => {
  req.userRole = req.headers['x-user-role'] || 'user';
  next();
});

const ATTRIBUTE_FILES = [
  '001-character.json',
  '002-face.json',
  '003-eyes.json',
  '004-eyebrows.json',
  '005-nose.json',
  '006-lips.json',
  '007-skin.json',
  '008-hair.json',
  '009-body.json',
  '010-clothing.json',
  '011-pose.json',
  '012-environment.json',
  '013-lighting.json',
  '014-camera.json',
  '015-quality.json',
  '016-nsfw.json',
  '017-photographic-context.json',
  '018-scene-story.json',
  '019-expression.json',
  '020-camera-framing.json',
  '021-accessories.json',
  '022-hair-extra.json',
  '023-architecture.json'
];

let cachedAttributesBundle = null;

async function getAttributesBundle() {
  if (cachedAttributesBundle) {
    return cachedAttributesBundle;
  }

  try {
    const attributesDir = pathModule.join(__dirname, '../attributes');
    
    // Read spec files
    const schemaRaw = await fs.readFile(pathModule.join(attributesDir, 'spec/ui-schema.json'), 'utf-8');
    const templatesRaw = await fs.readFile(pathModule.join(attributesDir, 'spec/prompt-templates.json'), 'utf-8');
    const orderRaw = await fs.readFile(pathModule.join(attributesDir, 'spec/prompt-order.json'), 'utf-8');
    const presetsRaw = await fs.readFile(pathModule.join(attributesDir, 'spec/presets.json'), 'utf-8');

    const schema = JSON.parse(schemaRaw);
    const templates = JSON.parse(templatesRaw);
    const orderData = JSON.parse(orderRaw);
    const order = orderData.order;
    const presets = JSON.parse(presetsRaw);

    // Load individual attributes
    const library = [];
    for (const file of ATTRIBUTE_FILES) {
      try {
        const fileContent = await fs.readFile(pathModule.join(attributesDir, file), 'utf-8');
        const fileData = JSON.parse(fileContent);
        const items = Array.isArray(fileData) ? fileData : (fileData.entries || []);
        library.push(...items);
      } catch (err) {
        console.warn(`[Bundle] Failed to read ${file}, skipping:`, err.message);
      }
    }

    cachedAttributesBundle = {
      schema,
      templates,
      order,
      library,
      presets
    };

    return cachedAttributesBundle;
  } catch (err) {
    console.error('[Bundle] Failed to compile attributes bundle:', err);
    throw err;
  }
}

// Secure and compressed Attributes Bundle Endpoint (Step 10)
app.get('/api/attributes/bundle', async (req, res) => {
  try {
    const bundle = await getAttributesBundle();
    const jsonStr = JSON.stringify(bundle);
    
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('gzip')) {
      zlib.gzip(jsonStr, (err, buffer) => {
        if (err) {
          console.error('[Bundle] Gzip compression failed:', err);
          return res.status(500).json({ error: 'Compression failed' });
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip'
        });
        res.end(buffer);
      });
    } else {
      res.json(bundle);
    }
  } catch (err) {
    res.status(500).json({ error: `Failed to load attributes: ${err.message}` });
  }
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

function sendCollectionError(res, error) {
  if (error instanceof CollectionError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }
  console.error('[Collections] Unexpected error:', error);
  return res.status(500).json({
    error: {
      code: 'collection_internal_error',
      message: 'Collection operation failed.'
    }
  });
}

app.get('/api/collections', async (req, res) => {
  try {
    res.json(await collectionManager.list());
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.post('/api/collections', async (req, res) => {
  try {
    res.status(201).json(await collectionManager.create(req.body));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.get('/api/collections/:id', async (req, res) => {
  try {
    res.json(await collectionManager.get(req.params.id));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.patch('/api/collections/:id', async (req, res) => {
  try {
    res.json(await collectionManager.update(req.params.id, req.body));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.delete('/api/collections/default', async (req, res) => {
  try {
    res.json(await collectionManager.clearDefault());
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.delete('/api/collections/:id', async (req, res) => {
  try {
    res.json(await collectionManager.remove(req.params.id));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.post('/api/collections/:id/images', async (req, res) => {
  try {
    res.json(await collectionManager.addImages(req.params.id, req.body.jobIds));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.delete('/api/collections/:id/images/:jobId', async (req, res) => {
  try {
    res.json(await collectionManager.removeImage(req.params.id, req.params.jobId));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

app.put('/api/collections/:id/default', async (req, res) => {
  try {
    res.json(await collectionManager.setDefault(req.params.id));
  } catch (error) {
    sendCollectionError(res, error);
  }
});

import { queueManager } from './queueManager.js';

// Secret API Generation Route (Queue-based)
app.post('/api/generate', async (req, res) => {
  const { 
    provider, submodel, selections, aspectRatio, imageReferences, mode, template, isGptSafe, username,
    faceReferenceImageA, faceReferenceImageB, faceReferenceJobIds,
    styleReferenceImageA, styleReferenceImageB, styleReferenceJobIds,
    customColors
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
      isGptSafe,
      customColors
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
  // Warm the attributes cache on startup
  getAttributesBundle().then(() => {
    console.log('[Bundle] Attributes cache warmed successfully.');
  }).catch(err => {
    console.error('[Bundle] Failed to warm cache on startup:', err);
  });
  collectionManager.init().catch(err => {
    console.error('[Collections] Failed to initialize storage:', err);
  });
});
