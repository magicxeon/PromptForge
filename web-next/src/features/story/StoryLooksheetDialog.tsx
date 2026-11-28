import {useState} from "react";
import {useTranslation} from "react-i18next";
import {apiMediaBlob, getIdentitySnapshot, GenerationModelPicker, ProcessingSpinner} from "../../lib/canonical";
import {MediaImage} from "../../components/media/MediaImage";
import {Dialog} from "../dub-sub/Dialog";
import {useImageWorkspace} from "../playground/hooks/useImageWorkspace";
import {PromptEditor} from "../playground/components/PromptEditor";
import {ReferenceEditor} from "../playground/components/ReferenceEditor";
import {referenceUrl} from "../playground/state/imageDraft";

export function StoryLooksheetDialog({name,title,session,reference,subtitle,close,save,saveError,sceneTools,skills=[]}:{
  skills?:{id:string;name:string;instruction:string;selected:boolean}[];
  name:string; title:string; session:NonNullable<Parameters<typeof useImageWorkspace>[0]>;
  reference?:{imageUrl:string}; subtitle?:string;
  close:()=>void; save:(image:string)=>Promise<boolean>; saveError?:string;
  sceneTools?:{useImageLabel:string; suggest:(prompt:string)=>Promise<string|undefined>; refreshRequired:boolean; reviewLatest:()=>void};
}) {
  const {t,i18n}=useTranslation("story");
  const {t:labels}=useTranslation();
  const {draft,setDraft,...workspace}=useImageWorkspace(session);
  const [saving,setSaving]=useState(false);
  const [addingReference,setAddingReference]=useState(false);
  const [suggesting,setSuggesting]=useState(false);
  const [suggestion,setSuggestion]=useState("");
  const [localError,setLocalError]=useState("");
  const [reviewedVersion,setReviewedVersion]=useState<string>();
  const [zoom,setZoom]=useState<string>();
  const [portalContainer,setPortalContainer]=useState<HTMLDivElement|null>(null);
  const label=(text:string|Record<string,string>)=>typeof text==="string" ? text : text[i18n.language] || text.en || Object.values(text)[0];
  const options=workspace.models.map(({provider,model})=>({
    providerId:provider.id, modelId:model.id, providerLabel:label(provider.displayName), modelLabel:label(model.displayName)
  }));
  const currentModel=workspace.selected?.model;
  const child=workspace.group.data?.children.find(item=>item.status==="completed" && item.result?.imageUrl);
  const image=workspace.terminal ? (workspace.job.data?.status==="completed" ? workspace.job.data.result?.imageUrl : child?.result?.imageUrl) : undefined;
  const jobError=workspace.job.data?.error || workspace.group.data?.children.find(item=>item.error)?.error;
  const active=Boolean(workspace.intent && !workspace.terminal && !workspace.unresolved);
  const locked=workspace.busy || saving || addingReference || suggesting;
  const sourceChanged=Boolean(session.sourceVersion && workspace.intent?.sourceVersion &&
    workspace.intent.sourceVersion!==session.sourceVersion && reviewedVersion!==session.sourceVersion);
  const needsReview=Boolean(sceneTools?.refreshRequired || sourceChanged);
  const issue=workspace.error || (workspace.incompatible ? labels("invalid") : "") ||
    (workspace.preview.data?.promptBudget?.status==="over_limit" ? labels("promptLimit") : "") ||
    (workspace.processing.isError || (workspace.processing.data && !workspace.processingAccepted && !workspace.processing.isFetching) ? labels("processingError") : "") ||
    (workspace.preview.isError ? labels("previewUnavailable") : "") ||
    (typeof jobError==="string" ? jobError : jobError?.message);
  async function apply() {
    if (!image || locked || needsReview) return;
    setSaving(true);
    setLocalError("");
    try {
      if (await save(image)) {
        if (sceneTools) workspace.clearCompletedIntent();
        close();
      }
    } catch (cause) {setLocalError((cause as Error).message);}
    finally {setSaving(false);}
  }
  async function addSceneReference() {
    if (!reference || locked) return;
    const epoch=getIdentitySnapshot().epoch;
    setLocalError("");setAddingReference(true);
    try {
      const blob=await apiMediaBlob(reference.imageUrl);
      if (getIdentitySnapshot().epoch === epoch) {
        await workspace.upload(new File([blob],name,{type:blob.type}),"style_reference");
      }
    } catch (cause) {setLocalError((cause as Error).message);}
    finally {setAddingReference(false);}
  }
  async function suggest() {
    if (!sceneTools || locked) return;
    setLocalError("");setSuggesting(true);
    try {setSuggestion(await sceneTools.suggest(draft.prompt) || "");}
    catch (cause) {setLocalError((cause as Error).message);}
    finally {setSuggesting(false);}
  }
  return <Dialog label={title} onClose={()=>{if(!locked)close();}}>
    <div className="story-dialog story-looksheet-dialog" ref={setPortalContainer}>
      <header className="story-bar"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <button disabled={locked} onClick={close}>{labels("close")}</button></header>
      <div className="story-looksheet-grid">
        <fieldset disabled={locked}>
          <GenerationModelPicker options={options} providerId={draft.provider} modelId={draft.model} portalContainer={portalContainer}
            onChange={({providerId,modelId})=>{
              const model=workspace.models.find(item=>item.provider.id===providerId && item.model.id===modelId)?.model;
              if(!model)return;
              setDraft(value=>({...value,provider:providerId,model:modelId,
                ratio:model.capabilities.aspectRatios.includes(value.ratio) ? value.ratio : model.capabilities.aspectRatios[0] || "1:1",
                resolution:model.defaults?.resolution || model.capabilities.resolutions?.[0] || ""}));
            }}/>
          {workspace.catalog.isError && <button onClick={()=>void workspace.catalog.refetch()}>{labels("retry")}</button>}
          <PromptEditor compact value={draft.prompt} onChange={prompt=>setDraft(value=>({...value,prompt}))}
            hardLimit={workspace.preview.data?.promptBudget?.hardLimit}/>
          {skills.length>0 && <details><summary>{t("skillsUsed")}</summary>{skills.map(skill=><label key={skill.id}>
            <input type="checkbox" checked={draft.prompt.includes(skill.instruction)} onChange={e=>{
              const checked=e.target.checked;
              setDraft(value=>({...value,prompt:checked?[value.prompt,skill.instruction].filter(Boolean).join("\n"):
                value.prompt.replace(skill.instruction,"").replace(/\n{3,}/g,"\n\n").trim()}));
            }}/>{skill.name}</label>)}</details>}
          {sceneTools && <div className="story-actions">
            <button type="button" onClick={()=>void suggest()}>{t("stage.suggestSetting")}</button>
            {suggesting && <span role="status"><ProcessingSpinner/> {t("processing")}</span>}
          </div>}
          {suggestion && <div className="story-note">
            <p className="story-prose">{suggestion}</p>
            <button type="button" onClick={()=>{
              setDraft(value=>({...value,prompt:[value.prompt,suggestion].filter(Boolean).join("\n\n")}));
              setSuggestion("");
            }}>{t("stage.addSettingSuggestion")}</button>
            <button type="button" onClick={()=>setSuggestion("")}>{labels("close")}</button>
          </div>}
          <ReferenceEditor references={draft.references} max={currentModel?.capabilities.maxReferenceImages || 0}
            supported={currentModel?.capabilities.imageReferences || false}
            upload={(file,role)=>void workspace.upload(file,role)} inspect={item=>setZoom(referenceUrl(item))}
            remove={id=>setDraft(value=>({...value,references:value.references.filter(item=>item.id!==id)}))}/>
          {workspace.creditsEnabled && <p role="status">
            {workspace.quoteCurrent ? labels("estimate",{count:workspace.estimate.data?.estimate.estimatedCredits || 0}) : labels("estimating")}
            {workspace.quoteCurrent && !workspace.estimate.data?.account.canAfford && <> · {labels("insufficient")}</>}
            {(workspace.estimate.isError || (!workspace.quoteCurrent && workspace.estimate.data && !workspace.estimate.isFetching)) &&
              <button onClick={()=>void workspace.estimate.refetch()}>{labels("quoteError")}</button>}
          </p>}
          <div className="story-actions"><button className="primary" disabled={!workspace.canGenerate || active}
            onClick={()=>void workspace.generate()}>{labels("generate")}</button>
            {workspace.unresolved && <button disabled={workspace.checking} onClick={()=>void workspace.check()}>{labels("check")}</button>}
          </div>
          {(workspace.busy || workspace.intent) && <p role="status">{(workspace.busy || active) && <ProcessingSpinner/>}
            {workspace.unresolved && !workspace.busy ? labels("unknown") : labels(`status_${workspace.status || "queued"}`)}</p>}
          {(workspace.job.isError || workspace.group.isError) && <p role="alert">
            {(workspace.job.error || workspace.group.error)?.message}
            <button type="button" onClick={()=>void (workspace.intent?.groupId ? workspace.group.refetch() : workspace.job.refetch())}>
              {labels("retry")}
            </button>
          </p>}
          {(localError || saveError || issue) && <p role="alert">{localError || saveError || issue}</p>}
        </fieldset>
        <div className="story-looksheet-previews">
          <figure><figcaption>{t("storyCast.currentImage")}</figcaption>
            {reference ? <button className="story-full-preview" aria-label={labels("expand")} onClick={()=>setZoom(reference.imageUrl)}>
              <MediaImage src={reference.imageUrl} alt={name}/></button> : <p>{t("storyCast.noImage")}</p>}
            {reference && sceneTools && <button type="button" disabled={locked || !currentModel?.capabilities.imageReferences
              || draft.references.length >= currentModel.capabilities.maxReferenceImages
              || draft.references.some(ref=>ref.role==="style_reference")} onClick={()=>void addSceneReference()}>
              {addingReference && <ProcessingSpinner/>}{t("stage.useCurrentAsInput")}
            </button>}
          </figure>
          {image && <figure><figcaption>{t("storyCast.newImage")}</figcaption>
            <button className="story-full-preview" aria-label={labels("expand")} onClick={()=>setZoom(image)}>
              <MediaImage src={image} alt={name}/></button>
            {sceneTools && needsReview && <div className="story-note" role="status">
              <p>{t("stage.reviewChangedSetting")}</p>
              <button disabled={locked} onClick={()=>{
                setReviewedVersion(session.sourceVersion);
                sceneTools.reviewLatest();
              }}>{t("stage.keepResultAfterReview")}</button>
            </div>}
            {!sceneTools && <small>{t("storyCast.imageImpact")}</small>}
            <button className="primary" disabled={locked || needsReview} onClick={()=>void apply()}>
              {saving && <ProcessingSpinner/>}{sceneTools?.useImageLabel ?? t("storyCast.useImage")}
            </button>
          </figure>}
        </div>
      </div>
    </div>
    {zoom && <Dialog label={name} onClose={()=>setZoom(undefined)}>
      <div className="story-dialog story-image-zoom">
        <button onClick={()=>setZoom(undefined)}>{labels("close")}</button><MediaImage src={zoom} alt={name}/>
      </div>
    </Dialog>}
  </Dialog>;
}
