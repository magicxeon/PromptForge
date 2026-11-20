// Nominal glyph advances in thousandths of an em from the bundled regular
// Noto Thai fonts (hmtx, ASCII U+0020–007E and Thai U+0E01–0E5B).
// The renderer and browser both budget in video coordinates before scaling.
const advances = {
  sans: {
    latin: [260,269,408,646,572,831,732,225,300,300,551,572,268,322,268,372,572,572,572,572,572,572,572,572,572,572,268,268,572,572,572,434,899,639,650,632,730,556,519,728,741,339,273,619,524,907,760,781,605,781,622,549,556,731,600,930,586,566,572,329,372,329,572,444,281,561,615,480,615,564,344,615,618,258,258,534,258,935,618,605,615,615,413,479,361,618,508,786,529,510,470,380,551,380,572],
    thai: [600,547,549,614,621,598,537,532,604,550,556,906,909,603,603,547,626,903,909,616,636,602,609,544,613,604,605,648,652,695,682,603,614,594,488,602,571,603,492,628,640,572,587,668,574,560,519,338,0,406,406,0,0,0,0,0,0,0,1000,1000,1000,1000,584,295,568,308,289,304,406,595,0,0,0,0,0,0,0,0,595,570,545,613,559,539,540,520,720,565,504,767,872],
  },
  serif: {
    latin: [260,332,408,559,559,896,742,220,346,346,500,559,250,310,250,288,559,559,559,559,559,559,559,559,559,559,286,286,559,559,559,474,921,705,654,614,727,623,590,714,793,367,357,700,623,938,763,742,604,742,656,544,613,717,675,1047,660,625,592,360,288,360,559,459,274,563,614,492,614,535,369,538,635,320,300,585,310,945,645,577,614,614,471,451,352,635,579,862,578,565,511,428,559,428,559],
    thai: [610,565,603,633,643,654,500,572,660,580,608,881,875,644,644,578,681,913,920,639,639,611,651,572,660,625,635,657,657,721,721,644,654,596,497,611,600,648,517,651,690,613,627,722,582,582,520,480,0,492,492,0,0,0,0,0,0,0,1000,1000,1000,1000,559,341,652,378,357,344,492,521,0,0,0,0,0,0,0,0,623,603,609,669,699,594,594,570,762,620,642,730,845],
  },
};

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
  const metrics = style.font === "serif" ? advances.serif : advances.sans;
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
