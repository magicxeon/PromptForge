type SubtitleFontFace = {
  family: string;
  file: string;
  weight: string;
  googleSource?: { directory: string; file: string };
};
type SubtitleFontPreset = {
  label: string;
  selectable?: boolean;
  variants: Record<string, SubtitleFontFace>;
  advances: { latin: number[]; thai: number[] };
};
export const subtitleFontCatalog: {
  presets: Record<string, SubtitleFontPreset>;
  googleFontsRevision: string;
};
export const defaultSubtitleFont: string;
export const subtitleFontIds: string[];
export function subtitleFontPreset(id: string): SubtitleFontPreset;
export function subtitleLanguage(project: {
  sourceLanguage: string;
  detectedLanguage?: string | null;
  cues: readonly { text: string }[];
}, track: string): string;
export function subtitleFontFaces(id: string, language: string): SubtitleFontFace[];
