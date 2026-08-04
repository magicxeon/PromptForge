import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderFactory } from '../../providers/ProviderFactory.js';
import { collectionManager } from '../collections/CollectionManager.js';
import { dedupeResolvedReferenceImages, normalizeReferenceJobIds, resolveReferenceForProvider } from './referenceUtils.js';
import { mimeTypeFromFilename, resolveImageOutputType } from './imageUtils.js';
import { creditReservationService } from '../credits/CreditReservationService.js';
import { thumbnailService } from './thumbnailService.js';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';
import { characterCastingExportService } from '../character-profiles/CharacterCastingExportService.js';
import { characterUsageService } from '../character-profiles/CharacterUsageService.js';
import { logGenerationDiagnostic } from './generationDiagnostics.js';
import { templateCoreService } from '../templates/TemplateCoreService.js';

import { OUTPUTS_DIR } from '../../config/paths.js';

// Ensure directories exist
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
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

function createOrderedResolvedReferences(planEntries, resolvedBySlot) {
  if (!Array.isArray(planEntries) || !planEntries.length) return null;
  const seen = new Set();
  const ordered = [];
  for (const entry of planEntries) {
    const value = (entry?.slots || [])
      .map(slotId => resolvedBySlot[slotId])
      .find(Boolean);
    if (!value) continue;
    const fingerprint = String(value).includes(';base64,')
      ? String(value).split(';base64,').at(-1)
      : String(value);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    ordered.push(value);
  }
  return ordered;
}

function parseProviderDimensions(value) {
  const match = typeof value === 'string'
    ? value.match(/^(\d+)x(\d+)$/i)
    : null;
  return match
    ? { width: Number(match[1]), height: Number(match[2]) }
    : { width: null, height: null };
}

