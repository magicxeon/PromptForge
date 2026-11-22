import {useTranslation} from "react-i18next";
import catalog from "../../../../../server/config/cinematic/story-direction.v1.json";

export function SceneDirectionSummary({scene}:{scene:{sceneEvents?:string[];lighting?:string;audioIntent?:string}}) {
  const {t,i18n}=useTranslation("story");
  const locale=i18n.language.startsWith("th")?"th":"en";
  const events=Object.entries(catalog.sceneEvents).filter(([id])=>scene.sceneEvents?.includes(id)).map(([,label])=>label[locale]);
  if (!events.length && !scene.lighting && !scene.audioIntent) return null;
  return <details><summary>{t("stage.sceneDirection")}</summary><dl>
    {events.length>0&&<><dt>{t("stage.sceneEvents")}</dt><dd>{events.join(" · ")}</dd></>}
    {scene.lighting&&<><dt>{t("stage.lighting")}</dt><dd>{scene.lighting}</dd></>}
    {scene.audioIntent&&<><dt>{t("stage.audioIntent")}</dt><dd>{scene.audioIntent}</dd></>}
  </dl></details>;
}
