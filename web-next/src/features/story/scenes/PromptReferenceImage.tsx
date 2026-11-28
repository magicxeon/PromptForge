import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {usePrivateImage} from "../../../components/media/MediaImage";
import {ProcessingSpinner} from "../../../lib/canonical";

export function usePromptReferenceImages(refs?: readonly {name:string; imageUrl?:string}[]) {
  const [loaded,setLoaded] = useState<Record<string,boolean>>({});
  const report = useCallback((src:string, ready:boolean) => {
    setLoaded(previous => previous[src] === ready ? previous : {...previous,[src]:ready});
  },[]);
  const pending = refs?.some(ref => !ref.imageUrl || !loaded[ref.imageUrl]) ?? false;
  return {report,pending};
}

export function PromptReferenceImage({src, name, report}: {
  src:string; name:string; report:(src:string, ready:boolean)=>void
}) {
  const {url,error,retry} = usePrivateImage(src);
  const {t} = useTranslation("storyPrompt");
  const [invalid,setInvalid] = useState("");
  useEffect(() => { if (error) report(src,false); },[error,src,report]);
  if (error || (url && invalid === url)) return <button type="button"
    onClick={()=>{setInvalid(""); retry();}} aria-label={name + " · " + t("retry")}>{t("imageUnavailable")} · {t("retry")}</button>;
  if (!url) return <ProcessingSpinner className="small-spinner"/>;
  return <img src={url} alt={name} onLoad={()=>report(src,true)}
    onError={()=>{setInvalid(url); report(src,false);}}/>;
}
