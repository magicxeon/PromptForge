import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import pathModule from 'path';
import fs from 'fs/promises';
import zlib from 'zlib';
import { collectionManager, CollectionError } from './collectionManager.js';
import { getProviderRegistry } from './providers/ProviderRegistry.js';
import { queueManager } from './queueManager.js';
import { creditManager } from './creditManager.js';
import { compileGenerationContext, createQueueOptions } from './generationRequestService.js';
import { ComparisonOrchestrator } from './comparison/ComparisonOrchestrator.js';
import { ComparisonError } from './comparison/ComparisonRepository.js';
import { historyRepository, HistoryCursorError } from './historyRepository.js';
import {
  createSceneShareDraft,
  publishSceneTemplateShare,
  communityPostRepo,
  communityRemixRepo
} from './communityServices.js';
import { sanitizeReferenceSlotsForPublic } from './sceneTemplates/sceneTemplateSanitizer.js';
import { actorContextMiddleware } from './middleware/actorContextMiddleware.js';
import { mockUserRepo } from './identity/MockUserRepository.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const providerRegistry = getProviderRegistry();
const comparisonOrchestrator = new ComparisonOrchestrator({
  providerRegistry,
  queueManager,
  creditManager
});

app.use(cors());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '20mb' }));
app.use(actorContextMiddleware);

// Serve static frontend files from client directory (relative to root)
app.use(express.static(pathModule.join(__dirname, '../client')));

// Serve sub-app-game-character static files from root if they exist there
app.use('/sub-app-game-character', express.static(pathModule.join(__dirname, '../sub-app-game-character')));

// Mock user role middleware (reads active role from server-resolved ActorContext)
app.use((req, res, next) => {
  req.userRole = req.actorContext?.role || 'user';
  next();
});

function resolveRequestUsername(req, {
  allowQuery = true,
  allowBody = true,
  rejectMismatch = true
} = {}) {
  const contextUser = req.actorContext?.username || null;
  const bodyUser = allowBody ? req.body?.username : null;
  const queryUser = allowQuery ? req.query?.user || req.query?.username : null;
  const legacyUser = bodyUser || queryUser || null;

  if (rejectMismatch && contextUser && legacyUser && contextUser !== legacyUser) {
    const err = new Error(`Identity mismatch: actor is ${contextUser} but request specified ${legacyUser}`);
    err.statusCode = 400;
    throw err;
  }

  return contextUser || legacyUser || 'user_demo';
}

