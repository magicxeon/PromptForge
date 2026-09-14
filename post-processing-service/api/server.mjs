import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { MediaPipeFaceDetector } from '../adapters/MediaPipeFaceDetector.mjs';
import { loadPostProcessingConfig } from '../config/serviceConfig.mjs';
import { createFacelessPrevis } from '../domain/facelessPrevis.mjs';
import { detectFaceLandmarks } from '../domain/faceLandmarks.mjs';

export async function createPostProcessingServer({
  config = loadPostProcessingConfig(),
  token = config.runtime.internalToken,
  detector = new MediaPipeFaceDetector({ modelPath: config.runtime.modelPath, policy: config.policy }),
  pilotEnabled = config.runtime.pilotEnabled,
  processingTimeoutMs = config.policy.processingTimeoutMs
} = {}) {
  if (!token || Buffer.byteLength(token) < 32) {
    throw new Error('POST_PROCESSING_INTERNAL_TOKEN must contain at least 32 bytes.');
  }
  if (pilotEnabled) await detector.initialize();
  else detector.unavailableReason = 'pilot_disabled';
  const policy = config.policy;
  const startTime = Date.now();
  let pending = 0;
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  let totalProcessingTimeMs = 0;
  let maxProcessingTimeMs = 0;

  const server = createServer(async (req, res) => {
    const reqStart = Date.now();
    try {
      if (req.method === 'GET' && (req.url === '/health' || req.url === '/v1/health')) {
        return json(res, 200, { service: 'post-processing', status: 'running' });
      }
      if (!sameToken(req.headers['x-post-processing-token'], token)) {
        return json(res, 401, { error: { code: 'unauthorized', message: 'Internal service authentication required.' } });
      }
      totalRequests += 1;
      if (req.method === 'GET' && req.url === '/v1/capabilities') {
        successfulRequests += 1;
        return json(res, 200, { apiVersion: '1', operations: {
          faceless_previs: { available: !detector.unavailableReason,
            reason: detector.unavailableReason, policyVersion: policy.policyVersion,
            modelHash: detector.unavailableReason ? null : policy.model.sha256,
            maxBytes: policy.maxInputBytes, maxPixels: policy.maxPixels, maxFaces: policy.maxFaces },
          face_landmarks: { available: !detector.unavailableReason,
            reason: detector.unavailableReason, policyVersion: policy.policyVersion,
            modelHash: detector.unavailableReason ? null : policy.model.sha256,
            maxBytes: policy.maxInputBytes, maxPixels: policy.maxPixels, maxFaces: policy.maxFaces }
        } });
      }
      if (req.method === 'GET' && req.url === '/v1/metrics') {
        successfulRequests += 1;
        const memory = process.memoryUsage();
        return json(res, 200, {
          service: 'post-processing',
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
          memoryUsage: {
            rssBytes: memory.rss,
            heapTotalBytes: memory.heapTotal,
            heapUsedBytes: memory.heapUsed,
            externalBytes: memory.external
          },
          requests: {
            total: totalRequests,
            successful: successfulRequests,
            failed: failedRequests,
            activePending: pending
          },
          performance: {
            avgProcessingTimeMs: successfulRequests > 0 ? Math.round(totalProcessingTimeMs / successfulRequests) : 0,
            maxProcessingTimeMs
          },
          capabilities: {
            faceless_previs: !detector.unavailableReason,
            face_landmarks: !detector.unavailableReason
          }
        });
      }
      if (req.method !== 'POST' || !['/v1/faceless-previs', '/v1/face-landmarks'].includes(req.url)) {
        failedRequests += 1;
        return json(res, 404, { error: { code: 'not_found', message: 'Route not found.' } });
      }
      if (detector.unavailableReason) {
        failedRequests += 1;
        return json(res, 503, { error: { code: 'face_model_unavailable', message: 'The face model is unavailable.' } });
      }
      if (pending >= policy.maxConcurrentRequests) {
        failedRequests += 1;
        return json(res, 429, { error: { code: 'processing_busy', message: 'Try again after current processing finishes.' } });
      }
      pending += 1;
      let timeout;
      try {
        const bytes = await readBounded(req, policy.maxInputBytes);
        const actualHash = createHash('sha256').update(bytes).digest('hex');
        if (req.headers['x-input-sha256'] !== actualHash) {
          failedRequests += 1;
          return json(res, 400, { error: { code: 'input_hash_mismatch', message: 'Input hash did not match.' } });
        }
        if (req.url === '/v1/face-landmarks') {
          const expectedFacesHeader = req.headers['x-expected-faces'];
          const expectedFaces = expectedFacesHeader ? Number(expectedFacesHeader) : undefined;
          const result = await Promise.race([
            detectFaceLandmarks(bytes, {
              detector,
              expectedFaces,
              policy
            }),
            new Promise((_, reject) => {
              timeout = setTimeout(() => reject(failure('processing_timeout', 'Processing timed out.', 504)), processingTimeoutMs);
            })
          ]);
          const duration = Date.now() - reqStart;
          successfulRequests += 1;
          totalProcessingTimeMs += duration;
          if (duration > maxProcessingTimeMs) maxProcessingTimeMs = duration;
          return json(res, 200, result);
        }

        const result = await Promise.race([
          createFacelessPrevis(bytes, {
            detector,
            expectedFaces: Number(req.headers['x-expected-faces']),
            policy
          }),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(failure('processing_timeout', 'Processing timed out.', 504)), processingTimeoutMs);
          })
        ]);
        const duration = Date.now() - reqStart;
        successfulRequests += 1;
        totalProcessingTimeMs += duration;
        if (duration > maxProcessingTimeMs) maxProcessingTimeMs = duration;

        return json(res, 200, {
          width: result.width,
          height: result.height,
          faceCount: result.faceCount,
          inputHash: result.inputHash,
          outputHash: result.outputHash,
          policyVersion: result.policyVersion,
          modelHash: policy.model.sha256,
          mimeType: 'image/png',
          bytesBase64: result.bytes.toString('base64')
        });
      } finally {
        clearTimeout(timeout);
        pending -= 1;
      }
    } catch (error) {
      failedRequests += 1;
      if (error.code === 'processing_timeout') {
        detector.unavailableReason = 'processing_timeout';
        await detector.close().catch(() => undefined);
      }
      if (res.headersSent) return res.end();
      return json(res, error.statusCode || 500, { error: {
        code: error.code || 'faceless_processing_failed',
        message: error.code ? error.message : 'Faceless processing failed.'
      } });
    }
  });
  server.on('close', () => { void detector.close(); });
  return server;
}

function sameToken(value, expected) {
  if (typeof value !== 'string') return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBounded(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw failure('faceless_input_size_invalid', 'Image exceeds the supported size.', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'private, no-store' });
  res.end(JSON.stringify(body));
}

function failure(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL('file:///' + process.argv[1].replace(/\\/g, '/')))) {
  const config = loadPostProcessingConfig();
  const server = await createPostProcessingServer({ config });
  server.listen(config.runtime.port, config.runtime.host, () => {
    console.log('Post-Processing API on http://' + config.runtime.host + ':' + config.runtime.port);
  });
}
