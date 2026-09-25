import { Check, ChevronDown, Image, Library, Mic, Plus, Save, Trash2, Unlink, UserRound } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { getCinematicProject } from '../api/cinematicApi';
import { detachCinematicSharedCharacter, removeCinematicSharedCharacter, setCinematicChapterCharacters, upsertCinematicSharedCharacter } from '../api/cinematicSeriesApi';
import { updateCinematicSharedVoice } from '../api/cinematicSeriesApi';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { CharacterLibraryPicker } from '../../profiles/components/CharacterLibraryPicker';
import type { CharacterSummary } from '../../profiles/schemas/profileSchemas';
import { CinematicCharacterLooks } from './CinematicCharacterLooks';
import { readCharacterLookBindings } from './storyboardGenerationAdapter';

type Props = {
  actorId: string;
  project: CinematicProject;
  storyProjectId: string;
  chapterMode?: boolean;
  online: boolean;
  onProjectChanged: (project: CinematicProject) => void;
  storyAction?: ReactNode;
};

export function CinematicSharedCharactersPanel({ actorId, project, storyProjectId, chapterMode = false, online, onProjectChanged, storyAction }: Props) {
  const { t } = useTranslation('cinematic');
  const queryClient = useQueryClient();
  const storyProject = useQuery({
    queryKey: ['cinematic-project', actorId, storyProjectId],
    queryFn: () => getCinematicProject(storyProjectId),
    initialData: storyProjectId === project.id ? project : undefined,
    staleTime: 20_000,
    retry: false
  });
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [voiceDrafts, setVoiceDrafts] = useState<Record<string, string>>({});
  const [libraryTargetId, setLibraryTargetId] = useState<string | null | undefined>(undefined);
  const characters = (storyProject.data?.castAssignments || []).filter(item => item.active !== false);
  const linked = new Set(project.chapterCharacterIds || []);

  async function saveVoice(characterId: string) {
    if (!storyProject.data || busy || !online) return;
    setBusy(`voice:${characterId}`); setError('');
    try {
      const result = await updateCinematicSharedVoice(project.id, characterId, {
        expectedProjectVersion: project.version, expectedStoryProjectVersion: storyProject.data.version,
        dialogueStyle: voiceDrafts[characterId] ?? ''
      });
      queryClient.setQueryData(['cinematic-project', actorId, storyProjectId], result.storyProject);
      onProjectChanged(result.project);
      setVoiceDrafts(value => { const next = { ...value }; delete next[characterId]; return next; });
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { setBusy(null); }
  }

  async function addCharacter() {
    if (!name.trim() || !storyProject.data || busy) return;
    setBusy('add'); setError('');
    try {
      const result = await upsertCinematicSharedCharacter(project.id, null, {
        expectedProjectVersion: project.version,
        expectedStoryProjectVersion: storyProject.data.version,
        displayName: name,
        storyRole: role,
        storyImportance: characters.length ? 'supporting' : 'protagonist'
      });
      queryClient.setQueryData(['cinematic-project', actorId, storyProjectId], result.storyProject);
      queryClient.setQueryData(['cinematic-project', actorId, project.id], result.project);
      onProjectChanged(result.project);
      setName(''); setRole(''); setAdding(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { setBusy(null); }
  }

  async function toggleCharacter(characterId: string) {
    if (!chapterMode || busy) return;
    setBusy(characterId); setError('');
    try {
      const next = linked.has(characterId)
        ? [...linked].filter(id => id !== characterId)
        : [...linked, characterId];
      const result = await setCinematicChapterCharacters(project.id, project.version, next);
      queryClient.setQueryData(['cinematic-project', actorId, project.id], result.project);
      onProjectChanged(result.project);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { setBusy(null); }
  }

  async function selectLibraryCharacter(character: CharacterSummary) {
    if (!storyProject.data || busy) return;
    const target = libraryTargetId
      ? characters.find(item => item.id === libraryTargetId)
      : null;
    setBusy('library'); setError('');
    try {
      const result = await upsertCinematicSharedCharacter(project.id, target?.id || null, {
        expectedProjectVersion: project.version,
        expectedStoryProjectVersion: storyProject.data.version,
        sourceType: 'character',
        characterProfileId: character.id,
        characterProfileVersionId: character.characterProfileVersionId,
        displayName: target?.displayName || character.displayName,
        storyRole: target?.storyRole || role || t('cinematic.characters.supporting'),
        storyRoleSlotId: target?.storyRoleSlotId || undefined,
        storyImportance: target?.storyImportance || (characters.length ? 'supporting' : 'protagonist'),
        objective: target?.objective || character.personalitySummary || ''
      });
      queryClient.setQueryData(['cinematic-project', actorId, storyProjectId], result.storyProject);
      queryClient.setQueryData(['cinematic-project', actorId, project.id], result.project);
      onProjectChanged(result.project);
      setAdding(false);
      setLibraryTargetId(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed'));
      throw cause;
    } finally { setBusy(null); }
  }

  async function updateCharacterSource(characterId: string, action: 'detach' | 'remove') {
    if (!storyProject.data || busy) return;
    if (action === 'remove' && !window.confirm(t('cinematic.characters.removeConfirm'))) return;
    setBusy(`${action}:${characterId}`); setError('');
    try {
      const operation = action === 'detach' ? detachCinematicSharedCharacter : removeCinematicSharedCharacter;
      const result = await operation(project.id, characterId, project.version, storyProject.data.version);
      queryClient.setQueryData(['cinematic-project', actorId, storyProjectId], result.storyProject);
      queryClient.setQueryData(['cinematic-project', actorId, project.id], result.project);
      onProjectChanged(result.project);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { setBusy(null); }
  }

  return (
    <section className="cinematic-shared-characters" aria-label={t('cinematic.characters.title')}>
      <header>
        <div><span>{t('cinematic.characters.eyebrow')}</span><h3>{t('cinematic.characters.title')}</h3></div>
        <div className="cinematic-shared-characters__header-actions">
        <Button size="sm" variant="ghost" icon={<Plus />} disabled={!online || Boolean(busy)} onClick={() => { setExpanded(true); setAdding(value => expanded ? !value : true); }}>
          {t('cinematic.characters.add')}
        </Button>
        <Button type="button" size="icon" variant="ghost" icon={<ChevronDown className={expanded ? 'is-expanded' : ''} />}
          aria-expanded={expanded} aria-controls={contentId}
          aria-label={t(expanded ? 'cinematic.characters.collapse' : 'cinematic.characters.expand')}
          title={t(expanded ? 'cinematic.characters.collapse' : 'cinematic.characters.expand')}
          onClick={() => setExpanded(value => !value)} />
        </div>
      </header>
      {error ? <StatusNotice tone="error" title={t('cinematic.characters.operationFailed')}>{error}</StatusNotice> : null}
      <div id={contentId} className="cinematic-shared-characters__body" hidden={!expanded}>
      {storyAction ? <div className="cinematic-shared-characters__story-action">{storyAction}</div> : null}
      {adding ? (
        <div className="cinematic-shared-characters__form">
          <label><span>{t('cinematic.characters.name')}</span><input value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>
          <label><span>{t('cinematic.characters.role')}</span><input value={role} maxLength={240} onChange={event => setRole(event.target.value)} /></label>
          <Button variant="primary" size="sm" icon={<Check />} loading={busy === 'add'} disabled={!name.trim() || Boolean(busy)} onClick={addCharacter}>{t('cinematic.characters.save')}</Button>
          <Button size="sm" icon={<Library />} disabled={Boolean(busy)} onClick={() => setLibraryTargetId(null)}>{t('cinematic.characters.chooseFromLibrary')}</Button>
        </div>
      ) : null}
      {storyProject.isLoading ? <p role="status">{t('cinematic.characters.loading')}</p> : null}
      {!storyProject.isLoading && !characters.length ? <p className="cinematic-shared-characters__empty">{t('cinematic.characters.empty')}</p> : null}
      <ul>
        {characters.map(character => {
          const selected = !chapterMode || linked.has(character.id);
          const preview = character.generatedSheet?.previewUrl || character.portraitUrl || null;
          return (
            <li key={character.id} aria-label={character.displayName}>
              <div className="cinematic-shared-characters__entry">
                <button className="cinematic-shared-characters__identity" type="button" disabled={!chapterMode || Boolean(busy)} aria-pressed={selected} onClick={() => void toggleCharacter(character.id)}>
                  <span className="cinematic-shared-characters__portrait">
                    {preview ? <img src={preview} alt="" /> : <UserRound aria-hidden="true" />}
                  </span>
                  <span>
                    <strong title={character.displayName}>{character.displayName}</strong>
                    <small title={character.storyRole || t('cinematic.characters.supporting')}>{character.storyRole || t('cinematic.characters.supporting')}</small>
                  </span>
                  {readCharacterLookBindings(character).some(look => look.ready) ? <Image aria-label={t('cinematic.characters.lookReady')} /> : null}
                  {chapterMode ? <span className={`cinematic-shared-characters__selection${selected ? ' is-selected' : ''}`}><Check aria-hidden="true" /></span> : null}
                </button>
                <div className="cinematic-shared-characters__actions">
                  <Button className="cinematic-shared-characters__action" type="button" size="icon" variant="ghost" icon={<Library />} aria-label={t('cinematic.characters.changeFor', { name: character.displayName })} title={t('cinematic.characters.changeFor', { name: character.displayName })} disabled={Boolean(busy)} onClick={() => setLibraryTargetId(character.id)} />
                  {character.sourceType !== 'dossier' ? <Button className="cinematic-shared-characters__action" type="button" size="icon" variant="ghost" icon={<Unlink />} aria-label={t('cinematic.characters.detachFor', { name: character.displayName })} title={t('cinematic.characters.detachFor', { name: character.displayName })} disabled={Boolean(busy)} onClick={() => void updateCharacterSource(character.id, 'detach')} /> : null}
                  <Button className="cinematic-shared-characters__action" type="button" size="icon" variant="ghost" icon={<Trash2 />} aria-label={t('cinematic.characters.removeFor', { name: character.displayName })} title={t('cinematic.characters.removeFor', { name: character.displayName })} disabled={Boolean(busy)} onClick={() => void updateCharacterSource(character.id, 'remove')} />
                </div>
              </div>
              {storyProject.data ? <CinematicCharacterLooks actorId={actorId} project={project} storyProject={storyProject.data} character={character}
                disabled={!online || Boolean(busy)} onChooseCharacter={() => setLibraryTargetId(character.id)} onProjectChanged={onProjectChanged} /> : null}
              <details className="cinematic-character-voice">
                <summary><Mic aria-hidden="true" /><span>{t('cinematic.shotWorkspace.voice')}</span><ChevronDown className="cinematic-character-voice__chevron" aria-hidden="true" /></summary>
                <label><span>{t('cinematic.shotWorkspace.voiceFor', { name: character.displayName })}</span><textarea rows={3} maxLength={500} value={voiceDrafts[character.id] ?? character.dialogueStyle} disabled={Boolean(busy)} onChange={event => setVoiceDrafts(value => ({ ...value, [character.id]: event.target.value }))} /></label>
                <Button size="sm" icon={<Save />} loading={busy === `voice:${character.id}`} disabled={!online || Boolean(busy) || voiceDrafts[character.id] === undefined || voiceDrafts[character.id] === character.dialogueStyle} onClick={() => void saveVoice(character.id)}>{t('cinematic.characters.save')}</Button>
              </details>
            </li>
          );
        })}
      </ul>
      </div>
      {libraryTargetId !== undefined ? <CharacterLibraryPicker
        open
        onOpenChange={open => { if (!open) setLibraryTargetId(undefined); }}
        current={null}
        onSelect={selectLibraryCharacter}
        unavailableReason={item => item.handoffAvailable && Boolean(item.characterProfileVersionId)
          ? undefined
          : t('cinematic.characters.libraryUnavailable')}
      /> : null}
    </section>
  );
}
