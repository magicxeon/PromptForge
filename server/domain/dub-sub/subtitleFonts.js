import catalog from "../../config/dub-subtitle-fonts.json" with { type: "json" };

export const subtitleFontCatalog = catalog;
export const defaultSubtitleFont = catalog.defaultPreset;
export const subtitleFontIds = Object.keys(catalog.presets);

// Keep installed file paths inside the font directory and family names valid in ASS.
const variants = new Set([catalog.defaultVariant, ...catalog.fallbackVariants, ...Object.values(catalog.languageVariants)]);
if (!Object.hasOwn(catalog.presets, defaultSubtitleFont) || catalog.presets[defaultSubtitleFont].selectable === false)
  throw new Error("The default subtitle font must be selectable.");
for (const [id, preset] of Object.entries(catalog.presets)) {
  for (const variant of variants) {
    const face = preset.variants[variant];
    if (!face || !/^[\p{L}\p{N} ._-]+$/u.test(face.family) || !/^[a-z0-9_-]+\.ttf$/i.test(face.file)
      || !/^\d{1,4}( \d{1,4})?$/.test(face.weight))
      throw new Error(`Invalid subtitle font face for ${id}/${variant}.`);
  }
}

export function subtitleFontPreset(id) {
  return catalog.presets[Object.hasOwn(catalog.presets, id) ? id : defaultSubtitleFont];
}

export function subtitleLanguage(project, track) {
  const language = track === "source" ? project.detectedLanguage || project.sourceLanguage : track;
  if (language !== "auto") return language || catalog.autoLanguage.otherwise;
  return project.cues.some(cue => /\p{Script=Han}/u.test(cue.text)) ? catalog.autoLanguage.han : catalog.autoLanguage.otherwise;
}

export function subtitleFontFaces(id, language) {
  const locale = language.toLowerCase();
  const mapping = catalog.languageVariants;
  const base = locale.split("-")[0];
  const variant = Object.hasOwn(mapping, locale) ? mapping[locale]
    : Object.hasOwn(mapping, base) ? mapping[base] : catalog.defaultVariant;
  const faces = subtitleFontPreset(id).variants;
  return [...new Set([variant, ...catalog.fallbackVariants])].map(name => faces[name]);
}
