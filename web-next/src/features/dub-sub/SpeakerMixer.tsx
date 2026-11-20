import { useTranslation } from "react-i18next";
import type { Project } from "./projectApi";
export type MixLevel = { gain: number; mute: boolean; solo: boolean };
const defaults: MixLevel = { gain: 1, mute: false, solo: false };
const levelFor = (levels: Record<string, MixLevel>, speaker: string) =>
  Object.hasOwn(levels, speaker) ? levels[speaker] : defaults;
export function speakerGain(track: Record<string, MixLevel>, speaker: string) {
  const level = levelFor(track, speaker);
  return level.mute || (Object.values(track).some((s) => s.solo) && !level.solo)
    ? 0
    : level.gain;
}
export function SpeakerMixer({
  p,
  language,
  change,
}: {
  p: Project;
  language: string;
  change: (value: Project["mixer"]) => void;
}) {
  const { t } = useTranslation("dub");
  const speakers = [
    ...new Set(p.cues.map((c) => c.speaker).filter((x): x is string => !!x)),
  ];
  if (!speakers.length) return null;
  const levels = p.mixer[language] || {};
  const set = (s: string, v: Partial<MixLevel>) =>
    change({
      ...p.mixer,
      [language]: { ...levels, [s]: { ...levelFor(levels, s), ...v } },
    });
  return (
    <details>
      <summary>{t("mixer")}</summary>
      {speakers.map((s) => {
        const level = levelFor(levels, s);
        return (
          <fieldset key={s}>
            <legend>{s}</legend>
            <button
              aria-pressed={level.mute}
              onClick={() => set(s, { mute: !level.mute })}
            >
              {t("mute")}
            </button>
            <button
              aria-pressed={level.solo}
              onClick={() => set(s, { solo: !level.solo })}
            >
              {t("solo")}
            </button>
            <label>
              {t("gain")}
              <input
                type="range"
                min={0}
                max={2}
                step=".05"
                value={level.gain}
                onChange={(e) => set(s, { gain: +e.target.value })}
              />
            </label>
          </fieldset>
        );
      })}
    </details>
  );
}
