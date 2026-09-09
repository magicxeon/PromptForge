import sharp from 'sharp';

// Font registration mutates native process state. Serialize it with text rendering
// across both export types; retain only a bounded set of trusted font paths.
const registered = new Set();
let textTail = Promise.resolve();
export function renderExportText(options, timeout) {
  const work = textTail.then(async () => {
    const { fontfile, ...text } = options;
    if (fontfile && !registered.has(fontfile)) {
      if (registered.size >= 16) throw Object.assign(new Error('Export font limit reached.'), { code: 'export_font_unavailable', statusCode: 503 });
      const result = await sharp({ text: { ...text, fontfile } }).png().timeout(timeout).toBuffer({ resolveWithObject: true });
      registered.add(fontfile);
      return result;
    }
    return sharp({ text }).png().timeout(timeout).toBuffer({ resolveWithObject: true });
  });
  textTail = work.then(() => undefined, () => undefined);
  return work;
}