app.get('/api/providers', (req, res) => {
  res.json(providerRegistry.getPublicCatalog());
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
  '023-architecture.json',
  '024-fashion-commerce.json'
];

let cachedAttributesBundle = null;

async function getAttributesBundle() {
  const enabledCache = process.env.ENABLED_CACHE_ATTRIBUTE_BUNDLE === 'true';

  if (enabledCache && cachedAttributesBundle) {
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

    const compiledBundle = {
      schema,
      templates,
      order,
      library,
      presets
    };

    if (enabledCache) {
      cachedAttributesBundle = compiledBundle;
    }

    return compiledBundle;
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Mock Auth endpoints
app.get('/api/me', (req, res) => {
  res.json(req.actorContext || null);
});

app.get('/api/mock-users', async (req, res) => {
  try {
    const activeUsers = await mockUserRepo.listActiveUsers();
    const sanitized = activeUsers.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role
    }));
    res.json({ enabled: true, users: sanitized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mock users' });
  }
});

// Endpoint to fetch current user's credits and role
app.get('/api/credits', async (req, res) => {
  try {
    const username = resolveRequestUsername(req, { allowBody: false });
    const info = await creditManager.getUserInfo(username);
    res.json(info);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Simulated Credit Recharge Route
app.post('/api/credits/recharge', async (req, res) => {
  try {
    const targetUser = resolveRequestUsername(req, { allowQuery: false });
    res.json(await creditManager.recharge(targetUser, 10));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: `Recharge failed: ${err.message}` });
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

// Secret API Generation Route (Queue-based)
app.post('/api/generate', async (req, res) => {
  const { provider, submodel } = req.body;
  
  try {
    const targetUser = resolveRequestUsername(req, { allowQuery: false });
    const { provider: providerConfig, model: modelConfig } = providerRegistry.resolveSelection(provider, submodel);
    const activeProvider = providerConfig.id;
    const activeSubmodel = modelConfig.id;
    const creditCost = Number(modelConfig.creditCost || 1);

    await creditManager.assertBalance(targetUser, creditCost);
    const { context, compiledPrompt } = compileGenerationContext({ ...req.body, userRole: req.userRole });
    providerRegistry.validateRequest(modelConfig, {
      aspectRatio: context.aspectRatio,
      referenceCount: context.referenceCount,
      imageResolution: context.imageResolution || modelConfig.defaults?.resolution || null
    });

    // 3. Resolve streaming from the selected model capability and provider policy.
    const stream = providerRegistry.shouldStream(providerConfig, modelConfig, req.body.stream !== false);

    console.log(`[API Generate] Enqueueing Job. Provider: ${activeProvider}, Model: ${activeSubmodel}, User: ${targetUser}, Stream: ${stream}`);
    
    // 5. Enqueue job
    const jobId = queueManager.enqueue(activeProvider, activeSubmodel, compiledPrompt, createQueueOptions(context, {
      username: targetUser,
      stream,
      modelConfig,
      providerConfigVersion: providerRegistry.getConfigVersion(),
      creditCost
    }));

    res.json({
      jobId,
      status: 'queued',
      providerStreaming: stream
    });

  } catch (error) {
    console.error('Generation enqueuing error:', error);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

function getComparisonUsername(req) {
  return resolveRequestUsername(req);
}

function sendComparisonError(res, error) {
  if (error instanceof ComparisonError || error.statusCode) {
    return res.status(error.statusCode || 400).json({
      error: { code: error.code || 'comparison_request_failed', message: error.message }
    });
  }
  console.error('[Comparison] Unexpected error:', error);
  return res.status(500).json({
    error: { code: 'comparison_internal_error', message: 'Comparison operation failed.' }
  });
}

app.post('/api/comparisons/estimate', async (req, res) => {
  try {
    res.json(await comparisonOrchestrator.estimate({ ...req.body, userRole: req.userRole }, getComparisonUsername(req)));
  } catch (error) {
    sendComparisonError(res, error);
  }
});

app.post('/api/comparisons', async (req, res) => {
  try {
    const result = await comparisonOrchestrator.create({ ...req.body, userRole: req.userRole }, getComparisonUsername(req));
    res.status(result.idempotentReplay ? 200 : 201).json(result);
  } catch (error) {
    sendComparisonError(res, error);
  }
});

app.get('/api/comparisons', async (req, res) => {
  try {
    res.json(await comparisonOrchestrator.list(getComparisonUsername(req), req.query));
  } catch (error) {
    sendComparisonError(res, error);
  }
});

app.get('/api/comparisons/:setId', async (req, res) => {
  try {
    res.json(await comparisonOrchestrator.get(req.params.setId, getComparisonUsername(req)));
  } catch (error) {
    sendComparisonError(res, error);
  }
});

app.patch('/api/comparisons/:setId', async (req, res) => {
  try {
    res.json(await comparisonOrchestrator.update(req.params.setId, getComparisonUsername(req), req.body));
  } catch (error) {
    sendComparisonError(res, error);
  }
});

app.patch('/api/comparisons/:setId/winner', async (req, res) => {
  try {
    res.json(await comparisonOrchestrator.setWinner(
      req.params.setId,
      getComparisonUsername(req),
      req.body.jobId
    ));
  } catch (error) {
    sendComparisonError(res, error);
  }
});

app.delete('/api/comparisons/:setId', async (req, res) => {
  try {
    res.json(await comparisonOrchestrator.remove(req.params.setId, getComparisonUsername(req)));
  } catch (error) {
    sendComparisonError(res, error);
  }
});

// Job Status Endpoint
app.get('/api/jobs/:id', async (req, res) => {
  const status = await queueManager.getJobStatus(req.params.id);
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
  try {
    const collectionId = req.query.collectionId || 'all';
    let allowedJobIds = null;
    if (collectionId !== 'all') {
      const collections = await collectionManager.list();
      const collection = collections.collections.find(item => item.id === collectionId);
      if (!collection) return res.status(404).json({ error: 'Collection not found' });
      allowedJobIds = new Set(collection.jobIds);
    }
    res.json(await historyRepository.listPage({
      cursor: req.query.cursor || null,
      limit: req.query.limit,
      collectionId,
      allowedJobIds
    }));
  } catch (error) {
    if (error instanceof HistoryCursorError) {
      return res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    }
    console.error('[History] Pagination failed:', error);
    res.status(500).json({ error: 'Could not load image history.' });
  }
});

app.get('/api/history/:id', async (req, res) => {
  const item = await historyRepository.getById(req.params.id);
  if (!item) return res.status(404).json({ error: 'History entry not found' });
  res.json(item);
});

// Delete Generation History Item
app.delete('/api/history/:id', async (req, res) => {
  const success = await queueManager.deleteHistoryEntry(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'History entry not found' });
  }
  await comparisonOrchestrator.removeHistoryJob(req.params.id);
  res.json({ success: true });
});

// POST /api/scene-templates/share-drafts
app.post('/api/scene-templates/share-drafts', async (req, res) => {
  try {
    const { sourceGenerationId } = req.body || {};
    const identity = resolveRequestUsername(req, { allowQuery: false });
    const draft = await createSceneShareDraft(sourceGenerationId, identity);
    res.json(draft);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// POST /api/scene-templates/share-drafts/:draftId/publish
app.post('/api/scene-templates/share-drafts/:draftId/publish', async (req, res) => {
  try {
    const { title, description, promptVisibility } = req.body || {};
    const post = await publishSceneTemplateShare(req.params.draftId, title, description, promptVisibility);
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/scene-templates/shared
app.get('/api/scene-templates/shared', async (req, res) => {
  try {
    const posts = await communityPostRepo.readAll();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scene-templates/shared/:postId
app.get('/api/scene-templates/shared/:postId', async (req, res) => {
  try {
    const post = await communityPostRepo.getById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scene-templates/shared/:postId/use-template
app.post('/api/scene-templates/shared/:postId/use-template', async (req, res) => {
  try {
    const post = await communityPostRepo.getById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const viewerContext = { username: resolveRequestUsername(req, { allowQuery: false }) };
    const ownerUsername = post.ownerUsername || 'user_demo';
    const sanitizedSnapshot = sanitizeReferenceSlotsForPublic(
      post.sceneTemplateSnapshot, 
      viewerContext, 
      ownerUsername
    );

    res.json({
      postId: post.id,
      title: post.title,
      description: post.description,
      ownerUsername: post.ownerUsername,
      sceneTemplateSnapshot: sanitizedSnapshot
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/scene-templates/remix-events
app.post('/api/scene-templates/remix-events', async (req, res) => {
  try {
    const { templateId, sourcePostId, generatedJobId } = req.body || {};
    const identity = resolveRequestUsername(req, { allowQuery: false });
    const event = await communityRemixRepo.recordRemix({
      templateId,
      sourcePostId,
      username: identity,
      generatedJobId
    });
    res.json(event);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Static SPA routes must return the application shell for direct links and refreshes.
app.get(['/studio', '/history', '/comparisons', '/comparisons/:setId'], (req, res) => {
  res.sendFile(pathModule.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  // Warm the attributes cache on startup if enabled and refresh is true (Step 10)
  const enabledCache = process.env.ENABLED_CACHE_ATTRIBUTE_BUNDLE === 'true';
  const refreshCache = process.env.REFRESH_CACHE_ATTRIBUTE_BUNDLE === 'true';
  if (enabledCache && refreshCache) {
    getAttributesBundle().then(() => {
      console.log('[Bundle] Attributes cache warmed successfully.');
    }).catch(err => {
      console.error('[Bundle] Failed to warm cache on startup:', err);
    });
  } else {
    console.log(`[Bundle] Attributes cache warming skipped. Cache Enabled: ${enabledCache}, Refresh: ${refreshCache}`);
  }
  collectionManager.init().catch(err => {
    console.error('[Collections] Failed to initialize storage:', err);
  });
  comparisonOrchestrator.init().catch(err => {
    console.error('[Comparison] Failed to initialize storage:', err);
  });
});
