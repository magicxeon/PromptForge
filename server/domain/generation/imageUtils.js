const MIME_EXTENSION_MAP = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp'
});

const FORMAT_MIME_MAP = Object.freeze({
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
});

export function resolveImageOutputType(result = {}) {
  const explicitMime = typeof result.mimeType === 'string' ? result.mimeType.toLowerCase() : null;
  const format = typeof result.outputFormat === 'string' ? result.outputFormat.toLowerCase() : null;
  const normalizedExplicitMime = explicitMime === 'image/jpg' ? 'image/jpeg' : explicitMime;
  const mimeType = MIME_EXTENSION_MAP[normalizedExplicitMime] ? normalizedExplicitMime : (FORMAT_MIME_MAP[format] || 'image/png');
  return { mimeType, extension: MIME_EXTENSION_MAP[mimeType] };
}

export function mimeTypeFromFilename(filename = '') {
  const extension = filename.split('.').pop()?.toLowerCase();
  return FORMAT_MIME_MAP[extension] || 'image/png';
}
