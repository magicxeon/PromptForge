import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { OUTPUTS_DIR } from '../../config/paths.js';
import { getMediaExportConfig } from '../../config/mediaExports.js';
import { renderImageExport } from './imageExportRenderer.js';
import { renderComparisonExport } from './comparisonExportRenderer.js';
import { COMPARISON_LAYOUT_VERSION, COMPARISON_EXPORT_LIMITS } from './comparisonExportLayout.js';

export class MediaExportService {
  constructor({ generationSources, comparisons, config = getMediaExportConfig(), outputRoot = OUTPUTS_DIR, renderer = renderImageExport, comparisonRenderer = renderComparisonExport }) {
    Object.assign(this, { generationSources, comparisons, config, outputRoot, renderer, comparisonRenderer });
    this.active = new Set();
  }
  async export(input, actor, signal) {
    if (!actor?.userId) throw error('actor_required', 401);
    if (this.active.has(actor.userId) || this.active.size >= this.config.maxActive) throw error('export_busy', 429);
    if (!input || Object.keys(input).some(key => !['kind', 'jobId', 'setId', 'runId', 'layout', 'outputIds', 'format', 'size', 'locale'].includes(key))
      || !['look_sheet', 'comparison'].includes(input.kind)) throw error('export_request_invalid', 400);
    const allowed = input.kind === 'look_sheet' ? ['kind', 'jobId'] : ['kind', 'setId', 'runId', 'layout', 'outputIds', 'format', 'size', 'locale'];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw error('export_request_invalid', 400);
    this.active.add(actor.userId);
    try {
      const started = Date.now();
      const check = () => { if (signal?.aborted) throw error('export_cancelled', 499); if (Date.now() - started > this.config.timeoutSeconds * 1000) throw error('export_timeout', 503); };
      check();
      let sources, snapshot = null, layout = 'stacked';
      if (input.kind === 'look_sheet') {
        if (typeof input.jobId !== 'string' || input.jobId.length > 160) throw error('export_request_invalid', 400);
        const source = await this.generationSources.getOwnedImage(input.jobId, actor);
        snapshot = source.lookSheetSnapshot;
        if (snapshot?.presetId !== 'character-document-sheet' || snapshot.schemaVersion !== 1
          || ![1, 2].includes(snapshot.presetVersion)) throw error('export_source_unavailable', 404);
        sources = [source];
      } else {
        if (typeof input.setId !== 'string' || typeof input.runId !== 'string'
          || input.setId.length > 160 || input.runId.length > 160
          || !['auto', 'stacked', 'side_by_side'].includes(input.layout || 'auto')
          || !['png', 'jpeg'].includes(input.format || 'png') || !['standard', 'high'].includes(input.size || 'standard')
          || !['en', 'th'].includes(input.locale || 'en')) throw error('export_request_invalid', 400);
        const projection = await this.comparisons.getExportProjection(input.setId, input.runId, actor);
        const ids = input.outputIds ?? projection.slots.map(slot => slot.jobId);
        if (!Array.isArray(ids) || ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length
          || ids.some(id => typeof id !== 'string' || !projection.slots.some(slot => slot.jobId === id))) throw error('export_selection_invalid', 400);
        sources = [];
        for (const id of ids) {
          const slot = projection.slots.find(slot => slot.jobId === id);
          const source = await this.generationSources.getOwnedImage(slot.jobId, actor);
          if (source.comparisonSetId !== input.setId || source.comparisonRunId !== input.runId) throw error('export_source_unavailable', 404);
          sources.push({ ...source, providerLabel: slot.providerDisplayName || slot.provider, modelLabel: slot.modelDisplayName || slot.model });
        }
        layout = input.layout || 'auto';
      }
      check();
      let bytesUsed = 0;
      for (const source of sources) {
        if (!/^\/outputs\/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/i.test(source.imageUrl)) throw error('export_source_unavailable', 404);
        const file = await containedPath(this.outputRoot, path.join(this.outputRoot, source.imageUrl.slice('/outputs/'.length)));
        source.bytes = await readBoundedFile(file, Math.min(this.config.maxInputBytes - bytesUsed,
          input.kind === 'comparison' ? COMPARISON_EXPORT_LIMITS.inputBytes : this.config.maxInputBytes));
        bytesUsed += source.bytes.length;
        check();
      }
      const logo = (input.kind === 'comparison' || this.config.logoEnabled) ? await readBoundedFile(await containedPath(this.config.brandRoot, this.config.logoPath), 2 * 1024 * 1024) : null;
      if (logo && (logo.length > 2 * 1024 * 1024 || logo.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')) throw error('export_logo_invalid', 503);
      const fingerprint = createHash('sha256').update(JSON.stringify({ input, snapshot, layout, profileVersion: this.config.profileVersion, logoVersion: this.config.logoVersion,
        width: this.config.logoWidth, inset: this.config.logoInset, opacity: this.config.logoOpacity, policyVersion: 1,
        comparisonVersion: input.kind === 'comparison' ? COMPARISON_LAYOUT_VERSION : null,
        fontVersion: this.config.comparisonFontVersion,
        labels: sources.map(source => [source.providerLabel, source.modelLabel]) })).update(logo || '').update(sources.map(source => createHash('sha256').update(source.bytes).digest('hex')).join(':')).digest('hex');
      if (input.kind === 'comparison') {
        const result = await this.comparisonRenderer({ sources, layout, logo, config: this.config, check,
          format: input.format || 'png', size: input.size || 'standard', locale: input.locale || 'en',
          deadline: started + this.config.timeoutSeconds * 1000 });
        check();
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
        return { ...result, fingerprint, count: sources.length, layout,
          filename: `momelo-comparison-${sources.length}-${result.presetId}-${timestamp}.${input.format === 'jpeg' ? 'jpg' : 'png'}` };
      }
      const bytes = await this.renderer({ sources, snapshot, layout, logo, config: this.config, check,
        deadline: started + this.config.timeoutSeconds * 1000 });
      check();
      return { bytes, filename: `momelo-${input.kind}-${fingerprint.slice(0, 12)}.png`, fingerprint, count: sources.length, layout };
    } finally { this.active.delete(actor.userId); }
  }
}

async function readBoundedFile(file, limit) {
  const handle = await open(file, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit) throw error('export_size_limit', 413);
    const bytes = Buffer.alloc(info.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = await handle.read(bytes, length, bytes.length - length, null);
      if (!read.bytesRead) break;
      length += read.bytesRead;
    }
    if (length !== info.size) throw error('export_source_changed', 409);
    return bytes.subarray(0, length);
  } finally { await handle.close(); }
}
async function containedPath(root, file) {
  const resolvedRoot = await realpath(root);
  const resolved = await realpath(file);
  const relative = path.relative(resolvedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw error('export_source_unavailable', 404);
  return resolved;
}
function error(code, statusCode) { return Object.assign(new Error('The requested export is unavailable.'), { code, statusCode }); }
