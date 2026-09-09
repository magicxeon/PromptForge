import { access } from 'node:fs/promises';
import sharp from 'sharp';
import { renderExportText } from './exportText.js';
import { comparisonFrame, comparisonLayout, containOriginal, COMPARISON_LAYOUT_VERSION, COMPARISON_EXPORT_LIMITS, exportError } from './comparisonExportLayout.js';

const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const graphemes = value => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(s => s.segment);
const label = (value, fallback, locale) => {
  const text = typeof value === 'string' ? value : value?.[locale] || value?.en || value?.th || '';
  if (typeof text !== 'string' || graphemes(text).length > 256 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw exportError('export_metadata_too_long');
  return text.trim() || fallback;
};

export async function renderComparisonExport({ sources, layout = 'auto', format = 'png', size = 'standard', locale = 'en', logo, config,
  check = () => {}, deadline = Date.now() + config.timeoutSeconds * 1000 }) {
  if (!['png', 'jpeg'].includes(format) || !['standard', 'high'].includes(size)) throw exportError('export_request_invalid', 400);
  if (!logo) throw exportError('export_logo_invalid', 503);
  const timeout = () => { check(); if (Date.now() > deadline) throw exportError('export_timeout', 503);
    return { seconds: Math.max(1, Math.ceil((deadline - Date.now()) / 1000)) }; };
  const fonts = config.comparisonFonts;
  if (!fonts?.length) throw exportError('export_font_unavailable', 503);
  for (const font of fonts) {
    await access(font.path).catch(() => { throw exportError('export_font_unavailable', 503); });
    await renderExportText({ text: font.sample, font: `${font.family} Semi-Bold 14`, fontfile: font.path, rgba: true }, timeout());
  }
  // Text metrics are request-local and bounded by the label limits, never cached across actors.
  const metrics = new Map();
  async function textImage(text, fontSize, color = '#F4F4F5', scale = 1) {
    const font = /[\u0e00-\u0e7f]/.test(text) ? fonts[1] : fonts[0];
    return renderExportText({ text: `<span foreground="${color}">${escape(text)}</span>`,
      font: `${font.family} Semi-Bold ${fontSize * scale}`, fontfile: font.path, rgba: true, dpi: 72 }, timeout());
  }
  async function measure(text, fontSize) {
    const key = `${fontSize}:${text}`;
    if (!metrics.has(key)) metrics.set(key, (await textImage(text || ' ', fontSize)).info.width);
    return metrics.get(key);
  }
  async function wrap(text, fontSize, maxWidth) {
    const parts = [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)].map(s => s.segment);
    const lines = []; let line = '';
    for (const part of parts) {
      if (await measure(line + part, fontSize) <= maxWidth) { line += part; continue; }
      if (line.trim()) { lines.push(line.trim()); line = ''; }
      for (const glyph of graphemes(part.trimStart())) {
        if (await measure(line + glyph, fontSize) > maxWidth) {
          if (!line) throw exportError('export_metadata_too_long');
          lines.push(line); line = '';
        }
        line += glyph;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
  const decoded = [];
  for (const source of sources) {
    if (source.bytes.length > COMPARISON_EXPORT_LIMITS.inputBytes) throw exportError('export_size_limit');
    const meta = await sharp(source.bytes, { limitInputPixels: COMPARISON_EXPORT_LIMITS.inputPixels }).metadata();
    if ((meta.pages || 1) > 1 || !['png', 'jpeg', 'webp'].includes(meta.format)) throw exportError('export_source_invalid');
    const rotated = [5, 6, 7, 8].includes(meta.orientation);
    decoded.push({ width: rotated ? meta.height : meta.width, height: rotated ? meta.width : meta.height });
  }
  let frame = comparisonFrame(decoded, layout), labels, plan;
  const scale = size === 'high' ? 2 : 1;
  const warnings = [];
  if (frame.mixed) warnings.push({ code: 'MIXED_RATIOS' });
  const texts = sources.map((source, index) => {
    const provider = label(source.providerLabel, 'Provider not specified', locale);
    const model = label(source.modelLabel, 'Model not specified', locale);
    if (provider === 'Provider not specified' || model === 'Model not specified') warnings.push({ code: 'MISSING_LABEL', index });
    return { provider, model };
  });
  for (let attempt = 0; attempt <= 4; attempt++) {
    comparisonLayout(sources.length, frame, 72, scale);
    labels = [];
    for (const text of texts) labels.push({ provider: await wrap(text.provider, 14, frame.width), model: await wrap(text.model, 22, frame.width) });
    if (labels.every(text => text.model.length <= 4)) break;
    if (attempt === 4) throw exportError('export_metadata_too_long');
    frame = { ...frame, width: Math.ceil(frame.width * 1.1), height: Math.round(Math.ceil(frame.width * 1.1) / frame.ratio) };
  }
  const captionHeight = Math.max(...labels.map(text => 20 + text.provider.length * 18 + 6 + text.model.length * 28));
  plan = comparisonLayout(sources.length, frame, captionHeight, scale);
  const overlays = [];
  async function drawText(text, fontSize, color, x, y, lineHeight) {
    const rendered = await textImage(text, fontSize, color, scale);
    if (rendered.info.height > lineHeight * scale || rendered.info.width > frame.width * scale) throw exportError('export_text_overflow');
    overlays.push({ input: rendered.data, left: Math.round(x * scale), top: Math.round(y * scale + (lineHeight * scale - rendered.info.height) / 2) });
    return rendered.info.width / scale;
  }
  for (const [index, source] of sources.entries()) {
    const cell = plan.items[index], fitted = containOriginal(decoded[index].width, decoded[index].height, cell, scale);
    if (fitted.lowResolution) warnings.push({ code: 'LOW_RESOLUTION', index });
    const image = await sharp(source.bytes, { limitInputPixels: COMPARISON_EXPORT_LIMITS.inputPixels, failOn: 'error' })
      .rotate().toColourspace('srgb').resize(fitted.width, fitted.height, { fit: 'inside', withoutEnlargement: true })
      .png().timeout(timeout()).toBuffer();
    overlays.push({ input: image, left: fitted.left, top: fitted.top });
    let y = cell.y + cell.height + 10;
    for (const text of labels[index].provider) { await drawText(text, 14, '#A5A5AB', cell.x, y, 18); y += 18; }
    y += 6;
    for (const text of labels[index].model) { await drawText(text, 22, '#F4F4F5', cell.x, y, 28); y += 28; }
  }
  overlays.push({ input: { create: { width: (plan.logicalWidth - 48) * scale, height: scale, channels: 4, background: '#323238' } }, left: 24 * scale, top: plan.footerTop * scale });
  const prefix = await textImage('comparison by', 18, '#A5A5AB', scale);
  const brand = await textImage('Momelo', 18, '#F4F4F5', scale);
  const groupWidth = 28 * scale + 10 * scale + prefix.info.width + 6 * scale + brand.info.width;
  if (groupWidth > plan.width - 48 * scale) throw exportError('export_text_overflow');
  const left = Math.round((plan.width - groupWidth) / 2), center = (plan.footerTop + 32) * scale;
  const mark = await sharp(logo).resize(28 * scale, 28 * scale, { fit: 'contain', background: '#050505' }).png().timeout(timeout()).toBuffer();
  overlays.push({ input: mark, left, top: center - 14 * scale },
    { input: prefix.data, left: left + 38 * scale, top: Math.round(center - prefix.info.height / 2) },
    { input: brand.data, left: left + 44 * scale + prefix.info.width, top: Math.round(center - brand.info.height / 2) });
  const output = sharp({ create: { width: plan.width, height: plan.height, channels: 4, background: '#050505' } }).composite(overlays).flatten({ background: '#050505' });
  const bytes = await (format === 'jpeg' ? output.jpeg({ quality: 95 }) : output.png()).timeout(timeout()).toBuffer();
  const actual = await sharp(bytes).metadata();
  if (actual.width !== plan.width || actual.height !== plan.height || actual.format !== format) throw exportError('export_encoding_failed');
  return { bytes, width: plan.width, height: plan.height, presetId: plan.presetId, warnings,
    mimeType: `image/${format}`, layoutVersion: COMPARISON_LAYOUT_VERSION };
}
