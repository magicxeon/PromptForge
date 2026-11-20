import { useTranslation } from "react-i18next";
import config from "./editorConfig";
import type { Track } from "./projectApi";
export function SubtitleInspector({
  language,
  script,
  style,
  change,
  convert,
}: {
  language: string;
  script: string;
  style: Track;
  change: (patch: Partial<Track>) => void;
  convert: (to: "cn" | "tw") => void;
}) {
  const { t } = useTranslation("dub");
  return (
    <>
      <b>{t("lang." + language)}</b>
      {script.startsWith("zh") && (
        <label>
          {t("variant")}
          <select
            value=""
            disabled={style.locked}
            onChange={(e) => {
              if (e.target.value) convert(e.target.value as "cn" | "tw");
            }}
          >
            <option value="">—</option>
            <option value="cn">{t("lang.zh-CN")}</option>
            <option value="tw">{t("lang.zh-TW")}</option>
          </select>
        </label>
      )}
      <label>
        {t("family")}
        <select
          value={style.font}
          disabled={style.locked}
          onChange={(e) => change({ font: e.target.value })}
        >
          {Object.entries(config.fonts).map(([id, family]) => (
            <option key={id} value={id}>
              {family}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("color")}
        <select
          value={style.color}
          disabled={style.locked}
          onChange={(e) => change({ color: e.target.value })}
        >
          {Object.keys(config.colors).map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>
      </label>
      {(["size", "x", "y", "maxChars"] as const).map((k) => (
        <label key={k}>
          {t(k)} · {style[k]}
          <input
            type="range"
            min={config.subtitleControls[k].min}
            max={config.subtitleControls[k].max}
            disabled={style.locked}
            value={style[k]}
            onChange={(e) => change({ [k]: +e.target.value })}
          />
        </label>
      ))}
      <label>
        <input
          type="checkbox"
          checked={style.locked}
          onChange={(e) => change({ locked: e.target.checked })}
        />
        {t("lock")}
      </label>
      <button
        disabled={style.locked}
        onClick={() => change(config.defaultStyle)}
      >
        {t("reset")}
      </button>
    </>
  );
}
