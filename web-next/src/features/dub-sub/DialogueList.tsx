import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import config from "./editorConfig";
import { timeLabel, type Cue } from "./projectApi";
export function DialogueList({
  cues,
  language,
  languages,
  activeId,
  selected,
  following,
  reveal,
  onSelect,
  onUpdate,
  onLanguage,
  onAdd,
  sourceLocked,
  targetLocked,
  timingLocked,
  onTranscribe,
  canTranscribe,
}: {
  cues: Cue[];
  language: string;
  languages: string[];
  activeId?: string;
  selected: string;
  following: boolean;
  reveal?: { id: string };
  onSelect: (c: Cue) => void;
  onUpdate: (c: Cue) => void;
  onLanguage: (l: string) => void;
  onAdd: () => void;
  sourceLocked: boolean;
  targetLocked: boolean;
  timingLocked: boolean;
  onTranscribe?: () => void;
  canTranscribe?: boolean;
}) {
  const { t } = useTranslation("dub"),
    [search, setSearch] = useState(""),
    [editingId, setEditingId] = useState(""),
    [scroll, setScroll] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const originLabel = useMemo(() => {
    if (!cues.length) return "";
    const count = cues.filter(c => c.translationOrigins?.[language] === "gemini").length;
    if (count) return t(count === cues.length ? "scene.activeGemini" : "scene.activePartial", { matched: count, total: cues.length });
    if (cues.every(c => c.sourceOrigin === "gemini")) return t("scene.sourceGemini");
    return t("scene.activeUnspecified");
  }, [cues, language, t]);
  const filtered = useMemo(
    () =>
      cues.filter(
        (c) =>
          !search || c.id === editingId ||
          [c.text, ...Object.values(c.translations)]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [cues, search, editingId],
  );
  const height = config.transcriptRowPx,
    first = Math.min(filtered.length, Math.max(0, Math.floor(scroll / height) - 3)),
    count = config.transcriptWindowRows;
  const visible = filtered.slice(first, first + count).map((cue, offset) => ({ cue, index: first + offset }));
  if (editingId && !visible.some(({ cue }) => cue.id === editingId)) {
    const index = filtered.findIndex((cue) => cue.id === editingId);
    if (index >= 0) {
      const pinned = { cue: filtered[index], index };
      if (index < first) visible.unshift(pinned);
      else visible.push(pinned);
    }
  }
  const lastReveal = useRef<typeof reveal>(undefined);
  useEffect(() => {
    const manual = reveal && reveal !== lastReveal.current;
    if (!manual && (!following || !activeId || search || editingId)) return;
    const el = container.current;
    if (!el) return;
    const target = manual ? reveal.id : activeId;
    const top = filtered.findIndex((c) => c.id === target) * height;
    if (manual && top < 0 && search) {
      setSearch("");
      return;
    }
    lastReveal.current = reveal;
    if (
      top >= 0 &&
      (top < el.scrollTop || top + height > el.scrollTop + el.clientHeight)
    )
      el.scrollTop = top;
  }, [following, activeId, filtered, height, search, reveal, editingId]);
  return (
    <section className="dub-script">
      <header>
        <h2>{t("script")}</h2>
        <select
          aria-label={t("target")}
          value={language}
          onChange={(e) => onLanguage(e.target.value)}
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {t("lang." + l)}
            </option>
          ))}
        </select>
      </header>
      {(originLabel || onTranscribe) && <div className="dub-transcript-actions">
        {originLabel && <small>{originLabel}</small>}
        {onTranscribe && <button type="button" disabled={!canTranscribe} onClick={onTranscribe}>
          {t(cues.length ? "scene.again" : "scene.title")}
        </button>}
      </div>}
      <input
        aria-label={t("search")}
        placeholder={t("search")}
        value={search}
        onChange={(e) => {
          setScroll(0);
          if (container.current) container.current.scrollTop = 0;
          setSearch(e.target.value);
        }}
      />
      <div
        className="dub-rows"
        ref={container}
        onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
      >
        <div className="dub-row-window" style={{ height: filtered.length * height }}>
          {visible.map(({ cue: c, index }) => (
            <div key={c.id} className={"dub-line" + (c.id === selected ? " selected" : "")}
              style={{ top: index * height, height }}
              aria-current={activeId === c.id ? "time" : undefined}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setEditingId("");
              }}>
              <button type="button" onClick={() => onSelect(c)} title={c.speaker || undefined}>
                {timeLabel(c.startMs)} – {timeLabel(c.endMs)} {c.speaker}
              </button>
              {["source", ...(languages.length ? [language] : [])].map((key) => {
                const original = key === "source";
                const label = original ? t("original") : t("lang." + key);
                return <textarea key={key} aria-label={label} placeholder={label} rows={1}
                  title={label} readOnly={original ? sourceLocked : targetLocked}
                  value={original ? c.text : c.translations[key] || ""}
                  onFocus={() => {
                    setEditingId(c.id);
                    if (selected !== c.id || activeId !== c.id) onSelect(c);
                  }}
                  onChange={(e) => {
                    if (original) {
                      onUpdate({ ...c, text: e.target.value, sourceOrigin: undefined });
                    } else {
                      const origins = { ...c.translationOrigins };
                      delete origins[key];
                      onUpdate({ ...c, translations: { ...c.translations, [key]: e.target.value }, translationOrigins: origins });
                    }
                  }} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <button disabled={timingLocked} onClick={onAdd}>
        ＋ {t("addCue")}
      </button>
    </section>
  );
}
