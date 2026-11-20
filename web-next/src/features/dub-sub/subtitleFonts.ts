import "./subtitle-fonts.css";
import config from "./editorConfig";
export function wrapSubtitle(text: string, language: string, maxChars: number) {
  type Splitter = new (
    locale: string | undefined,
    options: { granularity: "grapheme" },
  ) => { segment: (s: string) => Iterable<{ segment: string }> };
  const Segmenter = (Intl as typeof Intl & { Segmenter?: Splitter }).Segmenter;
  const segmenter = Segmenter
    ? new Segmenter(language === "auto" ? undefined : language, {
        granularity: "grapheme",
      })
    : null;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const chars = segmenter
        ? Array.from(segmenter.segment(line), (x) => x.segment)
        : Array.from(line);
      const result = [];
      for (let i = 0; i < chars.length; i += maxChars)
        result.push(chars.slice(i, i + maxChars).join(""));
      return result.join("\n");
    })
    .join("\n");
}
export function subtitleFamily(preset: string, language: string) {
  const family = preset === "serif" ? config.fonts.serif : config.fonts.sans;
  const script =
    language === "zh-TW" ? "TC" : language.startsWith("zh") ? "SC" : "Thai";
  return (
    '"Dub ' + family + " " + script + '", "' + family + ' Thai", sans-serif'
  );
}
