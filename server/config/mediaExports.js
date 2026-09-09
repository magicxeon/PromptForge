import path from 'node:path';
import { PROJECT_ROOT, CLIENT_ROOT } from './paths.js';

export function getMediaExportConfig(env = process.env) {
  const brandRoot = path.join(CLIENT_ROOT, 'assets', 'brand');
  const logoPath = path.resolve(brandRoot, env.MOMELO_EXPORT_LOGO_PATH || 'momelo-export-mark.png');
  const relative = path.relative(brandRoot, logoPath);
  if (relative.startsWith('..') || path.isAbsolute(relative) || path.extname(logoPath).toLowerCase() !== '.png') {
    throw Object.assign(new Error('Export logo must be a PNG within the brand asset directory.'), { code: 'export_logo_invalid', statusCode: 503 });
  }
  const number = (key, fallback, min, max) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid export setting: ${key}`);
    return value;
  };
  return {
    profileVersion: 1, logoVersion: String(env.MOMELO_EXPORT_LOGO_VERSION || '1').slice(0, 80),
    logoEnabled: env.MOMELO_EXPORT_LOGO_ENABLED !== 'false', logoPath, brandRoot,
    logoWidth: Math.round(number('MOMELO_EXPORT_LOGO_WIDTH', 64, 24, 128)),
    logoInset: Math.round(number('MOMELO_EXPORT_LOGO_INSET', 24, 8, 40)),
    logoOpacity: number('MOMELO_EXPORT_LOGO_OPACITY', 1, 0.1, 1),
    fontFile: path.join(PROJECT_ROOT, 'node_modules', '@fontsource', 'noto-sans-thai', 'files', 'noto-sans-thai-thai-400-normal.woff'),
    comparisonFontVersion: 'poppins-noto-600-v1',
    comparisonFonts: [
      { family: 'Poppins', sample: 'Momelo', path: path.join(PROJECT_ROOT, 'node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff') },
      { family: 'Noto Sans Thai', sample: 'ภาพ', path: path.join(PROJECT_ROOT, 'node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-thai-600-normal.woff') },
      { family: 'Noto Sans Thai', sample: 'Momelo', path: path.join(PROJECT_ROOT, 'node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-latin-600-normal.woff') }
    ],
    maxInputBytes: 64 * 1024 * 1024, maxInputPixels: 40_000_000,
    maxOutputPixels: 16_000_000, timeoutSeconds: 15, maxActive: 2
  };
}
