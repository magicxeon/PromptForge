export const COMPARISON_LAYOUT_VERSION = 'comparison-black-v1';
export const COMPARISON_EXPORT_LIMITS = Object.freeze({ side: 8192, pixels: 24_000_000, inputPixels: 16_000_000, inputBytes: 30 * 1024 * 1024 });
export function exportError(code, statusCode = 422) {
  return Object.assign(new Error('Comparison export could not be prepared.'), { code, statusCode });
}

export function comparisonFrame(sizes, layout = 'auto') {
  if (sizes.length < 2 || sizes.length > 4 || sizes.some(s => !(s.width > 0 && s.height > 0))) throw exportError('export_selection_invalid');
  const ratios = sizes.map(s => s.width / s.height);
  const ratio = layout === 'stacked' ? 16 / 9 : layout === 'side_by_side' ? 3 / 4 : ratios[0];
  const orientation = ratio > 1 ? 'landscape' : 'portrait';
  const width = ratio > 1 ? 1280 : Math.round(960 * ratio);
  const height = ratio > 1 ? Math.round(1280 / ratio) : 960;
  return { width, height, ratio, orientation,
    mixed: ratios.some(value => Math.abs(value - ratios[0]) > 0.001) || ratios.some(value => value === 1) };
}

export function comparisonLayout(count, frame, captionHeight = 72, scale = 1) {
  if (![2, 3, 4].includes(count) || ![1, 2].includes(scale)) throw exportError('export_selection_invalid');
  const columns = count === 4 ? 2 : frame.orientation === 'landscape' ? 1 : count;
  const rows = Math.ceil(count / columns), margin = 24, gap = 16;
  const caption = Math.max(72, captionHeight), cellHeight = frame.height + caption;
  const width = 2 * margin + columns * frame.width + (columns - 1) * gap;
  const footerTop = margin + rows * cellHeight + (rows - 1) * gap;
  const height = footerTop + 64 + margin;
  if (!Number.isFinite(width * height) || width < 1 || height < 1 || width * scale > COMPARISON_EXPORT_LIMITS.side
    || height * scale > COMPARISON_EXPORT_LIMITS.side || width * height * scale * scale > COMPARISON_EXPORT_LIMITS.pixels) throw exportError('export_size_limit');
  return { width: width * scale, height: height * scale, logicalWidth: width, logicalHeight: height,
    scale, columns, rows, captionHeight: caption, footerTop, presetId: `${frame.orientation}-${count}`,
    items: Array.from({ length: count }, (_, index) => ({ x: margin + index % columns * (frame.width + gap),
      y: margin + Math.floor(index / columns) * (cellHeight + gap), width: frame.width, height: frame.height })) };
}

export function containOriginal(width, height, frame, scale) {
  const fit = Math.min(1, frame.width * scale / width, frame.height * scale / height);
  const w = Math.max(1, Math.round(width * fit)), h = Math.max(1, Math.round(height * fit));
  return { width: w, height: h, left: Math.round(frame.x * scale + (frame.width * scale - w) / 2),
    top: Math.round(frame.y * scale + (frame.height * scale - h) / 2), lowResolution: fit === 1 && (width < frame.width * scale || height < frame.height * scale) };
}
