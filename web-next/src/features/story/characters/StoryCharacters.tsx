import {lazy, Suspense, useEffect, useRef, useState, type FormEvent} from "react";
import {useTranslation} from "react-i18next";
import {useSearchParams} from "react-router-dom";
import {ProcessingSpinner, uploadGenerationReference, useActor} from "../../../lib/canonical";
import {MediaImage} from "../../../components/media/MediaImage";
import {Dialog} from "../../dub-sub/Dialog";
import {setCinematicChapterCharacters, upsertCinematicSharedCharacter} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import {cinematicFullStoryProposalSchema, type CinematicFullStoryProposal, type CinematicProject, type StoryCharacterDetails} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import {StoryRunSkillPicker,useTakeStoryRunSkills} from "../StoryRunSkills";
import {proposeCinematicFullStory} from "../../../../../web/src/features/cinematic/api/cinematicApi";
import type {RunWriting} from "../data/useStoryWorkspace";
import {saveCharacterReference} from "./CharacterImageReturn";
import {emptyDraft, outputStorageKey} from "../../playground/state/imageDraft";

type Member = CinematicProject["castAssignments"][number];
type Outfit = NonNullable<Member["storyOutfits"]>[number];
const StoryLooksheetDialog=lazy(()=>import("../StoryLooksheetDialog").then(module=>({default:module.StoryLooksheetDialog})));
const imageTypes = ["image/png", "image/jpeg", "image/webp"];
const maximumBytes = 12 * 1024 * 1024;

