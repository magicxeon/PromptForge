import {useState, type FormEvent} from "react";
import {useTranslation} from "react-i18next";
import {uploadGenerationReference} from "../../../lib/canonical";
import {MediaImage} from "../../../components/media/MediaImage";
import {Dialog} from "../../dub-sub/Dialog";
import {setCinematicChapterCharacters, upsertCinematicSharedCharacter} from "../../../../../web/src/features/cinematic/api/cinematicSeriesApi";
import type {CinematicProject} from "../../../../../web/src/features/cinematic/schemas/cinematicSchemas";
import type {RunWriting} from "../data/useStoryWorkspace";

type Member = CinematicProject["castAssignments"][number];
const imageTypes = ["image/png", "image/jpeg", "image/webp"];
const maximumBytes = 12 * 1024 * 1024;

function readReference(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function StoryCharacters({project, owner, run, error}: {
  project: CinematicProject; owner: CinematicProject; run: RunWriting; error: string;
}) {
  const {t} = useTranslation("story");
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const chapter = project.id !== owner.id;
  const members = owner.castAssignments.filter(person => person.active !== false);
  const chapterIds = project.chapterCharacterIds ?? [];
  function addToChapter(id: string) {
    void run(() => setCinematicChapterCharacters(project.id, project.version, [...chapterIds, id]));
  }

  return <section className="story-characters">
    <header className="story-bar"><h2>{t("characters")}</h2>
      <button className="primary" onClick={() => setEditing("new")}>{t("addCharacter")}</button>
    </header>
    {members.length === 0 && <p>{t("noCharacters")}</p>}
    <ul className="story-character-list">{members.map(person => <li key={person.id}>
      <StoryCharacterIdentity person={person}/>
      <div className="story-actions">
        {chapter && !chapterIds.includes(person.id) && <button onClick={() => addToChapter(person.id)}>{t("addCharacterToChapter")}</button>}
        {person.sourceType === "dossier" && <button onClick={() => setEditing(person)}>{t("editCharacter", {name: person.displayName})}</button>}
      </div>
    </li>)}</ul>
    {editing && <CharacterForm project={project} owner={owner} person={editing === "new" ? undefined : editing}
      run={run} close={() => setEditing(null)} error={error}/>}
  </section>;
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
  const [file, setFile] = useState<File>();
  const [uploadedId, setUploadedId] = useState<string>();
  const [fileError, setFileError] = useState(false);
  const [saving, setSaving] = useState(false);
  const label = person ? t("editCharacter", {name: person.displayName}) : t("addCharacter");

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
        personalityTraits: person?.personalityTraits, storyReferenceAssetId: assetId
      });
      close();
      return update;
    }).finally(() => setSaving(false));
  }

  return <Dialog label={label} onClose={() => { if (!saving) close(); }}>
    <form className="story-dialog story-character-form" onSubmit={submit}>
      <h2>{label}</h2>
      <fieldset disabled={saving}>
        <label>{t("name")}<input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label>
        <label>{t("characterRole")}<input required maxLength={240} value={role} onChange={event => setRole(event.target.value)}/></label>
        {person?.storyReference && <MediaImage className="story-character-photo" src={person.storyReference.imageUrl} alt={person.displayName}/>}
        <label>{t("characterPhoto")}<input type="file" accept={imageTypes.join(",")} onChange={event => {
          const selected = event.target.files?.[0];
          setUploadedId(undefined);
          setFile(selected);
          setFileError(Boolean(selected && (!imageTypes.includes(selected.type) || selected.size > maximumBytes)));
        }}/></label>
        {fileError && <p role="alert">{t("invalidCharacterPhoto")}</p>}
        {error && <p role="alert">{error}</p>}
        <footer><button type="button" onClick={close}>{t("cancel")}</button>
          <button className="primary" disabled={fileError || !name.trim() || !role.trim()}>{t("saveCharacter")}</button></footer>
      </fieldset>
    </form>
  </Dialog>;
}
