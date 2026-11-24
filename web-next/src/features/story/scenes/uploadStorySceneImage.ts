import {z} from "zod";
import {uploadGenerationReference, getIdentitySnapshot} from "../../../lib/canonical";
import {approveCinematicSceneEnvironment} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import settings from "./staging-config.json";

export const sceneImageTargetSchema=z.object({
  projectId:z.string().regex(/^[\w-]+$/).max(160),sceneId:z.string().regex(/^[\w-]+$/).max(160),
  expectedVersion:z.number().int().positive(),title:z.string().max(240),
  shot:z.object({id:z.string().regex(/^[\w-]+$/).max(160),version:z.number().int().positive()}).optional()
});

export async function uploadStorySceneImage(blob:Blob,target:Omit<z.infer<typeof sceneImageTargetSchema>,"title"> & {preserveReferenceSetting?:true},fileError:string,epoch=getIdentitySnapshot().epoch) {
  function checkIdentity() {
    const identity=getIdentitySnapshot();
    if(!identity.ready||identity.epoch!==epoch)throw new DOMException("Identity changed","AbortError");
  }
  checkIdentity();
  if(!settings.imageTypes.includes(blob.type)||!blob.size||blob.size>settings.maximumUploadBytes)throw new Error(fileError);
  const data=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error(fileError));
    reader.readAsDataURL(blob);
  });
  checkIdentity();
  const ref=await uploadGenerationReference(data,"style_reference","story-scene");
  checkIdentity();
  return approveCinematicSceneEnvironment(target.projectId,target.sceneId,{expectedVersion:target.expectedVersion,
    referenceAssetId:ref.referenceId,preserveReferenceSetting:target.preserveReferenceSetting});
}
