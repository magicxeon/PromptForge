import {useState} from "react";
import {useTranslation} from "react-i18next";
import {GenerationModelPicker, ProcessingSpinner} from "../../../lib/canonical";
import {MediaImage} from "../../../components/media/MediaImage";
import {Dialog} from "../../dub-sub/Dialog";
import {useImageWorkspace} from "../../playground/hooks/useImageWorkspace";
import {PromptEditor} from "../../playground/components/PromptEditor";
import {ReferenceEditor} from "../../playground/components/ReferenceEditor";
import {emptyDraft, outputStorageKey, referenceUrl} from "../../playground/state/imageDraft";
import {saveCharacterReference, type CharacterImageTarget} from "./CharacterImageReturn";
import type {RunWriting} from "../data/useStoryWorkspace";

export function CharacterLooksheetDialog({target,prompt,reference,outfit,close,run,saveError}:{
  target:CharacterImageTarget; prompt:string; reference?:{assetId:string;imageUrl:string}; outfit:string;
  close:()=>void; run:RunWriting; saveError:string;
}) {
  const {t,i18n}=useTranslation("story");
  const {t:labels}=useTranslation();
  const {draft,setDraft,...workspace}=useImageWorkspace({
    scope:JSON.stringify(["looksheet",target.ownerId,target.characterId,target.updatedAt]),
    replaceReferenceOutfit:Boolean(outfit),
    initialDraft:{...emptyDraft,prompt,references:reference ? [{
      id:reference.assetId,role:"character_reference",name:target.name,status:"ready",
      storageKey:outputStorageKey(reference.imageUrl)
    }] : []}
  });
  const [saving,setSaving]=useState(false);
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
  const title=t("storyCast.looksheetFor",{name:target.name});
  const issue=workspace.error || (workspace.incompatible ? labels("invalid") : "") ||
    (workspace.preview.data?.promptBudget?.status==="over_limit" ? labels("promptLimit") : "") ||
    (workspace.processing.isError || (workspace.processing.data && !workspace.processingAccepted && !workspace.processing.isFetching) ? labels("processingError") : "") ||
    (workspace.preview.isError ? labels("previewUnavailable") : "") ||
    (typeof jobError==="string" ? jobError : jobError?.message);
  function apply() {
    if (!image || saving) return;
    setSaving(true);
    void run(async()=>{
      const result=await saveCharacterReference(target,image,t("storyCast.changed"));
      if (result) close();
      return result;
    }).finally(()=>setSaving(false));
  }
  return <Dialog label={title} onClose={()=>{if(!workspace.busy && !saving)close();}}>
    <div className="story-dialog story-looksheet-dialog" ref={setPortalContainer}>
      <header className="story-bar"><div><h2>{title}</h2>{outfit && <p>{outfit}</p>}</div>
        <button disabled={workspace.busy || saving} onClick={close}>{labels("close")}</button></header>
      <div className="story-looksheet-grid">
        <fieldset disabled={workspace.busy || saving}>
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
          {(issue || saveError) && <p role="alert">{saveError || issue}</p>}
        </fieldset>
        <div className="story-looksheet-previews">
          <figure><figcaption>{t("storyCast.currentImage")}</figcaption>
            {reference ? <button className="story-full-preview" aria-label={labels("expand")} onClick={()=>setZoom(reference.imageUrl)}>
              <MediaImage src={reference.imageUrl} alt={target.name}/></button> : <p>{t("storyCast.noImage")}</p>}
          </figure>
          {image && <figure><figcaption>{t("storyCast.newImage")}</figcaption>
            <button className="story-full-preview" aria-label={labels("expand")} onClick={()=>setZoom(image)}>
              <MediaImage src={image} alt={target.name}/></button>
            <small>{t("storyCast.imageImpact")}</small>
            <button className="primary" disabled={saving} onClick={apply}>{saving && <ProcessingSpinner/>}{t("storyCast.useImage")}</button>
          </figure>}
        </div>
      </div>
    </div>
    {zoom && <Dialog label={target.name} onClose={()=>setZoom(undefined)}>
      <div className="story-dialog story-image-zoom">
        <button onClick={()=>setZoom(undefined)}>{labels("close")}</button><MediaImage src={zoom} alt={target.name}/>
      </div>
    </Dialog>}
  </Dialog>;
}
