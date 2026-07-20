import { promises as fs } from 'fs';
import path from 'path';
import { historyRepository } from '../../repositories/generation/HistoryRepository.js';

import { OUTPUTS_DIR } from '../../config/paths.js';

export function normalizeReferenceJobIds(ids, maxItems = 2) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))]
    .slice(0, maxItems);
}

function referenceImageFingerprint(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dataUrlMarker = ';base64,';
  const markerIndex = trimmed.indexOf(dataUrlMarker);
  return markerIndex >= 0 ? trimmed.slice(markerIndex + dataUrlMarker.length) : trimmed;
}

// Preserve role priority while ensuring identical image bytes reach a provider once.
export function dedupeResolvedReferenceImages(entries) {
  const seen = new Set();
  const result = {};

  entries.forEach(([key, value]) => {
    const fingerprint = referenceImageFingerprint(value);
    if (!fingerprint || seen.has(fingerprint)) {
      result[key] = null;
      return;
    }
    seen.add(fingerprint);
    result[key] = value;
  });

  return result;
}

export function isBase64Reference(value) {
  if (typeof value !== 'string') return false;
  return value.trim().startsWith('data:image/');
}

export function isHistoryReference(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('/outputs/') || trimmed.startsWith('job_');
}

export function normalizeReferenceValue(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    const imageUrl = value.imageUrl || null;
    let jobId = value.jobId || null;
    let source = value.source || 'upload';

    if (!value.source) {
      if (jobId && jobId.startsWith('job_')) {
        source = 'history';
      } else if (imageUrl && (imageUrl.startsWith('/outputs/') || imageUrl.includes('job_'))) {
        source = 'history';
      }
    }

    if (source === 'history' && !jobId && imageUrl) {
      const outputMatch = imageUrl.match(/\/outputs\/(job_[a-zA-Z0-9_-]+)\.[a-zA-Z0-9]+/);
      if (outputMatch) {
        jobId = outputMatch[1];
      } else if (imageUrl.startsWith('job_')) {
        jobId = imageUrl.split('.')[0];
      }
    }

    return {
      source,
      jobId,
      imageUrl,
      referenceId: value.referenceId || null
    };
  }
  if (isBase64Reference(value)) {
    return {
      source: 'upload',
      jobId: null,
      imageUrl: null,
      referenceId: null
    };
  }
  if (isHistoryReference(value)) {
    const trimmed = value.trim();
    let jobId = null;
    const outputMatch = trimmed.match(/\/outputs\/(job_[a-zA-Z0-9_-]+)\.[a-zA-Z0-9]+/);
    if (outputMatch) {
      jobId = outputMatch[1];
    } else if (trimmed.startsWith('job_')) {
      jobId = trimmed.split('.')[0];
    }
    return {
      source: 'history',
      jobId,
      imageUrl: trimmed.startsWith('/outputs/') ? trimmed : `/outputs/${jobId}.png`,
      referenceId: null
    };
  }
  return {
    source: 'external',
    jobId: null,
    imageUrl: String(value),
    referenceId: null
  };
}

export async function resolveReferenceForProvider(value, username) {
  if (!value) return null;
  
  // Accept ReferenceValue objects or raw strings
  const norm = normalizeReferenceValue(value);
  if (!norm) return null;

  // 1. If it's a legacy base64 upload
  if (norm.source === 'upload' && typeof value === 'string' && isBase64Reference(value)) {
    return value;
  }

  // 2. If it's a history reference
  if (norm.source === 'history' && norm.jobId) {
    const historyItem = await historyRepository.getById(norm.jobId);
    if (historyItem) {
      // Validate ownership (Phase 5 Security Check)
      if (historyItem.username && historyItem.username !== username) {
        console.warn(`[Reference Resolution] Ownership mismatch: job ${norm.jobId} belongs to ${historyItem.username}, requested by ${username}`);
        return null; // Reject access
      }
      
      // Resolve the actual file path on disk
      const filename = path.basename(historyItem.imageUrl || `${norm.jobId}.png`);
      const filePath = path.join(OUTPUTS_DIR, filename);
      try {
        const fileBuffer = await fs.readFile(filePath);
        const mimeType = mimeTypeFromFilename(filename);
        return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
      } catch (err) {
        console.error(`[Reference Resolution] Failed to read resolved file ${filePath}:`, err.message);
        return null;
      }
    }
  }

  // 3. Fallback to raw legacy path resolution (e.g. startup/test fixtures)
  if (typeof value === 'string' && value.startsWith('/outputs/')) {
    const filename = path.basename(value);
    const isFixture = filename.startsWith('fixture_') || filename.startsWith('test_');
    if (!isFixture) {
      return null; // Block raw bypass of history ownership check
    }
    try {
      const filePath = path.join(OUTPUTS_DIR, filename);
      const fileBuffer = await fs.readFile(filePath);
      const mimeType = mimeTypeFromFilename(filename);
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    } catch (err) {
      console.error(`[Reference Resolution] Legacy fallback failed for ${value}:`, err.message);
      return null;
    }
  }

  return null;
}

export function stripEmbeddedReferenceDataFromSnapshot(snapshot) {
  if (!snapshot) return snapshot;

  function deepSanitize(val) {
    if (typeof val === 'string') {
      if (val.trim().startsWith('data:image/')) {
        return null;
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(deepSanitize);
    }
    if (val !== null && typeof val === 'object') {
      const result = {};
      Object.keys(val).forEach(key => {
        result[key] = deepSanitize(val[key]);
      });
      return result;
    }
    return val;
  }

  return deepSanitize(snapshot);
}

function mimeTypeFromFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}
