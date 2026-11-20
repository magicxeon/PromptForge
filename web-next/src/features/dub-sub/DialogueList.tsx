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
  onLanguage,
  onAdd,
  locked,
}: {
  cues: Cue[];
  language: string;
  languages: string[];
  activeId?: string;
  selected: string;
  following: boolean;
  reveal?: { id: string };
  onSelect: (c: Cue) => void;
  onLanguage: (l: string) => void;
  onAdd: () => void;
  locked: boolean;
}) {
  const { t } = useTranslation("dub"),
    [search, setSearch] = useState(""),
    [scroll, setScroll] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () =>
      cues.filter(
        (c) =>
          !search ||
          [c.text, ...Object.values(c.translations)]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [cues, search],
  );
  const height = config.transcriptRowPx,
    first = Math.max(0, Math.floor(scroll / height) - 3),
    count = config.transcriptWindowRows;
  const lastReveal = useRef<typeof reveal>(undefined);
  useEffect(() => {
    const manual = reveal && reveal !== lastReveal.current;
    if (!manual && (!following || !activeId || search)) return;
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
  }, [following, activeId, filtered, height, search, reveal]);
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
        <div style={{ height: first * height }} />
        {filtered.slice(first, first + count).map((c) => (
          <button
            key={c.id}
            style={{ height }}
            className={c.id === selected ? "selected" : ""}
            aria-current={activeId === c.id ? "time" : undefined}
            onClick={() => onSelect(c)}
          >
            <small>
              {timeLabel(c.startMs)} – {timeLabel(c.endMs)} {c.speaker}
            </small>
            <strong>{c.text || "…"}</strong>
            <span>{c.translations[language] || "—"}</span>
          </button>
        ))}
        <div
          style={{
            height: Math.max(0, filtered.length - first - count) * height,
          }}
        />
      </div>
      <button disabled={locked} onClick={onAdd}>
        ＋ {t("addCue")}
      </button>
    </section>
  );
}
