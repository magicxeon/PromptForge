import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "./editorConfig";
import type { Track } from "./projectApi";
import { subtitleFamily } from "./subtitleFonts";
import { wrapSubtitle } from "../../../../server/domain/dub-sub/subtitleLayout.js";

export function SubtitleCaption({ language, track, script, text, changeY, disabled, aspectRatio }: {
  language: string;
  track: Track;
  script: string;
  text: string;
  aspectRatio: number;
  changeY: (value: number) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation("dub");
  const drag = useRef<{ pointer: number; start: number; y: number; height: number; min: number } | undefined>(undefined);
  const [preview, setPreview] = useState<number>();
  const locked = track.locked || disabled;
  const y = locked ? track.y : preview ?? track.y;
  const { size, x, font, maxChars } = track;
  const caption = useMemo(() => wrapSubtitle(text, script, { size, x, font, maxChars }, aspectRatio),
    [text, script, size, x, font, maxChars, aspectRatio]);
  function bounds(element: HTMLElement) {
    const height = element.parentElement!.getBoundingClientRect().height;
    const min = height ? Math.min(100, Math.ceil(100 * element.getBoundingClientRect().height / height)) : 0;
    return { height, min };
  }
  function draggedY(clientY: number) {
    const gesture = drag.current!;
    if (clientY === gesture.start) return gesture.y;
    return Math.round(Math.min(100, Math.max(gesture.min, gesture.y + 100 * (clientY - gesture.start) / gesture.height)));
  }
  function clearDrag() {
    drag.current = undefined;
    setPreview(undefined);
  }
  const label = t("captionPosition", { language: t("lang." + language) });
  return <div className="dub-caption" lang={script} role="slider" tabIndex={locked ? -1 : 0}
    aria-disabled={locked} aria-label={label} title={label}
    aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100} aria-valuenow={y}
    style={{ left: track.x + "%", top: y + "%", fontSize: track.size / 10.8 + "cqh",
      color: track.color === "yellow" ? config.colors.yellow : config.colors.white,
      fontFamily: subtitleFamily(track.font, script), maxWidth: "96%" }}
    onPointerDown={(e) => {
      if (locked || !e.isPrimary || e.button !== 0) return;
      const box = bounds(e.currentTarget);
      if (!box.height) return;
      drag.current = { pointer: e.pointerId, start: e.clientY, y: track.y, ...box };
      e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={(e) => {
      if (!locked && drag.current?.pointer === e.pointerId) setPreview(draggedY(e.clientY));
    }}
    onPointerUp={(e) => {
      if (drag.current?.pointer !== e.pointerId) return;
      const value = draggedY(e.clientY);
      clearDrag();
      if (!locked && value !== track.y) changeY(value);
    }}
    onLostPointerCapture={clearDrag} onPointerCancel={clearDrag}
    onKeyDown={(e) => {
      if (e.key === "Escape") { clearDrag(); return; }
      if (locked || !["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const { min } = bounds(e.currentTarget);
      const next = e.key === "Home" ? min : e.key === "End" ? 100 : y + (e.key === "ArrowUp" ? -1 : 1);
      const value = Math.max(min, Math.min(100, next));
      if (value !== track.y) changeY(value);
    }}>
    {caption}
  </div>;
}
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
      {(["size", "maxChars"] as const).map((k) => (
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
      <label className="dub-track-lock">
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
