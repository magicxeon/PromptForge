import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadPostProcessingConfig, loadPostProcessingPolicy } from '../config/serviceConfig.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const origin = 'http://faceless-previs.internal';
export class MediaPipeFaceDetector {
  constructor({
    modelPath = loadPostProcessingConfig().runtime.modelPath,
    policy = loadPostProcessingPolicy(),
    browserType = chromium
  } = {}) {
    this.modelPath = modelPath;
    this.policy = policy;
    this.browserType = browserType;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentInput = null;
    this.unavailableReason = 'not_initialized';
    this.pending = Promise.resolve();
  }

  async initialize() {
    if (this.page) return true;
    if (!existsSync(this.modelPath)) {
      this.unavailableReason = 'model_missing';
      return false;
    }
    if (!existsSync(this.browserType.executablePath())) {
      this.unavailableReason = 'chromium_missing';
      return false;
    }
    const model = await readFile(this.modelPath);
    if (createHash('sha256').update(model).digest('hex') !== this.policy.model.sha256) {
      this.unavailableReason = 'model_hash_mismatch';
      return false;
    }
    this.model = model;
    try {
      this.browser = await this.browserType.launch({ headless: true });
      this.context = await this.browser.newContext({ serviceWorkers: 'block' });
      await this.context.route('**/*', route => {
        if (new URL(route.request().url()).origin !== origin) return route.abort();
        return this.#serveModelAsset(route);
      });
      this.page = await this.context.newPage();
      await this.page.goto(origin + '/', { waitUntil: 'load' });
      await this.page.evaluate(async detectorOptions => {
        const { FaceLandmarker, FilesetResolver } = await import('/vision_bundle.mjs');
        const fileset = await FilesetResolver.forVisionTasks('/wasm');
        window.faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/model', delegate: 'CPU' },
          runningMode: 'IMAGE',
          numFaces: detectorOptions.numFaces,
          minFaceDetectionConfidence: detectorOptions.minFaceDetectionConfidence,
          minFacePresenceConfidence: detectorOptions.minFacePresenceConfidence
        });
      }, this.policy.detector);
      this.unavailableReason = null;
      return true;
    } catch {
      await this.close();
      this.unavailableReason = 'model_initialization_failed';
      return false;
    }
  }

  async detect(imageBytes) {
    if (!this.page) throw serviceError('face_model_unavailable', 'Face detector is unavailable.', 503);
    const run = this.pending.then(async () => {
      this.currentInput = imageBytes;
      try {
        return await this.page.evaluate(async () => {
          const response = await fetch('/input', { cache: 'no-store' });
          if (!response.ok) throw new Error('Input unavailable');
          const image = await createImageBitmap(await response.blob());
          try {
            const result = window.faceLandmarker.detect(image);
            return result.faceLandmarks.map(face => face.map(point => ({
              x: point.x, y: point.y, z: point.z
            })));
          } finally {
            image.close();
          }
        });
      } finally {
        this.currentInput = null;
      }
    });
    this.pending = run.catch(() => undefined);
    return run;
  }

  async #serveModelAsset(route) {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' });
    }
    if (pathname === '/model') {
      return route.fulfill({ contentType: 'application/octet-stream', body: this.model });
    }
    if (pathname === '/input' && this.currentInput) {
      return route.fulfill({ contentType: 'image/png', body: this.currentInput });
    }
    const packageRoot = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
    const relative = pathname === '/vision_bundle.mjs' ? 'vision_bundle.mjs'
      : /^\/wasm\/vision_wasm_(?:nosimd_)?internal\.(?:js|wasm)$/.test(pathname)
        ? pathname.slice(1) : null;
    if (!relative) return route.fulfill({ status: 404, body: '' });
    const bytes = await readFile(path.join(packageRoot, relative));
    return route.fulfill({
      contentType: relative.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
      body: bytes
    });
  }

  async close() {
    await this.page?.close().catch(() => undefined);
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}

function serviceError(code, message, statusCode) {
  return Object.assign(new Error(message), { code, statusCode });
}
