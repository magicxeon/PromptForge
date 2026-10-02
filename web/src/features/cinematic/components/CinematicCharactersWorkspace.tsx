import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicProject, proposeCinematicFullStory, saveCinematicFullStoryRevision } from '../api/cinematicApi';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { CinematicSharedCharactersPanel } from './CinematicSharedCharactersPanel';
import { CinematicWritingConsent } from './CinematicWritingConsent';
import { getCinematicSeriesWorkspace } from '../api/cinematicSeriesApi';

export function CinematicCharactersWorkspace({ actorId, project }: { actorId: string; project: CinematicProject }) {
  const { t } = useTranslation('cinematic');
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useQuery({ queryKey: ['cinematic-series', actorId, project.id],
    queryFn: () => getCinematicSeriesWorkspace(project.id), staleTime: 20_000, retry: false });
  const storyProjectId = workspace.data?.productionProject?.storyProjectId || project.chapterOrigin?.projectId || project.id;
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const sync = () => setOnline(navigator.onLine); window.addEventListener('online', sync); window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); }; }, []);
  const story = useQuery({ queryKey: ['cinematic-project', actorId, storyProjectId],
    queryFn: () => getCinematicProject(storyProjectId), initialData: storyProjectId === project.id ? project : undefined,
    staleTime: 20_000, retry: false });
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const source = story.data;
  const revision = source?.fullStoryVersions.find(item => item.id === source.activeFullStoryVersionId);
  async function extract() {
    if (!source || !revision || pending.current || !online || workspace.isError || getActiveActorId() !== actorId) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await proposeCinematicFullStory(source.id, source.version, '', 'characters');
      if (getActiveActorId() !== actorId) return;
      if (!result.characters.length) { setMessage(t('cinematic.storyImport.noCharacters')); return; }
      const saved = await saveCinematicFullStoryRevision(source.id, { expectedVersion: source.version,
        content: revision.content, source: 'manual', characters: result.characters, provenance: result.provenance });
      if (getActiveActorId() !== actorId) return;
      queryClient.setQueryData(['cinematic-project', actorId, source.id], saved);
      if (source.id !== project.id) await queryClient.invalidateQueries({ queryKey: ['cinematic-project', actorId, project.id] });
      setMessage(t('cinematic.storyImport.charactersReady', { count: result.characters.length }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { pending.current = false; setBusy(false); }
  }
  return <main className="cinematic-cast-workspace" data-testid="cinematic-characters-workspace">
    <header><div><span>{t('cinematic.characters.eyebrow')}</span><h1>{source?.title || project.title}</h1></div>
      <CinematicWritingConsent key={JSON.stringify([actorId, source?.id, source?.version, busy, online])} title={t('cinematic.storyImport.extractCharacters')}
        scope={t('cinematic.bulk.charactersScope', { name: source?.title || project.title })} pending={!revision || busy || !online || story.isError || workspace.isError || workspace.isPending}
        onConfirm={() => void extract()} trigger={<Button icon={<Sparkles />} loading={busy} disabled={!revision || busy || !online || story.isError || workspace.isError || workspace.isPending}>{t('cinematic.storyImport.extractCharacters')}</Button>} />
    </header>
    {workspace.isPending ? <p role="status"><ProcessingSpinner />{t('cinematic.characters.loading')}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {error ? <StatusNotice tone="error" title={t('cinematic.characters.operationFailed')}>{error}</StatusNotice> : null}
    {workspace.isError ? <StatusNotice tone="error" title={t('cinematic.characters.operationFailed')}><Button onClick={() => void workspace.refetch()}>{t('cinematic.lookReferences.refresh')}</Button></StatusNotice> : null}
    {!workspace.isPending && !workspace.isError ? <CinematicSharedCharactersPanel key={`${actorId}:${storyProjectId}`} actorId={actorId} project={project} storyProjectId={storyProjectId}
      workspace initialCharacterId={new URLSearchParams(location.search).get('character') || undefined}
      onSelectCharacter={characterId => { const search = new URLSearchParams(location.search); search.set('character', characterId);
        navigate({ pathname: location.pathname, search: search.toString() }, { replace: true, state: location.state }); }}
      chapterMode={storyProjectId !== project.id} online={online && !busy}
      onProjectChanged={saved => queryClient.setQueryData(['cinematic-project', actorId, saved.id], saved)} /> : null}
  </main>;
}
