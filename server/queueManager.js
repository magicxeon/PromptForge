import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderFactory } from './providers/ProviderFactory.js';

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
async function deductUserCredit(username) {
  try {
    const dbData = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(dbData);
    const user = db.users[username];
    if (!user) throw new Error('User not found');
    if (user.credits <= 0) throw new Error('Insufficient credits');
    user.credits -= 1;
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return user.credits;
  } catch (err) {
    console.error(`[Queue] Credit deduction error for ${username}:`, err.message);
    throw err;
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
      res.write(`event: image_generation.completed\ndata: ${JSON.stringify({ type: 'image_generation.completed', b64_json: job.result.base64, usage: job.result.usage })}\n\n`);
      res.end();
      return true;
    } else if (job.status === 'failed') {
      res.write(`event: error\ndata: ${JSON.stringify({ error: job.error })}\n\n`);
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
      await deductUserCredit(job.options.username || 'user_demo');

      let result;
      if (job.options.stream) {
        // Run with stream events proxying to listeners
        result = await providerInstance.generateImageStream(job.prompt, job.options, (eventObj) => {
          this.emitToListeners(jobId, eventObj.event, eventObj.data);
        });
      } else {
        // Run standard sync call
        result = await providerInstance.generateImage(job.prompt, job.options);
      }

      // Save output file to static assets
      await ensureDir(OUTPUTS_DIR);
      const filename = `${jobId}.png`;
      const filePath = path.join(OUTPUTS_DIR, filename);
      await fs.writeFile(filePath, Buffer.from(result.base64, 'base64'));

      // Update job state
      job.status = 'completed';
      job.result = {
        imageUrl: `/outputs/${filename}`,
        usage: result.usage
      };
      
      // Persist to history database
      await this.saveToHistory({
        id: jobId,
        prompt: job.prompt,
        imageUrl: `/outputs/${filename}`,
        timestamp: Date.now(),
        provider: job.provider,
        submodel: job.submodel
      });

      // Emit completed event
      this.emitToListeners(jobId, 'image_generation.completed', {
        type: 'image_generation.completed',
        imageUrl: `/outputs/${filename}`,
        usage: result.usage
      });

    } catch (err) {
      console.error(`[Queue] Job ${jobId} failed:`, err);
      job.status = 'failed';
      job.error = err.message;
      this.emitToListeners(jobId, 'error', { error: err.message });
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

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error
    };
  }
}

export const queueManager = new QueueManager();
