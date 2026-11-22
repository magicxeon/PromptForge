import { subtitleFontPreset } from "./subtitleFonts.js";

function emWidth(cluster, metrics) {
  let total = 0;
  for (const char of cluster) {
    const code = char.codePointAt(0);
    total += metrics.thai[code - 0x0e01] ?? metrics.latin[code - 0x20] ??
      (/[\p{Mark}\p{Cf}]/u.test(char) ? 0 : 1000);
  }
  return total / 1000;
}

export function wrapSubtitle(text, language, style, aspectRatio) {
  if (!text || !Intl.Segmenter) return text;
  const locale = language === "auto" || language === "source" ? undefined : language;
  const words = new Intl.Segmenter(locale, { granularity: "word" });
  const graphemes = new Intl.Segmenter(locale, { granularity: "grapheme" });
  const metrics = subtitleFontPreset(style.font).advances;
  const frameWidth = aspectRatio * 1080;
  const safeWidth = frameWidth * Math.max(0.02, Math.min(0.96, 2 * Math.min(style.x, 100 - style.x) / 100));
  const widthLimit = safeWidth / style.size;
  return text.split(/\r?\n/).map(paragraph => {
    const lines = [];
    let line = "", count = 0, width = 0, gap = "";
    const flush = () => { lines.push(line); line = ""; count = 0; width = 0; gap = ""; };
    const terms = [];
    for (const { segment } of words.segment(paragraph)) {
      if (/^[?!.,:;%)。？，！、ๆฯ]+$/u.test(segment) && terms.length && terms.at(-1).trim())
        terms[terms.length - 1] += segment;
      else terms.push(segment);
    }
    for (const term of terms) {
      if (!term.trim()) { if (line) gap += term; continue; }
      const chars = Array.from(graphemes.segment(term), part => part.segment);
      const termWidth = chars.reduce((sum, char) => sum + emWidth(char, metrics), 0);
      const gapWidth = emWidth(gap, metrics);
      if (line && (count + gap.length + chars.length > style.maxChars || width + gapWidth + termWidth > widthLimit)) flush();
      if (gap) { line += gap; count += gap.length; width += gapWidth; gap = ""; }
      for (const char of chars) {
        const advance = emWidth(char, metrics);
        if (line && (count + 1 > style.maxChars || width + advance > widthLimit)) flush();
        line += char;
        count++;
        width += advance;
      }
    }
    return [...lines, line].join("\n");
  }).join("\n");
}
