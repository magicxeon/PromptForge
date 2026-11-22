import {useTranslation} from "react-i18next";
import staging from "./staging-config.json";

export function SeedancePacingNote({count, seconds}: {count:number; seconds:number}) {
  const {t} = useTranslation("storyPrompt");
  const target = staging.seedancePacing;
  const crowded = count > target.shots && count * target.seconds > seconds * target.shots;
  return <p className={crowded ? "story-pacing crowded" : "story-pacing"}>
    {t("pacing.guide", target)} {crowded && t("pacing.redistribute")}
  </p>;
}