// Read local static output image and convert it back to base64
async function resolveLocalImageToBase64(imgPath) {
  if (!imgPath) return null;
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
    this.lifecycleSubscribers = new Set();
    this.concurrencyLimit = parseInt(process.env.MAX_CONCURRENT_GENERATIONS || '2', 10);
    
    // Init history file if not exists
    this.initHistory();
  }

  async initHistory() {
    await ensureDir(OUTPUTS_DIR);
    await historyRepository.init();
  }

  createJobId() {
    let jobId;
    do {
      jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    } while (this.jobs.has(jobId));
    return jobId;
  }

  /**
   * Enqueue a new generation job
   */
  enqueue(provider, submodel, prompt, options = {}) {
    const jobId = options.jobId || this.createJobId();
    if (this.jobs.has(jobId)) {
      throw new Error(`Generation job ID collision: ${jobId}`);
    }
    if (!options.reservationId || !options.payerUserId) {
      throw new Error('A credit reservation and payer are required before a generation job can be enqueued.');
    }
    const jobOptions = {
      ...options,
      submodel
    };
    const job = {
      id: jobId,
      status: 'queued',
      provider,
      submodel,
      prompt,
      options: jobOptions,
      result: null,
      error: null,
      created: Date.now(),
      listeners: []
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    
    logGenerationDiagnostic(job, 'enqueued', { queueLength: this.queue.length });
    this.processNext();
    
    return jobId;
  }

  subscribeLifecycle(listener) {
    this.lifecycleSubscribers.add(listener);
    return () => this.lifecycleSubscribers.delete(listener);
  }

  emitLifecycle(job, status, extra = {}) {
    this.lifecycleSubscribers.forEach(listener => {
      Promise.resolve(listener({ job, status, ...extra })).catch(error => {
        console.warn(`[Queue] Lifecycle listener failed for ${job.id}:`, error.message);
      });
    });
  }

  /**
   * Add SSE listener for a specific job
   */
  addListener(jobId, res, username = null) {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (username && job.options?.username && job.options.username !== username) return false;

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
        generationDuration: job.result.generationDuration,
        width: job.result.width || null,
        height: job.result.height || null
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
    this.emitLifecycle(job, 'processing');
    console.log(`[Queue] Processing job ${jobId}. Active jobs: ${this.activeCount}`);
    
    this.emitToListeners(jobId, 'status', { status: 'processing' });

    try {
      const providerInstance = ProviderFactory.getProvider(job.provider);
      const startTime = Date.now();

      // Resolve local /outputs/ files to base64 for API transmission
      const referenceAccess = { ownerUserId: job.options.payerUserId || null };
      const faceReferenceAccess = {
        ...referenceAccess,
        authorizedJobIds: job.options.authorizedFaceReferenceJobIds || []
      };
      const templateReferenceAccess = {
        ...referenceAccess,
        authorizedJobIds: job.options.authorizedTemplateReferenceJobIds || []
      };
      const resolvedTemplateBaseline = await resolveReferenceForProvider(
        job.options.templateBaselineReference,
        job.options.username,
        templateReferenceAccess
      );
      if (job.options.templateBaselineReference && !resolvedTemplateBaseline) {
        const error = new Error('The published Template baseline image is no longer available.');
        error.code = 'template_baseline_unavailable';
        throw error;
      }
      const resolvedFaceA = await resolveReferenceForProvider(
        job.options.faceReferenceImageA,
        job.options.username,
        faceReferenceAccess
      );
      const resolvedFaceB = await resolveReferenceForProvider(
        job.options.faceReferenceImageB,
        job.options.username,
        faceReferenceAccess
      );
      const resolvedStyleA = await resolveReferenceForProvider(job.options.styleReferenceImageA, job.options.username, referenceAccess);
      const resolvedStyleB = await resolveReferenceForProvider(job.options.styleReferenceImageB, job.options.username, referenceAccess);
      const characterReferenceAccess = {
        authorizedJobIds: job.options.authorizedCharacterReferenceJobIds || [],
        authorizedImageUrls: job.options.authorizedCharacterReferenceUrls || [],
        ownerUserId: job.options.payerUserId || null
      };
      const resolvedCharacterA = await resolveReferenceForProvider(
        job.options.characterReferenceImageA,
        job.options.username,
        characterReferenceAccess
      );
      const resolvedCharacterB = await resolveReferenceForProvider(
        job.options.characterReferenceImageB,
        job.options.username,
        characterReferenceAccess
      );
      if (job.options.characterProfileContext?.purpose === 'character_usage'
        && !resolvedCharacterA) {
        const error = new Error('The approved Character reference is no longer available.');
        error.code = 'character_reference_unavailable';
        throw error;
      }
      const resolvedOutfitFront = await resolveReferenceForProvider(job.options.outfitReferenceImageFront, job.options.username, referenceAccess);
      const resolvedOutfitBack = await resolveReferenceForProvider(job.options.outfitReferenceImageBack, job.options.username, referenceAccess);

      const uniqueReferences = dedupeResolvedReferenceImages([
        ['templateBaseline', resolvedTemplateBaseline],
        ['characterA', resolvedCharacterA],
        ['characterB', resolvedCharacterB],
        ['outfitFront', resolvedOutfitFront],
        ['outfitBack', resolvedOutfitBack],
        ['faceA', resolvedFaceA],
        ['faceB', resolvedFaceB],
        ['styleA', resolvedStyleA],
        ['styleB', resolvedStyleB]
      ]);

      // Mutate options to supply resolved base64 images to provider strategy
      job.options.resolvedTemplateBaselineReference = uniqueReferences.templateBaseline;
      job.options.resolvedFaceReferenceImageA = uniqueReferences.faceA;
      job.options.resolvedFaceReferenceImageB = uniqueReferences.faceB;
      job.options.resolvedStyleReferenceImageA = uniqueReferences.styleA;
      job.options.resolvedStyleReferenceImageB = uniqueReferences.styleB;
      job.options.resolvedCharacterReferenceImageA = uniqueReferences.characterA;
      job.options.resolvedCharacterReferenceImageB = uniqueReferences.characterB;
      job.options.resolvedOutfitReferenceImageFront = uniqueReferences.outfitFront;
      job.options.resolvedOutfitReferenceImageBack = uniqueReferences.outfitBack;
      job.options.resolvedReferenceImagesOrdered = createOrderedResolvedReferences(
        job.options.referenceProcessingPlan?.providerPlan?.orderedReferences,
        {
          template_baseline: resolvedTemplateBaseline,
          character_reference_a: resolvedCharacterA,
          character_reference_b: resolvedCharacterB,
          outfit_front: resolvedOutfitFront,
          outfit_back: resolvedOutfitBack,
          face_reference_a: resolvedFaceA,
          face_reference_b: resolvedFaceB,
          style_reference_a: resolvedStyleA,
          style_reference_b: resolvedStyleB,
          pose_reference_a: resolvedStyleA,
          pose_reference_b: resolvedStyleB
        }
      );

      logGenerationDiagnostic(job, 'provider_dispatch');
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
      job.outputFilePath = filePath;

      // Capture credit reservation on successful completion
      await creditReservationService.captureForJob({
        userId: job.options.payerUserId,
        reservationId: job.options.reservationId,
        jobId,
        metadata: {
          comparisonSetId: job.options.comparisonSetId,
          comparisonRunId: job.options.comparisonRunId
        }
      });
      job.creditCharged = true;

      // Only expose a completed output after its matching reservation is captured.
      const providerDimensions = parseProviderDimensions(
        result.providerMetadata?.responseSize
      );
      job.status = 'completed';
      job.result = {
        imageUrl: `/outputs/${filename}`,
        usage: result.usage,
        mimeType,
        generationDuration: durationSec,
        width: providerDimensions.width,
        height: providerDimensions.height
      };

      // Persist parent lineage and duration metadata to history database
      const historyEntry = {
        id: jobId,
        username: job.options.username,
        prompt: job.prompt,
        imageUrl: `/outputs/${filename}`,
        timestamp: Date.now(),
        provider: job.provider,
        submodel: job.submodel,
        mode: job.options.mode || null,
        selections: job.options.selections || {},
        sceneBuilder: job.options.sceneBuilder || null,
        sceneTemplateSnapshot: job.options.sceneTemplateSnapshot
          ? {
            ...job.options.sceneTemplateSnapshot,
            createdFromGenerationId: jobId,
            createdAt: Date.now()
          }
          : null,
        sourceOwnership: job.options.sourceOwnership || null,
        characterSheetConfig: job.options.characterSheetConfig || null,
        characterProfileContext: job.options.characterProfileContext || null,
        outfitReferenceOverrides: job.options.outfitReferenceOverrides || null,
        referenceRoleManifest: Array.isArray(job.options.referenceRoleManifest)
          ? job.options.referenceRoleManifest
          : [],
        referenceProcessingLineage: job.options.referenceProcessingLineage || null,
        storyReferenceHandoff: job.options.storyReferenceHandoff
          ? { ...job.options.storyReferenceHandoff, sourceJobId: jobId }
          : null,
        resolvedSubmodel: result.providerMetadata?.resolvedModel || job.submodel,
        providerConfigVersion: job.options.providerConfigVersion || null,
        creditCost: Number(job.options.pricingSnapshot?.estimatedCredits || 0),
        mimeType,
        width: providerDimensions.width,
        height: providerDimensions.height,
        usage: result.usage || null,
        referencedFaceJobIds: normalizeReferenceJobIds(job.options.faceReferenceJobIds),
        referencedStyleJobIds: normalizeReferenceJobIds(job.options.styleReferenceJobIds),
        referencedCharacterJobIds: normalizeReferenceJobIds(job.options.characterReferenceJobIds),
        referencedOutfitJobIds: normalizeReferenceJobIds(job.options.outfitReferenceJobIds),
        generationDuration: durationSec,
        comparisonSetId: job.options.comparisonSetId || null,
        comparisonRunId: job.options.comparisonRunId || null,
        comparisonSlotId: job.options.comparisonSlotId || null,
        templateUseContext: job.options.templateUseContext || null,
        fashionBlueprintContext: job.options.fashionBlueprintContext || null,
        routingSnapshot: job.options.routingSnapshot || null
      };
      const operationPurpose = job.options.routingSnapshot?.operationPurpose || null;
      historyEntry.operationPurpose = operationPurpose;
      historyEntry.artifactVisibility = operationPurpose === 'template_pose_proxy_prepare'
        ? 'template_owner_only'
        : 'customer';
      try {
        Object.assign(historyEntry, await thumbnailService.createForHistoryItem(historyEntry));
      } catch (thumbnailError) {
        console.warn(`[Queue] Thumbnail generation failed for ${jobId}:`, thumbnailError.message);
        historyEntry.thumbnailUrl = null;
      }
      job.result.width = historyEntry.width || providerDimensions.width;
      job.result.height = historyEntry.height || providerDimensions.height;
      await this.saveToHistory(historyEntry);
      await characterCastingExportService.handleCompletedGeneration({ job, historyEntry }).catch(error => {
        console.warn(`[Queue] Character casting linkage failed for ${jobId}:`, error.message);
      });
      await characterUsageService.handleCompletedGeneration({ job, historyEntry }).catch(error => {
        console.warn(`[Queue] Character usage linkage failed for ${jobId}:`, error.message);
      });
      if (job.options.templateUseContext?.templateUseSessionId) {
        await templateCoreService.recordSuccessfulUse({
          sessionId: job.options.templateUseContext.templateUseSessionId,
          jobId,
          pricingSnapshot: job.options.pricingSnapshot,
          outputCount: 1,
          replacementSummary: job.options.templateUseContext.replacementSummary || []
        }, {
          userId: job.options.payerUserId,
          username: job.options.username,
          role: 'user'
        }).catch(error => {
          console.warn(`[Queue] Template usage event failed for ${jobId}:`, error.message);
        });
      }

      let collectionWarning = null;
      if (historyEntry.artifactVisibility === 'customer') {
        try {
          await collectionManager.addToDefault(jobId, job.options.username || 'user_demo');
        } catch (collectionError) {
          collectionWarning = 'The image was saved, but it could not be added to the default collection.';
          console.warn(`[Queue] Default collection update failed for ${jobId}:`, collectionError.message);
        }
      }

      // Emit completed event with duration metadata
      this.emitToListeners(jobId, 'image_generation.completed', {
        type: 'image_generation.completed',
        imageUrl: `/outputs/${filename}`,
        usage: result.usage,
        mimeType,
        selections: job.options.selections || {},
        sceneBuilder: job.options.sceneBuilder || null,
        sceneTemplateSnapshot: historyEntry.sceneTemplateSnapshot || null,
        generationDuration: durationSec,
        width: historyEntry.width || null,
        height: historyEntry.height || null,
        collectionWarning
      });
      this.emitLifecycle(job, 'completed', { result: job.result });
      logGenerationDiagnostic(job, 'completed', {
        resolvedProviderSize: result.providerMetadata?.resolvedSize
          || result.providerMetadata?.responseSize
          || null,
        returnedWidth: historyEntry.width || providerDimensions.width,
        returnedHeight: historyEntry.height || providerDimensions.height,
        durationSeconds: durationSec
      });

    } catch (err) {
      console.error(`[Queue] Job ${jobId} failed:`, err);
      if (job.outputFilePath) {
        await fs.unlink(job.outputFilePath).catch(() => {});
        job.outputFilePath = null;
      }
      job.status = 'failed';
      job.error = normalizeJobError(err);

      // Refund reservation on failure (technical failure, moderation block, provider error)
      if (job.options.reservationId && !job.creditRefunded) {
        try {
          await creditReservationService.refundForJob({
            userId: job.options.payerUserId || job.options.username || 'usr_demo',
            reservationId: job.options.reservationId,
            jobId,
            reasonCode: job.error.code || 'technical_failure',
            metadata: {
              comparisonSetId: job.options.comparisonSetId,
              comparisonRunId: job.options.comparisonRunId
            }
          });
          job.creditRefunded = true;
        } catch (refundError) {
          console.error(`[Queue] Credit refund failed for ${jobId}:`, refundError.message);
        }
      }

      this.emitToListeners(jobId, 'job.failed', {
        ...job.error,
        creditRefunded: job.creditRefunded === true
      });
      this.emitLifecycle(job, 'failed', { error: job.error });
      logGenerationDiagnostic(job, 'failed', {
        errorCode: job.error.code || null
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
      await historyRepository.prepend(entry);
    } catch (err) {
      console.error('[Queue] Failed to save history:', err);
    }
  }

  /**
   * Delete entry from history and remove associated file
   */
  async deleteHistoryEntry(jobId) {
    try {
      const entry = await historyRepository.removeById(jobId);
      if (entry) {
        const filename = historyRepository.getOutputFilename(entry);
        if (filename) {
          const filePath = path.join(OUTPUTS_DIR, filename);
          await fs.unlink(filePath).catch(e => console.warn(`[Queue] Image file not found for deletion: ${filePath}`, e));
        }
        await thumbnailService.removeForHistoryItem(entry).catch(thumbnailError => {
          console.warn(`[Queue] Thumbnail cleanup failed for ${jobId}:`, thumbnailError.message);
        });
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

  async deleteHistoryEntryForUser(jobId, username) {
    const entry = await this.getHistoryEntryForUser(jobId, username);
    if (!entry) return false;
    return this.deleteHistoryEntry(jobId);
  }

  /**
   * Get all history records
   */
  async getHistory() {
    return historyRepository.readAll();
  }

  async getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      return {
        id: job.id,
        status: job.status,
        result: job.result,
        error: job.error,
        creditCost: Number(job.options.pricingSnapshot?.estimatedCredits || 0),
        creditCharged: job.creditCharged === true,
        creditRefunded: job.creditRefunded === true
      };
    }

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
        generationDuration: completed.generationDuration || null,
        width: completed.width || null,
        height: completed.height || null
      },
      error: null,
      recoveredFromHistory: true
    };
  }

  async getJobStatusForUser(jobId, username) {
    const job = this.jobs.get(jobId);
    if (job && job.options?.username && username && job.options.username !== username) {
      return null;
    }

    const status = await this.getJobStatus(jobId);
    if (!status) return null;

    if (status.recoveredFromHistory) {
      const entry = await this.getHistoryEntryForUser(jobId, username);
      return entry ? status : null;
    }

    return status;
  }

  async getHistoryEntryForUser(jobId, username) {
    const history = await this.getHistory();
    const entry = history.find(item => item.id === jobId);
    if (!entry) return null;
    if (!username) return entry;
    if (!entry.username) return username === 'user_demo' ? entry : null;
    return entry.username === username ? entry : null;
  }
}

export const queueManager = new QueueManager();
