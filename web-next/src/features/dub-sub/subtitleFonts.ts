import { useEffect } from "react";
import { subtitleFontFaces } from "../../../../server/domain/dub-sub/subtitleFonts.js";

const registeredFonts = new Set<string>();

export function useSubtitleFamily(preset: string, language: string) {
  useEffect(() => {
    for (const {family, file, weight} of subtitleFontFaces(preset, language)) {
      if (registeredFonts.has(family)) continue;
      const face = new FontFace("Dub " + family, `url("/assets/dub-sub/fonts/${file}") format("truetype")`, {
        weight, display: "swap",
      });
      document.fonts.add(face);
      registeredFonts.add(family);
    }
  }, [preset, language]);

  return [...subtitleFontFaces(preset, language).map(face => `"Dub ${face.family}"`), "sans-serif"].join(", ");
}
