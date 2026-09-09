import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { MediaExportService } from '../server/domain/assets/MediaExportService.js';
import { GenerationExportSourceService } from '../server/domain/generation/GenerationExportSourceService.js';
import { getMediaExportConfig } from '../server/config/mediaExports.js';
import { acceptLookSheetSnapshot } from '../server/domain/character-profiles/LookSheetDefinitionService.js';
import { resolveComparisonImageLayout } from '../server/domain/comparisons/comparisonLayout.js';
import { ComparisonOrchestrator } from '../server/domain/comparisons/ComparisonOrchestrator.js';
import { renderImageExport } from '../server/domain/assets/imageExportRenderer.js';
import { EventEmitter } from 'node:events';
import { registerMediaExportRoutes } from '../server/app/routes/mediaExportRoutes.js';

const snapshot = acceptLookSheetSnapshot({ generationSurface: 'playground', lookSheetDefinition: {
  schemaVersion: 1, name: 'MIRA นลินน์', ageYears: 24, appearance: 'Dark hair', situation: 'Night market stall owner / เจ้าของร้านขนม'
} });
test('editorial export has no duplicated heading; historical v1 keeps its heading', async () => {
  const bytes = await sharp({ create: { width: 800, height: 1200, channels: 3, background: '#25bcce' } }).png().toBuffer();
  const config = getMediaExportConfig({});
  const render = value => renderImageExport({ sources: [{ bytes }], snapshot: value, layout: 'stacked', logo: null, config });
  const editorial = await render(snapshot);
  const renamed = await render({ ...snapshot, fields: { ...snapshot.fields, name: 'Changed name' } });
  assert.deepEqual(editorial, renamed, 'v2 visible text is already in the source pixels');
  const legacy = await render({ ...snapshot, presetVersion: 1 });
  assert.ok((await sharp(legacy).metadata()).height > (await sharp(editorial).metadata()).height);
  const topPixel = await sharp(editorial).extract({ left: 32, top: 32, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  assert.deepEqual([...topPixel], [37, 188, 206], 'full source begins at the top inset');
  const image = await sharp(editorial).metadata();
  assert.equal(image.width, 1600);
  assert.ok(image.height > 2304, 'portrait source is retained without cropping');
});

test('export rejects unknown recipe versions instead of guessing their layout', async () => {
  const service = new MediaExportService({
    generationSources: { getOwnedImage: async () => ({ lookSheetSnapshot: { ...snapshot, presetVersion: 3 } }) }, comparisons: {}
  });
  await assert.rejects(service.export({ kind: 'look_sheet', jobId: 'job' }, { userId: 'owner' }), { code: 'export_source_unavailable' });
  assert.equal(service.active.size, 0);
});
test('export renders a branded sheet and both comparison layouts without changing originals', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mpf-export-'));
  try {
    const bytes = await sharp({ create: { width: 800, height: 450, channels: 3, background: '#25bcce' } }).png().toBuffer();
    await writeFile(path.join(root, 'source.png'), bytes);
    const config = getMediaExportConfig({});
    const source = { id: 'job', imageUrl: '/outputs/source.png', width: 800, height: 450, lookSheetSnapshot: snapshot,
      comparisonSetId: 'set', comparisonRunId: 'run' };
    const service = new MediaExportService({ config, outputRoot: root,
      generationSources: { getOwnedImage: async id => ({ ...source, id }) },
      comparisons: { getExportProjection: async () => ({ aspectRatio: '16:9', slots: ['one', 'two', 'three', 'four'].map(jobId => ({ jobId, provider: 'provider', model: 'model' })) }) } });
    const actor = { userId: 'owner' };
    const started = performance.now();
    const sheet = await service.export({ kind: 'look_sheet', jobId: 'job' }, actor);
    const stacked = await service.export({ kind: 'comparison', setId: 'set', runId: 'run', layout: 'stacked' }, actor);
    const row = await service.export({ kind: 'comparison', setId: 'set', runId: 'run', layout: 'side_by_side' }, actor);
    assert.equal((await sharp(sheet.bytes).metadata()).width, 1600);
    assert.equal(stacked.presetId, 'landscape-4');
    assert.equal(row.presetId, 'portrait-4');
    assert.equal((await sharp(stacked.bytes).metadata()).height, 1712);
    assert.equal((await sharp(row.bytes).metadata()).height, 2192);
    assert.notEqual(stacked.fingerprint, row.fingerprint);
    assert.equal(stacked.count, 4);
    const picked = await service.export({ kind: 'comparison', setId: 'set', runId: 'run', outputIds: ['four', 'two'], format: 'jpeg' }, actor);
    assert.equal(picked.count, 2);
    assert.equal(picked.mimeType, 'image/jpeg');
    assert.match(picked.filename, /^momelo-comparison-2-landscape-2-\d{8}-\d{6}\.jpg$/);
    for (const outputIds of [['one'], ['one', 'one'], ['one', 'foreign'], ['one', 'two', 'three', 'four', 'extra']]) {
      await assert.rejects(service.export({ kind: 'comparison', setId: 'set', runId: 'run', outputIds }, actor), { code: 'export_selection_invalid' });
    }
    assert.deepEqual(await readFile(path.join(root, 'source.png')), bytes);
    assert.equal(service.active.size, 0);
    console.log(`Export fixture: ${Math.round(performance.now() - started)}ms for 4 exports; RSS ${Math.round(process.memoryUsage().rss / 1048576)} MiB`);
    if (process.env.MPF_EXPORT_EVIDENCE_DIR) {
      for (const [name, result] of [['sheet', sheet], ['stacked', stacked], ['row', row]]) await writeFile(path.join(process.env.MPF_EXPORT_EVIDENCE_DIR, `${name}.png`), result.bytes);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('mixed export rendering is repeatable and a missing selected image fails atomically', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mpf-export-mixed-'));
  try {
    const bytes = await sharp({ create: { width: 480, height: 640, channels: 3, background: '#25bcce' } }).png().toBuffer();
    await writeFile(path.join(root, 'source.png'), bytes);
    let missing = false;
    const service = new MediaExportService({ outputRoot: root, config: getMediaExportConfig({}),
      generationSources: { getOwnedImage: async id => ({ id,
        imageUrl: missing && id === 'two' ? '/outputs/missing.png' : '/outputs/source.png',
        lookSheetSnapshot: { ...snapshot, presetVersion: 1 }, comparisonSetId: 'set', comparisonRunId: 'run' }) },
      comparisons: { getExportProjection: async () => ({ slots: ['one', 'two'].map(jobId => ({ jobId, provider: 'OpenAI', model: 'Image model' })) }) }
    });
    const comparison = { kind: 'comparison', setId: 'set', runId: 'run' };
    let previous;
    for (let round = 0; round < 3; round += 1) {
      const results = await Promise.all([
        service.export({ kind: 'look_sheet', jobId: 'sheet' }, { userId: 'sheet-owner' }),
        service.export(comparison, { userId: 'comparison-owner' })
      ]);
      for (const result of results) assert.equal((await sharp(result.bytes).metadata()).format, 'png');
      if (previous) results.forEach((result, index) => assert.deepEqual(result.bytes, previous[index]));
      previous = results.map(result => result.bytes);
      assert.equal(service.active.size, 0);
    }
    missing = true;
    let rendered = false;
    service.comparisonRenderer = async () => { rendered = true; throw new Error('Must not render a partial export'); };
    await assert.rejects(service.export(comparison, { userId: 'comparison-owner' }), { code: 'ENOENT' });
    assert.equal(rendered, false);
    assert.equal(service.active.size, 0);
    assert.deepEqual(await readFile(path.join(root, 'source.png')), bytes);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('download route exposes safe JPEG metadata and keeps private errors sanitized', async () => {
  const bytes = Buffer.from('encoded image fixture');
  const result = { bytes, mimeType: 'image/jpeg', filename: 'momelo-comparison-2-portrait-2-20260909-120000.jpg',
    width: 1504, height: 1144, count: 2, presetId: 'portrait-2', warnings: [], layoutVersion: 'comparison-black-v1',
    internalSource: '/outputs/private.png', fingerprint: 'internal' };
  const actor = { userId: 'owner' };
  let handler, failure = false;
  registerMediaExportRoutes({ post: (route, callback) => { assert.equal(route, '/api/media/exports'); handler = callback; } }, {
    mediaExportService: { export: async (_input, context) => {
      assert.equal(context, actor);
      if (failure) throw Object.assign(new Error('/private/path must not leave the server'), { statusCode: 404, code: 'export_source_unavailable' });
      return result;
    } }
  });
  const response = () => Object.assign(new EventEmitter(), {
    headers: {}, statusCode: 200,
    set(key, value) { Object.assign(this.headers, typeof key === 'object' ? key : { [key]: value }); return this; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; this.writableEnded = true; },
    json(body) { this.body = body; this.writableEnded = true; }
  });
  const res = response();
  await handler({ body: { kind: 'comparison' }, actorContext: actor }, res);
  assert.equal(res.body, bytes);
  assert.equal(res.headers['Content-Type'], 'image/jpeg');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.match(res.headers['Access-Control-Expose-Headers'], /X-Momelo-Export/);
  assert.equal(JSON.parse(res.headers['X-Momelo-Export']).width, 1504);
  assert.doesNotMatch(res.headers['X-Momelo-Export'], /private|internal/);
  assert.equal(res.listenerCount('close'), 0);
  failure = true;
  const failed = response();
  await handler({ body: {}, actorContext: actor }, failed);
  assert.equal(failed.statusCode, 404);
  assert.equal(failed.body.error.code, 'export_source_unavailable');
  assert.doesNotMatch(JSON.stringify(failed.body), /private\/path/);
  assert.equal(failed.listenerCount('close'), 0);
});

test('source facade hides foreign, deleted and private internal artifacts', async () => {
  const record = { id: 'job', status: 'completed', imageUrl: '/outputs/a.png', ownerUserId: 'owner' };
  const service = new GenerationExportSourceService({ repository: { findByIdForOwner: async (_id, owner) => owner === 'owner' ? record : null } });
  await assert.rejects(service.getOwnedImage('job', { userId: 'other' }), { statusCode: 404 });
  await assert.rejects(service.getOwnedImage('job', null), { statusCode: 401 });
  record.deletedAt = 'today';
  await assert.rejects(service.getOwnedImage('job', { userId: 'owner' }), { statusCode: 404 });
});
test('export rejects caller paths, duplicate activity and unsafe branding configuration', async () => {
  assert.throws(() => getMediaExportConfig({ MOMELO_EXPORT_LOGO_PATH: '../other.png' }));
  const service = new MediaExportService({ generationSources: {}, comparisons: {}, config: getMediaExportConfig({}) });
  await assert.rejects(service.export({ kind: 'look_sheet', jobId: 'job', runId: 'run' }, { userId: 'owner' }), { code: 'export_request_invalid' });
  await assert.rejects(service.export({ kind: 'look_sheet', jobId: 'job', url: 'https://example.com' }, { userId: 'owner' }), { code: 'export_request_invalid' });
  service.active.add('owner');
  await assert.rejects(service.export({ kind: 'look_sheet', jobId: 'job' }, { userId: 'owner' }), { code: 'export_busy' });
});
test('export shares Comparison orientation policy fixtures', async () => {
  const cases = JSON.parse(await readFile(new URL('./fixtures/comparison-layout-v1.json', import.meta.url), 'utf8'));
  for (const item of cases) assert.equal(resolveComparisonImageLayout(item.sizes.map(size => ({ width: size?.[0], height: size?.[1] })), item.aspectRatio), item.expected);
});
test('Comparison export reads a pinned terminal run without reconciling or mutating it', async () => {
  const run = { id: 'run', status: 'partially_completed', slots: [
    { jobId: 'one', status: 'completed', result: { imageUrl: '/outputs/one.png' } },
    { jobId: 'failed', status: 'failed' },
    { jobId: 'two', status: 'completed', result: { imageUrl: '/outputs/two.png' } }
  ] };
  const repository = { get: async (_id, actor) => {
    if (actor.userId !== 'owner') throw Object.assign(new Error('unavailable'), { statusCode: 404 });
    return { runs: [run] };
  } };
  const service = new ComparisonOrchestrator({ repository, providerRegistry: {}, generationApplicationService: {} });
  const before = JSON.stringify(run);
  assert.deepEqual((await service.getExportProjection('set', 'run', { userId: 'owner' })).slots.map(slot => slot.jobId), ['one', 'two']);
  assert.equal(JSON.stringify(run), before);
  await assert.rejects(service.getExportProjection('set', 'run', { userId: 'other' }), { statusCode: 404 });
  await assert.rejects(service.getExportProjection('set', 'missing', { userId: 'owner' }), { code: 'comparison_export_unavailable' });
  run.status = 'processing';
  await assert.rejects(service.getExportProjection('set', 'run', { userId: 'owner' }), { code: 'comparison_export_unavailable' });
});
test('cancellation, missing media, byte limits and invalid images release capacity', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mpf-export-invalid-'));
  try {
    const source = { id: 'job', imageUrl: '/outputs/source.png', lookSheetSnapshot: snapshot };
    let rendered = false;
    const service = new MediaExportService({ outputRoot: root, config: { ...getMediaExportConfig({}), maxInputBytes: 8 },
      generationSources: { getOwnedImage: async () => ({ ...source }) }, comparisons: {}, renderer: async () => { rendered = true; return Buffer.from('unused'); } });
    const actor = { userId: 'owner' }, request = { kind: 'look_sheet', jobId: 'job' };
    const controller = new AbortController(); controller.abort();
    await assert.rejects(service.export(request, actor, controller.signal), { code: 'export_cancelled' });
    await assert.rejects(service.export(request, actor), { code: 'ENOENT' });
    await writeFile(path.join(root, 'source.png'), Buffer.alloc(9));
    await assert.rejects(service.export(request, actor), { code: 'export_size_limit' });
    source.imageUrl = 'https://example.com/private.png';
    await assert.rejects(service.export(request, actor), { code: 'export_source_unavailable' });
    assert.equal(rendered, false);
    assert.equal(service.active.size, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
