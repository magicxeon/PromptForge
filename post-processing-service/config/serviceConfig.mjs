import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultPolicyPath = path.join(serviceRoot, 'config', 'policy.json');
const defaultEnvPath = path.join(serviceRoot, '.env');

export function loadPostProcessingPolicy({ policyPath = defaultPolicyPath } = {}) {
  let policy;
  try {
    policy = JSON.parse(readFileSync(policyPath, 'utf8'));
  } catch (error) {
    throw new Error('Post-Processing policy could not be read: ' + error.message);
  }
  validatePolicy(policy);
  return policy.facelessPrevis;
}

export function loadPostProcessingConfig({ env = process.env, envFilePath = defaultEnvPath,
  policyPath = defaultPolicyPath } = {}) {
  let fileEnv = {};
  try {
    fileEnv = dotenv.parse(readFileSync(envFilePath));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const values = { ...fileEnv, ...env };
  const pilotValue = values.POST_PROCESSING_PILOT_ENABLED ?? 'false';
  if (!['true', 'false'].includes(pilotValue)) {
    throw new Error('POST_PROCESSING_PILOT_ENABLED must be true or false.');
  }
  const host = values.POST_PROCESSING_HOST || '127.0.0.1';
  if (host !== '127.0.0.1') {
    throw new Error('POST_PROCESSING_HOST must remain 127.0.0.1 during the private pilot.');
  }
  const port = integer(values.POST_PROCESSING_PORT ?? '6501', 'POST_PROCESSING_PORT', 1, 65535);
  const policy = loadPostProcessingPolicy({ policyPath });
  const modelPath = values.POST_PROCESSING_FACE_MODEL_PATH
    ? path.resolve(serviceRoot, values.POST_PROCESSING_FACE_MODEL_PATH)
    : path.join(serviceRoot, 'models', policy.model.fileName);
  return {
    runtime: {
      host,
      port,
      pilotEnabled: pilotValue === 'true',
      internalToken: values.POST_PROCESSING_INTERNAL_TOKEN,
      modelPath
    },
    policy
  };
}

export function validatePolicy(document) {
  if (!document || document.schemaVersion !== 1 || !document.facelessPrevis) {
    throw new Error('Post-Processing policy schemaVersion must be 1.');
  }
  const p = document.facelessPrevis;
  if (typeof p.policyVersion !== 'string' || !/^[a-z0-9-]+-v\d+$/.test(p.policyVersion)) {
    throw new Error('Faceless policyVersion is invalid.');
  }
  integer(p.maxInputBytes, 'maxInputBytes', 1, 100 * 1024 * 1024);
  integer(p.maxPixels, 'maxPixels', 1, 100_000_000);
  integer(p.maxFaces, 'maxFaces', 1, 8);
  integer(p.maxConcurrentRequests, 'maxConcurrentRequests', 1, 32);
  integer(p.processingTimeoutMs, 'processingTimeoutMs', 1, 300_000);
  integer(p.minFaceRadiusX, 'minFaceRadiusX', 1, 1000);
  integer(p.minFaceRadiusY, 'minFaceRadiusY', 1, 1000);
  if (!p.detector || p.detector.numFaces !== p.maxFaces) {
    throw new Error('Detector numFaces must match maxFaces.');
  }
  for (const key of ['minFaceDetectionConfidence', 'minFacePresenceConfidence']) {
    number(p.detector[key], key, 0, 1);
  }
  const m = p.mask;
  if (!m || !/^#[0-9a-fA-F]{6}$/.test(m.fill || '')
    || !/^#[0-9a-fA-F]{6}$/.test(m.guideStroke || '')) {
    throw new Error('Faceless mask colors must be six-digit hex values.');
  }
  for (const key of ['guideWidth', 'radiusXScale', 'radiusYScale', 'guideHeightScale']) {
    number(m[key], key, 0.01, 5);
  }
  number(m.guideOpacity, 'guideOpacity', 0, 1);
  if (!p.model || !/^[a-z0-9_.-]+\.task$/.test(p.model.fileName || '')
    || !/^[a-f0-9]{64}$/.test(p.model.sha256 || '')
    || !p.model.downloadUrl?.startsWith('https://')) {
    throw new Error('Faceless model artifact configuration is invalid.');
  }
  integer(p.model.maxDownloadBytes, 'maxDownloadBytes', 1, 100 * 1024 * 1024);
  integer(p.model.downloadTimeoutMs, 'downloadTimeoutMs', 1, 120_000);
  if (p.model.maxDownloadBytes > p.maxInputBytes) {
    throw new Error('Model download bound must not exceed service input bound.');
  }
}

function integer(value, name, min, max) {
  const validType = typeof value === 'number'
    || (name === 'POST_PROCESSING_PORT' && typeof value === 'string' && /^\d+$/.test(value));
  const parsed = Number(value);
  if (!validType || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(name + ' must be an integer from ' + min + ' to ' + max + '.');
  }
  return parsed;
}

function number(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(name + ' must be a number from ' + min + ' to ' + max + '.');
  }
}
