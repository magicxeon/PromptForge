import type { JSZipObject, JSZipStreamHelper } from "jszip";
import authoring from "../../../../server/config/cinematic/story-authoring.v1.json";

const limits=authoring.skillImport;
export type ImportedStorySkill={
  name:string; instruction:string; tasks:string[]; context?:string; references?:{name:string;text:string}[];
};

function parseSkill(text:string,fallback:string):ImportedStorySkill {
  const metadata=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
  const name=(metadata?.[1].match(/^name:\s*(.+)$/mu)?.[1] || fallback).trim().replace(/^["']|["']$/g,"");
  const instruction=text.slice(metadata?.[0].length ?? 0).trim();
  if(!name || name.length>120 || !instruction || instruction.length>limits.instructionCharacters) throw Error("invalid");
  const tasks=Object.entries(limits.taskHints).filter(([,terms])=>terms.some(term=>name.toLowerCase().includes(term))).map(([task])=>task);
  return {name,instruction,tasks};
}

async function readEntry(file:JSZipObject):Promise<string> {
  const chunks:Uint8Array[]=[];
  let bytes=0;
  const stream=(file as JSZipObject & {internalStream(type:"uint8array"):JSZipStreamHelper<Uint8Array>}).internalStream("uint8array");
  await new Promise<void>((resolve,reject)=>{
    stream.on("data",chunk=>{
      bytes+=chunk.length;
      if(bytes>limits.markdownBytes){stream.pause();reject(Error("large"));return;}
      chunks.push(chunk);
    }).on("error",reject).on("end",resolve).resume();
  });
  const buffer=new Uint8Array(bytes);
  let offset=0;
  for(const part of chunks){buffer.set(part,offset);offset+=part.length;}
  return new TextDecoder("utf-8",{fatal:true}).decode(buffer);
}

export async function readStorySkillFile(file:File):Promise<ImportedStorySkill[]> {
  if(/\.md$/i.test(file.name)){
    if(file.size>limits.markdownBytes) throw Error("large");
    return [parseSkill(await file.text(),file.name.replace(/\.md$/i,""))];
  }
  if(!/\.zip$/i.test(file.name) || file.size>limits.archiveBytes) throw Error("invalid");
  const {default:Zip}=await import("jszip");
  const archive=await Zip.loadAsync(await file.arrayBuffer());
  const entries=Object.values(archive.files);
  if(entries.length>limits.archiveEntries) throw Error("large");
  const files=entries.filter(entry=>!entry.dir && !(entry.unsafeOriginalName && entry.name!==entry.unsafeOriginalName));
  const skills=files.filter(entry=>/(?:^|\/)SKILL\.md$/i.test(entry.name));
  if(!skills.length) throw Error("invalid");
  let consumed=0;
  async function read(entry:JSZipObject){
    const text=await readEntry(entry);
    consumed+=new TextEncoder().encode(text).length;
    if(consumed>limits.totalMarkdownBytes) throw Error("large");
    return text;
  }
  const result=[];
  for(const skill of skills){
    const folder=skill.name.slice(0,-"SKILL.md".length);
    const item=parseSkill(await read(skill),folder.split("/").filter(Boolean).pop() || "SKILL");
    const refs=files.filter(entry=>entry.name.startsWith(folder)
      && /^references\/(?!SKILL\.md$)[^/]+\.md$/i.test(entry.name.slice(folder.length)));
    if(refs.length>limits.maxReferences) throw Error("large");
    item.references=[];
    for(const ref of refs){
      const name=ref.name.slice(folder.length);
      const text=await read(ref);
      if(name.length>200 || text.length>limits.referenceCharacters) throw Error("large");
      item.references.push({name,text});
    }
    result.push(item);
  }
  return result;
}
