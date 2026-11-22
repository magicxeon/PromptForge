import {useTranslation} from "react-i18next";
import catalog from "../../../../server/config/cinematic/story-direction.v1.json";
import authoring from "../../../../server/config/cinematic/story-authoring.v1.json";
import {storyDirectionSchema, type StoryDirection,type CinematicProject} from "../../../../web/src/features/cinematic/schemas/cinematicSchemas";

export function initialDirection(project?:CinematicProject):StoryDirection {
  if (project?.writingSettings?.direction) return project.writingSettings.direction;
  const d = storyDirectionSchema.parse(catalog.defaults);
  if (!project) return d;
  const s = project.setup;
  return {...d, country:s.storyCountryStyle ?? d.country, period:s.storyPeriod, genre:Object.hasOwn(catalog.genres,s.genre)?s.genre:d.genre,
    tone:s.audienceFeeling, format:s.format==="mini-series"?"series":"standalone",
    aspectRatio:s.aspectRatio,targetSeconds:project.durationTargetMs/1000};
}

export function StoryDirectionFields({value,onChange}:{value:StoryDirection;onChange:(next:StoryDirection)=>void}) {
  const {t,i18n}=useTranslation("story");
  const locale=i18n.language.startsWith("th")?"th":"en";
  const options = {
    country:authoring.countryStyles.options.map(o=>[o.id,t("brief.countryStyleOptions."+o.id)]),
    period:authoring.periods.options.map(o=>[o.id,t("brief.periodOptions."+o.id)]),
    genre:Object.entries(catalog.genres).map(([id,item])=>[id,item[locale]]),
    tone:authoring.choices.audienceFeelings.ids.map(id=>[id,t("brief.feelingOptions."+id)]),
    format:Object.entries(catalog.formats).map(([id,item])=>[id,item[locale]]),
    aspectRatio:catalog.ratios.map(id=>[id,id]),
    destination:Object.entries(catalog.destinations),
    spokenLanguage:Object.entries(catalog.spokenLanguages).map(([id,item])=>[id,item[locale]])
  };
  if (!Object.hasOwn(catalog.spokenLanguages,value.spokenLanguage)) {
    options.spokenLanguage.push([value.spokenLanguage,value.spokenLanguage]);
  }
  return <div className="story-brief-grid">
    {(Object.keys(options) as (keyof typeof options)[]).map(key=><label key={key}>{t("brief."+key)}
      <select value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}>
        {options[key].map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select></label>)}
    <label>{t(value.format==="series"?"brief.targetEpisode":"brief.targetFilm")}
      <input required type="number" min={1} max={catalog.maxTargetSeconds} value={value.targetSeconds||""}
        onChange={e=>onChange({...value,targetSeconds:Number(e.target.value)})}/></label>
  </div>;
}
