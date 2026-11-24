import {useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Link, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {z} from "zod";
import {apiMediaBlob, getIdentitySnapshot, ProcessingSpinner, uploadGenerationReference, useActor, type HistoryItem} from "../../../lib/canonical";
import {MediaImage} from "../../../components/media/MediaImage";
import {getCinematicProject} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import {upsertCinematicSharedCharacter} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {storyKeys} from "../data/storyQueryKeys";
import {Dialog} from "../../dub-sub/Dialog";
import {readReference} from "./StoryCharacters";

const targetSchema = z.object({projectId:z.string(),ownerId:z.string(),characterId:z.string(),name:z.string(),updatedAt:z.string()});
export type CharacterImageTarget = z.infer<typeof targetSchema>;

export async function saveCharacterReference(target:CharacterImageTarget,imageUrl:string,changedMessage:string) {
  const epoch = getIdentitySnapshot().epoch;
  const root = await getCinematicProject(target.ownerId);
  const project = root.id===target.projectId ? root : await getCinematicProject(target.projectId);
  const current = root.castAssignments.find(member=>member.id===target.characterId && member.active);
  if (!current || current.sourceType!=="dossier" || current.updatedAt!==target.updatedAt) throw new Error(changedMessage);
  const blob = await apiMediaBlob(imageUrl);
  const data = await readReference(blob);
  if (getIdentitySnapshot().epoch!==epoch) return;
  const asset = await uploadGenerationReference(data,"character_reference","story-character");
  if (getIdentitySnapshot().epoch!==epoch) return;
  const result = await upsertCinematicSharedCharacter(project.id,current.id,{
    sourceType:"dossier", storyRoleSlotId:current.storyRoleSlotId ?? undefined,
    displayName:current.displayName, storyRole:current.storyRole, storyImportance:current.storyImportance,
    objective:current.objective, motivation:current.motivation, pressure:current.pressure,
    personalityTraits:current.personalityTraits, storyCharacterDetails:current.storyCharacterDetails,
    expectedProjectVersion:project.version, expectedStoryProjectVersion:root.version,
    storyOnly:true, storyReferenceAssetId:asset.referenceId
  });
  if (getIdentitySnapshot().epoch===epoch) return result;
}

export function CharacterImageReturn({target,item}:{target:unknown;item:HistoryItem|null}) {
  const parsed = targetSchema.safeParse(target);
  if (!parsed.success) return null;
  return <CharacterResult target={parsed.data} item={item}/>;
}

function CharacterResult({target,item}:{target:z.infer<typeof targetSchema>;item:HistoryItem|null}) {
  const {identityScope} = useActor();
  const {t} = useTranslation("story");
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [review,setReview] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const owner = useQuery({queryKey:storyKeys.project(identityScope,target.ownerId),enabled:review,
    queryFn:()=>getCinematicProject(target.ownerId)});
  const person = owner.data?.castAssignments.find(member=>member.id===target.characterId && member.active);
  const back = `/story/${encodeURIComponent(target.projectId)}?step=characters&character=${encodeURIComponent(target.characterId)}`;

  async function apply() {
    if (busy || !item?.imageUrl) return;
    const epoch = getIdentitySnapshot().epoch;
    setBusy(true);
    setError("");
    try {
      const result = await saveCharacterReference(target,item.imageUrl,t("storyCast.changed"));
      if (!result || getIdentitySnapshot().epoch!==epoch) return;
      cache.setQueryData(storyKeys.project(identityScope,target.projectId),result.project);
      cache.setQueryData(storyKeys.project(identityScope,target.ownerId),result.storyProject);
      navigate(back);
    } catch (cause) {
      if (getIdentitySnapshot().epoch===epoch) setError((cause as Error).message);
    } finally { setBusy(false); }
  }

  return <section className="handoff-panel">
    <strong>{t("storyCast.looksheetFor",{name:target.name})}</strong>
    <button disabled={!item?.imageUrl || busy} onClick={()=>{setError("");setReview(true);}}>
      {t("storyCast.reviewImage")}
    </button>
    <Link to={back}>{t("storyCast.return")}</Link>
    {review && <Dialog label={t("storyCast.looksheetFor",{name:target.name})} onClose={()=>{if(!busy)setReview(false);}}>
      <div className="story-dialog">
        <h2>{t("storyCast.looksheetFor",{name:target.name})}</h2>
        <p>{t("storyCast.imageImpact")}</p>
        <div className="story-cast-images">
          <figure><figcaption>{t("storyCast.currentImage")}</figcaption>
            {person?.storyReference ? <MediaImage src={person.storyReference.imageUrl} alt={person.displayName}/> : <p>{t("storyCast.unspecified")}</p>}
          </figure>
          <figure><figcaption>{t("storyCast.newImage")}</figcaption>{item?.imageUrl && <MediaImage src={item.imageUrl} alt={target.name}/>}</figure>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="story-actions">
          <button disabled={busy} onClick={()=>setReview(false)}>{t("cancel")}</button>
          <button className="primary" disabled={busy || !person} onClick={()=>void apply()}>
            {busy && <ProcessingSpinner/>}{t("storyCast.useImage")}
          </button>
        </div>
      </div>
    </Dialog>}
  </section>;
}
