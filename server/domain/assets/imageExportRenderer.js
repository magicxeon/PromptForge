import sharp from 'sharp';
import { renderExportText } from './exportText.js';

const escapeMarkup = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

export async function renderImageExport({ sources, snapshot, layout, logo, config, check = () => {}, deadline = Date.now() + config.timeoutSeconds * 1000 }) {
  const timeout = () => {
    check();
    return { seconds: Math.max(1, Math.ceil((deadline - Date.now()) / 1000)) };
  };
  const width = snapshot ? 1600 : layout === 'stacked' ? 1600 : 2400;
  const inset = 32, gap = 24, footer = 128;
  const columns = snapshot || layout === 'stacked' ? 1 : Math.min(3, sources.length);
  const tileWidth = Math.floor((width - 2 * inset - gap * (columns - 1)) / columns);
  const prepared = [];
  for (const source of sources) {
    const result = await sharp(source.bytes, { limitInputPixels: config.maxInputPixels, failOn: 'error' })
      .rotate().resize({ width: tileWidth, height: snapshot ? 2500 : 1200, fit: 'inside', withoutEnlargement: false })
      .png().timeout(timeout()).toBuffer({ resolveWithObject: true });
    prepared.push({ ...source, ...result });
  }
  const overlays = [];
  const textImage = async (text, size, maxWidth) => renderExportText({
    text: escapeMarkup(text), font: `Noto Sans Thai ${size}`, fontfile: config.fontFile,
    width: maxWidth, rgba: true, wrap: 'word-char'
  }, timeout());
  let top = inset;
  // Editorial v2 already contains document text; only legacy sheets need a heading.
  if (snapshot && snapshot.presetVersion === 1) {
    const age = snapshot.fields.ageYears ?? `${snapshot.ageRange?.minimum}-${snapshot.ageRange?.maximum ?? '+'}`;
    const heading = await textImage(`${snapshot.fields.name}\nAge: ${age}\n${snapshot.fields.situation}`, 28, width - 2 * inset);
    if (heading.info.height > 1000) throw exportError('export_text_overflow');
    overlays.push({ input: heading.data, left: inset, top });
    top += heading.info.height + gap;
  }
  for (let index = 0; index < prepared.length; index += columns) {
    const row = prepared.slice(index, index + columns);
    const rowHeight = Math.max(...row.map(item => item.info.height));
    let captionHeight = 0;
    for (const [col, source] of row.entries()) {
      const left = inset + col * (tileWidth + gap);
      overlays.push({ input: source.data, left: left + Math.floor((tileWidth - source.info.width) / 2), top });
      if (!snapshot) {
        const caption = await textImage(source.caption || source.id, 22, tileWidth);
        if (caption.info.height > 180) throw exportError('export_text_overflow');
        overlays.push({ input: caption.data, left, top: top + rowHeight + 8 });
        captionHeight = Math.max(captionHeight, caption.info.height + 8);
      }
    }
    top += rowHeight + captionHeight + gap;
  }
  const height = top + footer;
  if (width * height > config.maxOutputPixels) throw exportError('export_size_limit');
  if (logo) {
    const mark = await sharp(logo).resize({ width: config.logoWidth, height: 96, fit: 'inside' }).ensureAlpha()
      .linear([1, 1, 1, config.logoOpacity], [0, 0, 0, 0]).png().timeout(timeout()).toBuffer({ resolveWithObject: true });
    overlays.push({ input: mark.data, left: width - mark.info.width - config.logoInset, top: height - mark.info.height - config.logoInset });
  }
  return sharp({ create: { width, height, channels: 4, background: snapshot?.presetVersion === 2 ? '#f3f0eb' : '#f8fafc' } })
    .composite(overlays).png().timeout(timeout()).toBuffer();
}

function exportError(code) { return Object.assign(new Error('Export exceeds the supported document bounds.'), { statusCode: 422, code }); }
