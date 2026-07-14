import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderFactory } from './providers/ProviderFactory.js';
import { collectionManager } from './collectionManager.js';
import { dedupeResolvedReferenceImages, normalizeReferenceJobIds } from './referenceUtils.js';
import { mimeTypeFromFilename, resolveImageOutputType } from './imageUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUTS_DIR = path.join(__dirname, '../client/outputs');
const HISTORY_FILE = path.join(__dirname, 'history.json');
const DB_PATH = path.join(__dirname, 'database.json');

// Ensure directories exist
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Helper to deduct credit from database
async function deductUserCredit(username, amount = 1) {
  try {
    const dbData = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbData);
    const user = db.users[username];
    if (!user) throw new Error('User not found');
    if (user.credits < amount) throw new Error('Insufficient credits');
    user.credits -= amount;
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return user.credits;
  } catch (err) {
    console.error(`[Queue] Credit deduction error for ${username}:`, err.message);
    throw err;
  }
}

// Refund a failed moderation job once; the caller owns idempotency per job.
async function refundUserCredit(username, amount = 1) {
  const dbData = await fs.readFile(DB_PATH, 'utf-8');
  const db = JSON.parse(dbData);
  const user = db.users[username];
  if (!user) throw new Error('User not found');
  user.credits += amount;
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
  return user.credits;
}

function normalizeJobError(error) {
  return {
    provider: error.provider || null,
    type: error.type || null,
    code: error.code || null,
    message: error.message || 'Generation failed',
    requestId: error.requestId || null,
    safetyViolations: Array.isArray(error.safetyViolations)
      ? error.safetyViolations
      : [],
    retryable: error.retryable === true
  };
}

// Read local static output image and convert it back to base64 (Step 9)
async function resolveLocalImageToBase64(imgPath) {
  if (!imgPath) return null;
  // If it's already a base64 string, return it
  if (!imgPath.startsWith('/outputs/')) {
    return imgPath;
  }
  
  try {
    const filename = path.basename(imgPath);
    const filePath = path.join(OUTPUTS_DIR, filename);
    const fileBuffer = await fs.readFile(filePath);
    return `data:${mimeTypeFromFilename(filename)};base64,${fileBuffer.toString('base64')}`;
  } catch (err) {
    console.error(`[Queue] Failed to resolve local image path ${imgPath}:`, err.message);
    return null;
  }
}

class QueueManager {
  constructor() {
    this.jobs = new Map(); // jobId -> JobObject
    this.queue = [];       // Array of pending jobIds
    this.activeCount = 0;
    this.concurrencyLimit = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '2', 10);
    