export function readReference(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

import authoring from "../../../../../server/config/cinematic/story-authoring.v1.json";
import {selectStorySkills,skillPromptText} from "../../../../../server/config/cinematic/selectStorySkills.js";
import type {CinematicWritingSettingsCatalog} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";

export function StoryCharacters({project, owner, catalog, run, error, busy}: {
  catalog?:CinematicWritingSettingsCatalog;
  project: CinematicProject; owner: CinematicProject; run: RunWriting; error: string; busy: boolean;
}) {
  const {t,i18n} = useTranslation("story");
  const {identityScope} = useActor();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<string[]>([]);
  const [batchMode,setBatchMode]=useState(false);
  const takeSkills=useTakeStoryRunSkills("full_story");
  const [looksheet,setLooksheet]=useState<{person:Member;prompt:string;outfit?:Outfit;skills:{id:string;name:string;instruction:string;selected:boolean}[]}>();
  const [reviewing, setReviewing] = useState(false);
  const [checking, setChecking] = useState(false);
  const key = JSON.stringify(["story-cast-review", identityScope, owner.id]);
  const [proposal, setProposal] = useState<CinematicFullStoryProposal | null>(() => {
    try {
      const parsed = cinematicFullStoryProposalSchema.safeParse(JSON.parse(sessionStorage.getItem(key) || "null"));
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  });
  useEffect(() => {
    try {
      if (proposal) sessionStorage.setItem(key, JSON.stringify({...proposal, fullStory:"Reviewed"}));
      else sessionStorage.removeItem(key);
    } catch { /* Review remains available while this screen is open. */ }
  }, [key, proposal]);
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const chapter = project.id !== owner.id;
  const members = owner.castAssignments.filter(person => person.active !== false);
  const chapterIds = project.chapterCharacterIds ?? [];
  const focused = members.find(member => member.id === params.get("character"));
  const candidate = proposal?.characters[0];
  const counts = {new:0, updated:0, match:0};
  for (const character of proposal?.characters ?? []) {
    if (members.some(person=>person.id===character.existingCharacterId)) counts.updated++;
    else if (matchingNames(character,members).length) counts.match++;
    else counts.new++;
  }
  async function check(ids?:string[]) {
    setChecking(true);
    try {
      await run(async () => {
        const result = await proposeCinematicFullStory(project.id, project.version, "", "characters",
          {scope:"whole_story", selectedCharacterIds:ids},takeSkills());
        setProposal(result);
        setReviewing(Boolean(result.characters.length));
      }, "draft");
    } finally { setChecking(false); }
  }
  function advance() {
    setProposal(value => value && {...value, characters:value.characters.slice(1)});
    if (proposal?.characters.length === 1) setReviewing(false);
  }
  function createLooksheet(person:Member, outfit?:Outfit) {
    const wardrobe=outfit?.name ?? "";
    const details = person.storyCharacterDetails;
    const direction = owner.writingSettings?.direction;
    const source={...person,description:[details?.appearance,wardrobe].filter(Boolean).join(" ")};
    const recommended=catalog?selectStorySkills(catalog,owner.writingSettings,"looksheet",source):[];
    const locale=i18n.language.startsWith("th")?"th":"en";
    const skills=(owner.writingSettings?.skillIds??[]).flatMap(id=>{
      const custom=owner.writingSettings?.customSkills?.find(skill=>skill.id===id);
      const base=catalog?.skills.find(skill=>skill.id===id);
      const instruction=custom?skillPromptText(custom,"looksheet",source,authoring.skillImport.promptCharacters):base?.instruction;
      return instruction?[{id,name:custom?.name??base?.label[locale]??id,instruction,selected:recommended.includes(id)}]:[];
    });
    const prompt = [
      `Create a production character looksheet for ${person.displayName}.`,
      "Use one consistent identity across full-body front and side views and a neutral face close-up, on a plain background.",
      person.storyRole, person.personalityTraits.join(", "), details?.appearance, wardrobe,
      direction ? [direction.country,direction.period,direction.visualStyle].filter(Boolean).join(", ") : "",
      ...recommended.map(id=>skills.find(skill=>skill.id===id)?.instruction)
    ].filter(Boolean).join("\n");
    setLooksheet({person,prompt,outfit,skills});
  }
  function uploadPhoto(person:Member,file:File,outfit?:Outfit) {
    void run(async()=>{
      if(!imageTypes.includes(file.type) || file.size>maximumBytes)throw new Error(t("invalidCharacterPhoto"));
      return saveCharacterReference({projectId:project.id,ownerId:owner.id,characterId:person.id,name:person.displayName,
        updatedAt:person.updatedAt},file,t("storyCast.changed"),outfit);
    });
  }
  function addToChapter(id: string) {
    void run(() => setCinematicChapterCharacters(project.id, project.version, [...chapterIds, id]));
  }

  return <section className="story-characters">
    <StoryRunSkillPicker task="full_story"/>
    <header className="story-bar story-cast-heading"><h2>{t("characters")}</h2><div className="story-actions">
      <button className="primary" disabled={busy || checking} onClick={() => void check()}>{t("storyCast.check")}</button>
      <button disabled={busy} onClick={() => setEditing("new")}>{t("addCharacter")}</button>
    </div>
    </header>
    <section className="story-cast-scan" aria-label={t("storyCast.scanTitle")}>
    <details key={proposal?.proposalId || "initial"} open={checking || Boolean(proposal?.characters.length) || undefined}>
    <summary>{t("storyCast.scanTitle")}{proposal && !proposal.characters.length && <span className="story-cast-scan-status">{t("storyCast.done")}</span>}</summary>
    <p>{t("storyCast.savedScope")}</p>
    {checking && <p role="status"><ProcessingSpinner/>{t("storyCast.reading")}</p>}
    {proposal && <div className="story-actions">
      <small>{t("storyCast.sources", {titles:proposal.sourceTitles?.join(" · ")})}</small>
      {proposal.characters.length > 0 && <>
        <span>{t("storyCast.reviewCounts",counts)}</span>
        <button onClick={()=>setReviewing(true)}>{t("storyCast.resume",{count:proposal.characters.length})}</button>
      </>}
    </div>}
    {!!proposal?.warnings.length && <details className="story-cast-notes">
      <summary>{t("storyCast.scanNotes")}</summary>
      <ul>{proposal.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>
    </details>}
    </details></section>
    {error && !editing && !reviewing && !looksheet && <p role="alert">{error}</p>}
    <div className="story-cast-workspace" data-detail={Boolean(focused) && !batchMode}>
    <section className="story-cast-roster" aria-label={t("storyCast.roster")}>
    <div className="story-bar story-cast-roster-heading"><h3>{t("storyCast.roster")}</h3>
    {members.some(person=>person.sourceType==="dossier") && <div className="story-actions story-cast-toolbar">
      <button aria-pressed={batchMode} disabled={busy} onClick={()=>{
        setBatchMode(!batchMode);
        setSelected([]);
        if(!batchMode)setParams({step:"characters"});
      }}>{t(batchMode?"storyCast.exitBatch":"storyCast.enterBatch")}</button>
      {selected.length > 0 && <button disabled={busy} onClick={()=>void check(selected)}>{t("storyCast.reviseSelected",{count:selected.length})}</button>}
    </div>}
    </div>
    {members.length === 0 && <p>{t("noCharacters")}</p>}
    <ul className="story-character-list story-cast-cards">{members.map(person => <li key={person.id}>
      <button className="story-cast-card" type="button" aria-label={person.displayName} aria-pressed={batchMode ? selected.includes(person.id) : focused?.id===person.id} onClick={()=>{
        if(batchMode){
          if(person.sourceType==="dossier")setSelected(ids=>ids.includes(person.id)?ids.filter(id=>id!==person.id):[...ids,person.id]);
          return;
        }
        setParams({step:"characters",character:person.id});
      }}>
        <span className="story-cast-card-image">{person.storyReference || person.portraitUrl
          ? <MediaImage src={person.storyReference?.imageUrl || person.portraitUrl || undefined} alt=""/>
          : <span aria-hidden="true">{Array.from(person.displayName)[0]}</span>}</span>
        <span className="story-cast-card-label"><strong>{person.displayName}</strong><small>{person.storyRole}</small></span>
      </button>
      <div className="story-actions">
        {batchMode && person.sourceType === "dossier" && <input type="checkbox" aria-label={t("storyCast.select",{name:person.displayName})}
          checked={selected.includes(person.id)} onChange={event=>setSelected(ids=>event.target.checked?[...ids,person.id]:ids.filter(id=>id!==person.id))}/>}
        {chapter && !chapterIds.includes(person.id) && <button onClick={() => addToChapter(person.id)}>{t("addCharacterToChapter")}</button>}
      </div>
    </li>)}</ul></section>
    {focused && !batchMode && <section className="story-cast-detail">
      <button className="story-cast-back" onClick={()=>setParams({step:"characters"})}>{t("characters")}</button>
      <header className="story-cast-profile-heading"><h3>{focused.displayName}</h3></header>
      {focused.sourceType==="dossier" && <div className="story-identity-reference">
        <div className="story-identity-photo">{focused.storyReference || focused.portraitUrl
          ? <MediaImage src={focused.storyReference?.imageUrl || focused.portraitUrl || undefined} alt={focused.displayName}/>
          : <span>{t("storyCast.noImage")}</span>}</div>
        <div><h4>{t("storyCast.outfitLibrary.identity")}</h4><div className="story-actions">
          <PhotoPicker busy={busy} onFile={file=>uploadPhoto(focused,file)}/>
          <button disabled={busy} onClick={()=>createLooksheet(focused)}>{t("storyCast.looksheet")}</button>
        </div></div>
      </div>}
      <OutfitLibrary key={focused.id} person={focused} busy={busy} upload={(file,item)=>uploadPhoto(focused,file,item)}
        generate={item=>createLooksheet(focused,item)} add={async name=>{
          let saved=false;
          await run(async()=>{
            const result=await upsertCinematicSharedCharacter(project.id,focused.id,{
              expectedProjectVersion:project.version,expectedStoryProjectVersion:owner.version,
              displayName:focused.displayName,storyRole:focused.storyRole,storyOutfit:{name}
            });
            saved=true;
            return result;
          });
          return saved;
        }}/>
      <CharacterDetails person={focused}/>
      {focused.sourceType==="dossier" && <footer className="story-cast-profile-actions">
      <div className="story-actions">
        <button onClick={()=>setEditing(focused)}>{t("editCharacter",{name:focused.displayName})}</button>
        <button disabled={busy} onClick={()=>void check([focused.id])}>{t("storyCast.revise")}</button>
      </div></footer>}
    </section>}</div>
    {reviewing && proposal && candidate && <CharacterReview key={`${proposal.proposalId}:${proposal.characters.length}`}
      candidate={candidate} remaining={proposal.characters.length} members={members} busy={busy} error={error} close={()=>setReviewing(false)} skip={advance}
      save={(member, profile)=>void run(async()=>{
        const result = await upsertCinematicSharedCharacter(project.id, member?.id ?? null, {
          expectedProjectVersion:project.version, expectedStoryProjectVersion:owner.version, sourceType:"dossier",
          storyOnly:true, characterSourceKey:proposal.sourceKey, storyRoleSlotId:member?.storyRoleSlotId ?? undefined,
          storyImportance:member?.storyImportance, objective:member?.objective || candidate.objective,
          motivation:member?.motivation || candidate.motivation, pressure:member?.pressure || candidate.pressure,
          ...profile
        });
        advance();
        return result;
      })}/>}
    {editing && <CharacterForm project={project} owner={owner} person={editing === "new" ? undefined : editing}
      run={run} close={() => setEditing(null)} error={error}/>}
    {looksheet && <Suspense fallback={<ProcessingSpinner/>}><StoryLooksheetDialog
      name={looksheet.person.displayName} title={t("storyCast.looksheetFor",{name:looksheet.person.displayName})}
      subtitle={looksheet.outfit?.name} reference={looksheet.outfit?.imageUrl?{imageUrl:looksheet.outfit.imageUrl}:looksheet.person.storyReference}
      outfitMode={Boolean(looksheet.outfit)}
      skills={looksheet.skills}
      session={{
        scope:JSON.stringify(["looksheet",owner.id,looksheet.person.id,looksheet.outfit?.id ?? "",looksheet.person.updatedAt]),
        replaceReferenceOutfit:Boolean(looksheet.outfit),
        initialDraft:{...emptyDraft,prompt:looksheet.prompt,references:looksheet.person.storyReference ? [{
          id:looksheet.person.storyReference.assetId,role:"character_reference",name:looksheet.person.displayName,status:"ready",
          storageKey:outputStorageKey(looksheet.person.storyReference.imageUrl)
        }] : []}
      }}
      close={()=>setLooksheet(undefined)} saveError={error} save={async image=>{
        let saved=false;
        await run(async()=>{
          const result=await saveCharacterReference({projectId:project.id,ownerId:owner.id,characterId:looksheet.person.id,
            name:looksheet.person.displayName,updatedAt:looksheet.person.updatedAt},image,t("storyCast.changed"),looksheet.outfit);
          saved=Boolean(result);
          return result;
        });
        return saved;
      }}/></Suspense>}
  </section>;
}

function PhotoPicker({busy,onFile}:{busy:boolean;onFile:(file:File)=>void}) {
  const {t}=useTranslation("story");
  const input=useRef<HTMLInputElement>(null);
  return <>
    <input hidden ref={input} type="file" accept={imageTypes.join(",")} onChange={event=>{
      const file=event.currentTarget.files?.[0];
      event.currentTarget.value="";
      if(file)onFile(file);
    }}/>
    <button type="button" disabled={busy} onClick={()=>input.current?.click()}>{t("storyCast.outfitLibrary.upload")}</button>
  </>;
}

function OutfitLibrary({person,busy,add,upload,generate}:{
  person:Member;busy:boolean;add:(name:string)=>Promise<boolean>;upload:(file:File,outfit:Outfit)=>void;generate:(outfit:Outfit)=>void;
}) {
  const {t}=useTranslation("story");
  const [name,setName]=useState("");
  const [adding,setAdding]=useState(false);
  const outfits=person.storyOutfits ?? [];
  const optionsId=`wardrobe-options-${person.id}`;
  return <section className="story-wardrobe-library">
    <div className="story-bar"><h4>{t("storyCast.outfitLibrary.title")}</h4>
      {!adding && <button type="button" onClick={()=>setAdding(true)}>{t("storyCast.outfitLibrary.add")}</button>}
    </div>
    {adding && <form className="story-outfit-form" onSubmit={async event=>{
      event.preventDefault();
      if(name.trim() && await add(name.trim())){setName("");setAdding(false);}
    }}>
      <label>{t("storyCast.outfitLibrary.name")}<input autoFocus required maxLength={100} list={optionsId} value={name} onChange={event=>setName(event.target.value)}/></label>
      <datalist id={optionsId}>{person.storyCharacterDetails?.wardrobe.split("\n").filter(Boolean).map((line,i)=><option key={i} value={line}/>)}</datalist>
      <div className="story-actions"><button className="primary" disabled={busy || !name.trim()}>{t("storyCast.outfitLibrary.save")}</button>
        <button type="button" disabled={busy} onClick={()=>setAdding(false)}>{t("cancel")}</button></div>
    </form>}
    {outfits.length ? <ul>{outfits.map(item=><li key={item.id}>
      <span className="story-outfit-thumbnail">{item.imageUrl && <MediaImage src={item.imageUrl} alt={item.name}/>}</span>
      <div><strong>{item.name}</strong>{!item.imageUrl && <small>{t("storyCast.noImage")}</small>}</div>
      <div className="story-actions"><PhotoPicker busy={busy} onFile={file=>upload(file,item)}/>
        <button disabled={busy} onClick={()=>generate(item)}>{t("storyCast.looksheet")}</button></div>
    </li>)}</ul> : <p>{t("storyCast.outfitLibrary.empty")}</p>}
  </section>;
}

type Candidate = CinematicFullStoryProposal["characters"][number];
function matchingNames(candidate:Candidate,members:Member[]) {
  const normalize = (name:string) => name.normalize("NFKC").trim().toLowerCase();
  const names = new Set([candidate.displayName,...(candidate.aliases || [])].map(normalize));
  return members.filter(person=>[person.displayName,...(person.storyCharacterDetails?.aliases || [])]
    .some(name=>names.has(normalize(name))));
}
const emptyDetails:StoryCharacterDetails = {aliases:[], appearance:"", wardrobe:"", development:"", mentionedOnly:false, evidence:[]};
const detailFields = ["appearance","wardrobe","development"] as const;

function CharacterDetails({person}:{person:Member}) {
  const {t} = useTranslation("story");
  const details = person.storyCharacterDetails ?? emptyDetails;
  return <div className="story-cast-profile-body">
    <section className="story-cast-profile-group">
    <h4>{t("storyCast.profileBasics")}</h4>
    <dl>
    <dt>{t("characterRole")}</dt><dd>{person.storyRole}</dd>
    <dt>{t("storyCast.personality")}</dt><dd>{person.personalityTraits.join(" · ") || t("storyCast.unspecified")}</dd>
    {details.aliases.length>0 && <><dt>{t("storyCast.aliases")}</dt><dd>{details.aliases.join(" · ")}</dd></>}
    <dt>{t("storyCast.development")}</dt><dd>{details.development || t("storyCast.unspecified")}</dd>
    </dl>
    {details.mentionedOnly && <p>{t("storyCast.mentioned")}</p>}
    </section>
    <section className="story-cast-profile-group story-cast-profile-visual">
      <h4>{t("storyCast.profileVisual")}</h4>
      <dl>
        <dt>{t("storyCast.appearance")}</dt><dd>{details.appearance || t("storyCast.unspecified")}</dd>
        <dt>{t("storyCast.wardrobe")}</dt><dd>{details.wardrobe || t("storyCast.unspecified")}</dd>
      </dl>
    </section>
    {!!details.evidence.length && <details className="story-cast-evidence">
      <summary>{t("storyCast.evidence")}</summary>
      <ul>{details.evidence.map(({title,quote},index)=><li key={index}><strong>{title}</strong> · {quote}</li>)}</ul>
    </details>}
  </div>;
}

type ReviewedProfile = {displayName:string; storyRole:string; personalityTraits:string[]; storyCharacterDetails:StoryCharacterDetails};

function CharacterReview({candidate,remaining,members,busy,error,close,skip,save}:{
  candidate:Candidate; remaining:number; members:Member[]; busy:boolean; error:string; close:()=>void; skip:()=>void;
  save:(member:Member|undefined,profile:ReviewedProfile)=>void;
}) {
  const {t} = useTranslation("story");
  const matched = members.find(person=>person.id===candidate.existingCharacterId);
  const possibleMatches = matchingNames(candidate,members);
  const [target,setTarget] = useState(matched?.id ?? (possibleMatches.length?"unresolved":""));
  const member = members.find(person=>person.id===target);
  const details = member?.storyCharacterDetails ?? emptyDetails;
  const [draft,setDraft] = useState({
    displayName:candidate.displayName,
    storyRole:candidate.storyRole,
    personality:candidate.personalityTraits.join(", "),
    aliases:candidate.aliases?.join(", ") || "",
    appearance:candidate.appearance || "",
    wardrobe:candidate.wardrobe || "",
    development:candidate.development || ""
  });
  const fields = {
    displayName:member?.displayName || "",
    storyRole:member?.storyRole || "",
    personality:member?.personalityTraits.join(", ") || "",
    aliases:details.aliases.join(", "), appearance:details.appearance, wardrobe:details.wardrobe, development:details.development
  };
  function update(field:keyof typeof draft, value:string) {
    setDraft(current=>({...current,[field]:value}));
  }
  function split(text:string, max:number) {
    return text.split(/[\n,]/).map(value=>value.trim().slice(0,120)).filter(Boolean).slice(0,max);
  }
  const fieldsToSave = {...draft};
  const rows = Object.keys(fields) as (keyof typeof draft)[];
  for (const field of rows) fieldsToSave[field] = draft[field].trim() || fields[field];
  const needsMatch = target==="unresolved";
  const duplicate = !member && members.some(person=>person.displayName.trim().toLowerCase()===fieldsToSave.displayName.trim().toLowerCase());
  const external = member && member.sourceType!=="dossier";
  return <Dialog label={t("storyCast.review")} onClose={()=>{if(!busy)close();}}>
    <form className="story-dialog story-character-form" onSubmit={event=>{
      event.preventDefault();
      if(busy || needsMatch || duplicate || external || !fieldsToSave.storyRole) return;
      save(member,{displayName:fieldsToSave.displayName, storyRole:fieldsToSave.storyRole,
        personalityTraits:split(fieldsToSave.personality,6), storyCharacterDetails:{
          aliases:split(fieldsToSave.aliases,12), appearance:fieldsToSave.appearance, wardrobe:fieldsToSave.wardrobe,
          development:fieldsToSave.development, mentionedOnly:candidate.mentionedOnly ?? details.mentionedOnly,
          evidence:candidate.evidence?.length ? candidate.evidence : details.evidence
        }});
    }}>
      <h2>{candidate.displayName}</h2>
      <p>{t("storyCast.progress",{count:remaining})}</p>
      <fieldset disabled={busy}>
        <label>{t("storyCast.match")}<select value={target} onChange={event=>setTarget(event.target.value)}>
          {possibleMatches.length>0 && <option value="unresolved">{t("storyCast.chooseMatch")}</option>}
          <option value="">{t("storyCast.new")}</option>
          {members.map(person=><option key={person.id} value={person.id}>{person.displayName}</option>)}
        </select></label>
        {candidate.mentionedOnly && <p>{t("storyCast.mentioned")}</p>}
        {candidate.evidence?.map((entry,index)=><blockquote key={index}><strong>{entry.title}</strong> · {entry.quote}</blockquote>)}
        {candidate.suggestedAppearance && <details>
          <summary>{t("storyCast.designSuggestion")}</summary>
          <p>{candidate.suggestedAppearance}</p>
          <button type="button" onClick={()=>update("appearance",[draft.appearance,candidate.suggestedAppearance].filter(Boolean).join("\n").slice(0,2000))}>
            {t("storyCast.useSuggestion")}
          </button>
        </details>}
        {rows.map(field=><div className="story-cast-field" key={field}>
          <label>{t(`storyCast.${field}`)}
            <textarea rows={field==="appearance"||field==="wardrobe"||field==="development"?3:1}
              value={draft[field]} placeholder={fields[field] || t("storyCast.unspecified")} maxLength={field==="displayName"?120:field==="storyRole"?240:2000}
              onChange={event=>update(field,event.target.value)}/>
          </label>
          {fields[field] && draft[field]!==fields[field] && <div className="story-actions">
            <small>{t("storyCast.current",{value:fields[field]})}</small>
            <button type="button" onClick={()=>update(field,fields[field])}>{t("storyCast.keep")}</button>
          </div>}
        </div>)}
        {(duplicate || external) && <p role="status">{t(external?"storyCast.external":"storyCast.duplicate")}</p>}
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={close}>{t("storyCast.pause")}</button>
          <button type="button" onClick={skip}>{t("storyCast.skip")}</button>
          <button className="primary" disabled={Boolean(needsMatch || duplicate || external || !fieldsToSave.storyRole)}>{t("storyCast.saveNext")}</button>
        </footer>
      </fieldset>
    </form>
  </Dialog>;
}

export function StoryCharacterIdentity({person, showPhoto = true}: {person: Member; showPhoto?: boolean}) {
  const image = showPhoto && person.storyReference?.imageUrl;
  return <span className="story-character-identity">
    {image && <MediaImage src={image} alt="" className="story-character-photo"/>}
    <span><strong>{person.displayName}</strong>{person.storyRole && <small>{person.storyRole}</small>}</span>
  </span>;
}

function CharacterForm({project, owner, person, run, close, error}: {
  project: CinematicProject; owner: CinematicProject; person?: Member; run: RunWriting; close: () => void; error: string;
}) {
  const {t} = useTranslation("story");
  const [name, setName] = useState(person?.displayName ?? "");
  const [role, setRole] = useState(person?.storyRole ?? "");
  const [details, setDetails] = useState(person?.storyCharacterDetails ?? emptyDetails);
  const [personality,setPersonality] = useState(person?.personalityTraits.join(", ") ?? "");
  const [file, setFile] = useState<File>();
  const [filePreview,setFilePreview]=useState("");
  const [expanded,setExpanded]=useState(false);
  const [uploadedId, setUploadedId] = useState<string>();
  const [fileError, setFileError] = useState(false);
  const [saving, setSaving] = useState(false);
  const label = person ? t("editCharacter", {name: person.displayName}) : t("addCharacter");
  useEffect(()=>{
    if (!file || fileError){setFilePreview("");return;}
    const url=URL.createObjectURL(file);
    setFilePreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file,fileError]);
  const previousImage=person?.storyReference?.imageUrl;
  function imagePreview() {
    return filePreview ? <img src={filePreview} alt={name}/> :
      previousImage ? <MediaImage src={previousImage} alt={name}/> : <p>{t("storyCast.noImage")}</p>;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || fileError || !name.trim() || !role.trim()) return;
    setSaving(true);
    void run(async () => {
      let assetId = uploadedId;
      if (file && !assetId) {
        const data = await uploadGenerationReference(await readReference(file), "character_reference", "story-character");
        assetId = data.referenceId;
        setUploadedId(assetId);
      }
      const update = await upsertCinematicSharedCharacter(project.id, person?.id ?? null, {
        expectedProjectVersion: project.version, expectedStoryProjectVersion: owner.version, sourceType: "dossier",
        displayName: name.trim(), storyRole: role.trim(),
        storyImportance: person?.storyImportance, storyRoleSlotId: person?.storyRoleSlotId ?? undefined,
        objective: person?.objective, motivation: person?.motivation, pressure: person?.pressure,
        personalityTraits: personality.split(",").map(trait=>trait.trim().slice(0,120)).filter(Boolean).slice(0,6),
        storyCharacterDetails: details, storyReferenceAssetId: assetId
      });
      close();
      return update;
    }).finally(() => setSaving(false));
  }

  return <Dialog label={label} onClose={() => { if (!saving) close(); }}>
    <form className="story-dialog story-character-form story-cast-edit" onSubmit={submit}>
      <header className="story-bar"><h2>{label}</h2><button type="button" disabled={saving} onClick={close}>{t("cancel")}</button></header>
      <fieldset className="story-cast-edit-grid" disabled={saving}>
        <div className="story-cast-fields">
        <label>{t("name")}<input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>
        <label>{t("characterRole")}<input required maxLength={240} value={role} onChange={event => setRole(event.target.value)}/></label>
        <label>{t("storyCast.personality")}<input value={personality} onChange={event=>setPersonality(event.target.value)}/></label>
        {detailFields.map(field=><label key={field}>{t(`storyCast.${field}`)}<textarea rows={3} maxLength={2000} value={details[field]}
          onChange={event=>setDetails(current=>({...current,[field]:event.target.value}))}/></label>)}
        </div>
        <section className="story-cast-edit-image">
        <h3>{t("characterPhoto")}</h3>
        {filePreview || previousImage ? <button type="button" className="story-full-preview"
          onClick={()=>setExpanded(true)} aria-label={t("storyCast.expandImage")}>{imagePreview()}</button> : imagePreview()}
        <label>{t("characterPhoto")}<input type="file" accept={imageTypes.join(",")} onChange={event => {
          const selected = event.target.files?.[0];
          setUploadedId(undefined);
          setFile(selected);
          setFileError(Boolean(selected && (!imageTypes.includes(selected.type) || selected.size > maximumBytes)));
        }}/></label>
        {fileError && <p role="alert">{t("invalidCharacterPhoto")}</p>}
        </section>
      </fieldset>
        {error && <p role="alert">{error}</p>}
        <footer><button type="button" onClick={close}>{t("cancel")}</button>
          <button className="primary" disabled={saving || fileError || !name.trim() || !role.trim()}>{t("saveCharacter")}</button></footer>
    </form>
    {expanded && <Dialog label={t("storyCast.expandImage")} onClose={()=>setExpanded(false)}>
      <div className="story-dialog story-image-zoom"><button onClick={()=>setExpanded(false)}>{t("cancel")}</button>{imagePreview()}</div>
    </Dialog>}
  </Dialog>;
}
