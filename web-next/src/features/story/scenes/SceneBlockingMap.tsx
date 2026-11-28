import {useTranslation} from "react-i18next";

const positions = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"] as const;

export function SceneBlockingMap({value}: {value: string}) {
  const {t} = useTranslation("story");
  const placements = new Map<string, string[]>();
  for (const line of value.split(/\r?\n/)) {
    const match = /^(NW|NE|SW|SE|N|W|C|E|S)\s*:\s*(\S.*)$/i.exec(line.trim());
    if (!match) continue;
    const key = match[1].toUpperCase();
    placements.set(key, [...(placements.get(key) ?? []), match[2]]);
  }
  if (!placements.size) return null;
  return <figure className="story-compass"><figcaption>{t("blocking.diagram")}</figcaption>
    <div>{positions.map(key => <span key={key} data-used={placements.has(key)}>
      <b>{key}</b>{placements.get(key)?.join(" · ")}
    </span>)}</div>
  </figure>;
}