    // Init history file if not exists
    this.initHistory();
  }

  async initHistory() {
    await ensureDir(OUTPUTS_DIR);
    try {
      await fs.access(HISTORY_FILE);
    } catch {
      await fs.writeFile(HISTORY_FILE, '[]', 'utf-8');
    }
  }

  /**
   * Enqueue a new generation job
   */
  enqueue(provider, submodel, prompt, options = {}) {
    const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const job = {
      id: jobId,
      status: 'queued',
      provider,
      submodel,
      prompt,
      options,
      result: null,
      error: null,
      created: Date.now(),
      listeners: []
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    
    console.log(`[Queue] Job ${jobId} enqueued. Queue length: ${this.queue.length}`);
    this.processNext();
    
    return jobId;
  }

  /**
   * Add SSE listener for a specific job
   */
  addListener(jobId, res) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // If job has already completed/failed, notify client and end immediately
    if (job.status === 'completed') {
      res.write(`event: image_generation.completed\ndata: ${JSON.stringify({
        type: 'image_generation.completed',
        imageUrl: job.result.imageUrl,
        usage: job.result.usage,
        mimeType: job.result.mimeType,
        generationDuration: job.result.generationDuration
      })}\n\n`);
      res.end();
      return true;
    } else if (job.status === 'failed') {
      res.write(`event: job.failed\ndata: ${JSON.stringify(job.error)}\n\n`);
      res.end();
      return true;
    }

    // Keep connection alive
    const keepAliveTimer = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15000);

    job.listeners.push({ res, keepAliveTimer });
    return true;
  }

  /**
   * Remove SSE listener
   */
  removeListener(jobId, res) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const index = job.listeners.findIndex(l => l.res === res);
    if (index !== -1) {
      clearInterval(job.listeners[index].keepAliveTimer);
      job.listeners.splice(index, 1);
    }
  }

  /**
   * Send SSE event to all connected listeners of a job
   */
  emitToListeners(jobId, eventName, data) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.listeners.forEach(({ res }) => {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    });
  }

  /**
   * Process next job in queue if concurrency allows
   */
  async processNext() {
    if (this.activeCount >= this.concurrencyLimit) {
      return;
    }
    if (this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.activeCount++;
    job.status = 'processing';
    console.log(`[Queue] Processing job ${jobId}. Active jobs: ${this.activeCount}`);
    
    this.emitToListeners(jobId, 'status', { status: 'processing' });

    try {
      const providerInstance = ProviderFactory.getProvider(job.provider);
      
      // Deduct credit at the start of actual processing to prevent abuse
      const creditCost = Number(job.options.creditCost || 1);
      await deductUserCredit(job.options.username || 'user_demo', creditCost);

      const startTime = Date.now();

      // Resolve local /outputs/ files to base64 for API transmission (Step 9)
      const resolvedFaceA = await resolveLocalImageToBase64(job.options.faceReferenceImageA);
      const resolvedFaceB = await resolveLocalImageToBase64(job.options.faceReferenceImageB);
      const resolvedStyleA = await resolveLocalImageToBase64(job.options.styleReferenceImageA);
      const resolvedStyleB = await resolveLocalImageToBase64(job.options.styleReferenceImageB);
      const resolvedCharacterA = await resolveLocalImageToBase64(job.options.characterReferenceImageA);
      const resolvedCharacterB = await resolveLocalImageToBase64(job.options.characterReferenceImageB);

      const uniqueReferences = dedupeResolvedReferenceImages([
        ['characterA', resolvedCharacterA],
        ['characterB', resolvedCharacterB],
        ['faceA', resolvedFaceA],
        ['faceB', resolvedFaceB],
        ['styleA', resolvedStyleA],
        ['styleB', resolvedStyleB]
      ]);

      // Mutate options to supply resolved base64 images to provider strategy
      job.options.resolvedFaceReferenceImageA = uniqueReferences.faceA;
      job.options.resolvedFaceReferenceImageB = uniqueReferences.faceB;
      job.options.resolvedStyleReferenceImageA = uniqueReferences.styleA;
      job.options.resolvedStyleReferenceImageB = uniqueReferences.styleB;
      job.options.resolvedCharacterReferenceImageA = uniqueReferences.characterA;
      job.options.resolvedCharacterReferenceImageB = uniqueReferences.characterB;

      let result;
      if (job.options.stream) {
        result = await providerInstance.generateImageStream(job.prompt, job.options, (eventObj) => {
          const providerOwnedTerminalEvents = new Set([
            'error',
            'image_generation.failed',
            'image_edit.failed',
            'image_generation.completed',
            'image_edit.completed'
          ]);

          if (!providerOwnedTerminalEvents.has(eventObj.event)) {
            this.emitToListeners(jobId, eventObj.event, eventObj.data);
          }
        });
      } else {
        result = await providerInstance.generateImage(job.prompt, job.options);
      }

      // Calculate generation duration
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

      // Save output file to static assets
      await ensureDir(OUTPUTS_DIR);
      const { mimeType, extension } = resolveImageOutputType(result);
      const filename = `${jobId}.${extension}`;
      const filePath = path.join(OUTPUTS_DIR, filename);
      await fs.writeFile(filePath, Buffer.from(result.base64, 'base64'));

      // Update job state
      job.status = 'completed';
      job.result = {
        imageUrl: `/outputs/${filename}`,
        usage: result.usage,
        mimeType,
        generationDuration: durationSec
      };
      
      // Persist parent lineage and duration metadata to history database (Step 9)
      await this.saveToHistory({
        id: jobId,
        prompt: job.prompt,
        imageUrl: `/outputs/${filename}`,
        timestamp: Date.now(),
        provider: job.provider,
        submodel: job.submodel,
        resolvedSubmodel: result.providerMetadata?.resolvedModel || job.submodel,
        providerConfigVersion: job.options.providerConfigVersion || null,
        creditCost,
        mimeType,
        usage: result.usage || null,
        referencedFaceJobIds: normalizeReferenceJobIds(job.options.faceReferenceJobIds),
        referencedStyleJobIds: normalizeReferenceJobIds(job.options.styleReferenceJobIds),
        referencedCharacterJobIds: normalizeReferenceJobIds(job.options.characterReferenceJobIds),
        generationDuration: durationSec
      });

      let collectionWarning = null;
      try {
        await collectionManager.addToDefault(jobId);
      } catch (collectionError) {
        collectionWarning = 'The image was saved, but it could not be added to the default collection.';
        console.warn(`[Queue] Default collection update failed for ${jobId}:`, collectionError.message);
      }

      // Emit completed event with duration metadata
      this.emitToListeners(jobId, 'image_generation.completed', {
        type: 'image_generation.completed',
        imageUrl: `/outputs/${filename}`,
        usage: result.usage,
        mimeType,
        generationDuration: durationSec,
        collectionWarning
      });

    } catch (err) {
      console.error(`[Queue] Job ${jobId} failed:`, err);
      job.status = 'failed';
      job.error = normalizeJobError(err);

      if (
        job.error.code === 'moderation_blocked' &&
        !job.creditRefunded
      ) {
        try {
          job.refundedCredits = await refundUserCredit(
            job.options.username || 'user_demo',
            Number(job.options.creditCost || 1)
          );
          job.creditRefunded = true;
        } catch (refundError) {
          console.error(
            `[Queue] Credit refund failed for ${jobId}:`,
            refundError.message
          );
        }
      }

      this.emitToListeners(jobId, 'job.failed', {
        ...job.error,
        creditRefunded: job.creditRefunded === true
      });
    } finally {
      // Close all SSE connections
      job.listeners.forEach(({ res, keepAliveTimer }) => {
        clearInterval(keepAliveTimer);
        res.end();
      });
      job.listeners = [];

      this.activeCount--;
      console.log(`[Queue] Job ${jobId} finished. Active jobs: ${this.activeCount}`);
      this.processNext();
    }
  }

  /**
   * Save successful generation record to history.json
   */
  async saveToHistory(entry) {
    try {
      const dataStr = await fs.readFile(HISTORY_FILE, 'utf-8');
      const history = JSON.parse(dataStr);
      history.unshift(entry); // add to top
      await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Queue] Failed to save history:', err);
    }
  }

  /**
   * Delete entry from history and remove associated file
   */
  async deleteHistoryEntry(jobId) {
    try {
      const dataStr = await fs.readFile(HISTORY_FILE, 'utf-8');
      const history = JSON.parse(dataStr);
      const entryIdx = history.findIndex(item => item.id === jobId);
      
      if (entryIdx !== -1) {
        const entry = history[entryIdx];
        
        // Remove image file from disk
        const filename = path.basename(entry.imageUrl);
        const filePath = path.join(OUTPUTS_DIR, filename);
        await fs.unlink(filePath).catch(e => console.warn(`[Queue] Image file not found for deletion: ${filePath}`, e));
        
        // Remove from database
        history.splice(entryIdx, 1);
        await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
        try {
          await collectionManager.removeJobEverywhere(jobId);
        } catch (collectionError) {
          console.warn(`[Queue] Collection cleanup failed for ${jobId}:`, collectionError.message);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Queue] Delete history failed:', err);
      return false;
    }
  }

  /**
   * Get all history records
   */
  async getHistory() {
    try {
      const dataStr = await fs.readFile(HISTORY_FILE, 'utf-8');
      return JSON.parse(dataStr);
    } catch (err) {
      return [];
    }
  }

  async getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      return {
        id: job.id,
        status: job.status,
        result: job.result,
        error: job.error
      };
    }

    // Completed jobs survive process restarts in history even though the
    // current queue implementation still keeps active jobs in memory.
    const history = await this.getHistory();
    const completed = history.find(entry => entry.id === jobId);
    if (!completed) return null;

    return {
      id: completed.id,
      status: 'completed',
      result: {
        imageUrl: completed.imageUrl,
        usage: completed.usage || null,
        mimeType: completed.mimeType || null,
        generationDuration: completed.generationDuration || null
      },
      error: null,
      recoveredFromHistory: true
    };
  }
}

export const queueManager = new QueueManager();
