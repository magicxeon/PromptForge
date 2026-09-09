import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { renderComparisonExport } from '../server/domain/assets/comparisonExportRenderer.js';
import { comparisonFrame, comparisonLayout, containOriginal } from '../server/domain/assets/comparisonExportLayout.js';
import { getMediaExportConfig } from '../server/config/mediaExports.js';

const config = getMediaExportConfig({});
const render = async (sources, options = {}) => renderComparisonExport({ sources, logo: await readFile(config.logoPath), config, ...options });
const source = async (width, height, color = '#cf3749', label = 'gpt-image-2.5-sunburst') => ({
  bytes: await sharp({ create: { width, height, channels: 3, background: color } }).composite([
    { input: { create: { width: 12, height: 12, channels: 3, background: '#00ff00' } }, left: 0, top: 0 },
    { input: { create: { width: 12, height: 12, channels: 3, background: '#0000ff' } }, left: width - 12, top: height - 12 }
  ]).png().toBuffer(), providerLabel: 'OpenAI', modelLabel: label
});
const pixel = async (bytes, x, y) => [...await sharp(bytes).extract({ left: x, top: y, width: 1, height: 1 }).removeAlpha().raw().toBuffer()];

test('layout: all six presets have the specified baseline dimensions and physical containment', () => {
  for (const [width, height, expected] of [[720, 960, [[1504, 1144], [2240, 1144], [1504, 2192]]],
    [1280, 720, [[1328, 1712], [1328, 2520], [2624, 1712]]]]) {
    for (const count of [2, 3, 4]) {
      const frame = comparisonFrame(Array.from({ length: count }, () => ({ width, height })));
      const plan = comparisonLayout(count, frame);
      assert.deepEqual([plan.width, plan.height], expected[count - 2]);
      const high = comparisonLayout(count, frame, 72, 2);
      assert.deepEqual([high.width, high.height], expected[count - 2].map(v => v * 2));
      assert.equal(count === 4 ? plan.columns : true, count === 4 ? 2 : true);
      const fitted = containOriginal(width, height, high.items[0], 2);
      assert.equal(fitted.width, width, 'High canvas does not upscale source');
    }
  }
  assert.throws(() => comparisonLayout(2, { width: 9000, height: 1000, orientation: 'landscape' }), { code: 'export_size_limit' });
});

test('render: six real PNG exports preserve corners, image order, black border and footer pixels', async () => {
  for (const [width, height] of [[720, 960], [1280, 720]]) {
    const a = await source(width, height), b = await source(width, height, '#287dcc', 'Model B');
    for (const count of [2, 3, 4]) {
      const sources = [a, b, a, b].slice(0, count), result = await render(sources);
      const frame = comparisonFrame(sources.map(() => ({ width, height })));
      const plan = comparisonLayout(count, frame);
      assert.deepEqual([result.width, result.height], [plan.width, plan.height]);
      assert.deepEqual(await pixel(result.bytes, 0, 0), [5, 5, 5]);
      for (const cell of plan.items) {
        assert.deepEqual(await pixel(result.bytes, cell.x + 3, cell.y + 3), [0, 255, 0]);
        assert.deepEqual(await pixel(result.bytes, cell.x + width - 4, cell.y + height - 4), [0, 0, 255]);
      }
      assert.deepEqual(await pixel(result.bytes, plan.items[1].x + 100, plan.items[1].y + 100), [40, 125, 204]);
      const footer = await sharp(result.bytes).extract({ left: 24, top: plan.footerTop + 1, width: result.width - 48, height: 62 }).stats();
      assert.ok(footer.channels.some(channel => channel.max > 150), 'real footer logo/text are in encoded pixels');
      if (process.env.MPF_COMPARISON_EVIDENCE_DIR) {
        await mkdir(process.env.MPF_COMPARISON_EVIDENCE_DIR, { recursive: true });
        await writeFile(path.join(process.env.MPF_COMPARISON_EVIDENCE_DIR, `${result.presetId}.png`), result.bytes);
      }
    }
  }
});

test('render: High JPEG, mixed ratios, Thai/long captions and low-resolution notices', async () => {
  const a = await source(500, 700, '#cf3749', 'โมเดลทดสอบ ภาษาไทย / gpt-image-2.5-sunburst-version-2026-09-09');
  const b = await source(640, 360);
  const result = await render([a, b, a, b], { size: 'high', format: 'jpeg', locale: 'th' });
  assert.equal((await sharp(result.bytes).metadata()).format, 'jpeg');
  assert.ok(result.warnings.some(w => w.code === 'MIXED_RATIOS'));
  assert.equal(result.warnings.filter(w => w.code === 'LOW_RESOLUTION').length, 4);
  assert.ok(result.height > 4384, 'long labels expand shared caption height');
  if (process.env.MPF_COMPARISON_EVIDENCE_DIR) await writeFile(path.join(process.env.MPF_COMPARISON_EVIDENCE_DIR, 'high-mixed-thai.jpg'), result.bytes);
});

test('render: invalid, corrupt, missing branding/font, long metadata and cancellation fail instead of partial export', async () => {
  const a = await source(100, 100);
  await assert.rejects(render([a]), { code: 'export_selection_invalid' });
  await assert.rejects(render([a, a], { logo: null }), { code: 'export_logo_invalid' });
  await assert.rejects(render([a, { ...a, bytes: Buffer.from('invalid') }]));
  await assert.rejects(render([a, a], { config: { ...config, comparisonFonts: [{ path: 'missing', family: 'Poppins' }] } }), { code: 'export_font_unavailable' });
  await assert.rejects(render([{ ...a, modelLabel: 'x'.repeat(257) }, a]), { code: 'export_metadata_too_long' });
  await assert.rejects(render([a, a], { check: () => { throw Object.assign(new Error('cancelled'), { code: 'export_cancelled' }); } }), { code: 'export_cancelled' });
  const missing = await render([{ bytes: a.bytes }, { bytes: a.bytes }]);
  assert.equal(missing.warnings.filter(w => w.code === 'MISSING_LABEL').length, 2);
});
