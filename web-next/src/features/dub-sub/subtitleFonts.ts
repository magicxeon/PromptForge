import "./subtitle-fonts.css";
import config from "./editorConfig";
export function subtitleFamily(preset: string, language: string) {
  const family = preset === "serif" ? config.fonts.serif : config.fonts.sans;
  const script =
    language === "zh-TW" ? "TC" : language.startsWith("zh") ? "SC" : "Thai";
  return (
    '"Dub ' + family + " " + script + '", "' + family + ' Thai", sans-serif'
  );
}
