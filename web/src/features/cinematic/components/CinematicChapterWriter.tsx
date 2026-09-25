import { ArrowLeft, Check, ChevronDown, Clapperboard, FileText, History, ListVideo, Plus, RefreshCw, Save, Settings2, Sparkles, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicProject } from '../api/cinematicApi';
import { applyCinematicChapterProposal, applyCinematicSceneProposal, createCinematicManualScene, discardCinematicChapterProposal, discardCinematicSceneProposal, getCinematicSeriesWorkspace, mutateCinematicSeries, proposeCinematicChapters, proposeCinematicScenes, restoreCinematicChapterRevision, updateCinematicChapter } from '../api/cinematicSeriesApi';
import type { CinematicChapterProposal, CinematicChapterRevision, CinematicProject, CinematicSceneProposal } from '../schemas/cinematicSchemas';
import { CinematicSharedCharactersPanel } from './CinematicSharedCharactersPanel';

type Props = {
  actorId: string;
  project: CinematicProject;
  online: boolean;
  onBackToFullStory: () => void;
  onOpenSetup?: (storyProjectId: string) => void;
  onNavigateChapter: (projectId: string) => void;
  onOpenScenes: () => void;
  onProjectChanged: (project: CinematicProject) => void;
};

export function CinematicChapterWriter({
  actorId,
  project,
  online,
  onBackToFullStory,
  onOpenSetup,
  onNavigateChapter,
  onOpenScenes,
  onProjectChanged
}: Props) {
  const { t, i18n } = useTranslation('cinematic');
  const queryClient = useQueryClient();
  const queryKey = ['cinematic-series', actorId, project.id];
  const workspace = useQuery({
    queryKey,
    queryFn: () => getCinematicSeriesWorkspace(project.id),
    staleTime: 20_000,
    gcTime: 60_000,
    retry: false
  });
  const chapters = useMemo(() => workspace.data?.chapters || [], [workspace.data?.chapters]);
  const currentChapter = chapters.find(chapter => chapter.projectId === project.id);
  const initialTitle = project.chapterTitle || currentChapter?.title || t('cinematic.chapterWriter.defaultTitle', { number: project.seriesMembership?.chapterNumber || 1 });
  const initialStory = project.chapterStory || currentChapter?.storyBrief || '';
  const [title, setTitle] = useState(initialTitle);
  const [story, setStory] = useState(initialStory);
  const storyProjectId = workspace.data?.productionProject.storyProjectId || project.chapterOrigin?.projectId || project.id;
  const storyProject = useQuery({
    queryKey: ['cinematic-project', actorId, storyProjectId],
    queryFn: () => getCinematicProject(storyProjectId),
    initialData: storyProjectId === project.id ? project : undefined,
    staleTime: 20_000,
    retry: false
  });
  const [instruction, setInstruction] = useState('');
  const [panel, setPanel] = useState<'assist' | 'characters' | 'history'>('assist');
  const pendingChapterProposal = useMemo(() => [...(storyProject.data?.chapterProposals || [])].reverse().find(item => item.status === 'pending_review') || null, [storyProject.data?.chapterProposals]);
  const [proposal, setProposal] = useState<CinematicChapterProposal | null>(pendingChapterProposal);
  const pendingSceneProposal = useMemo(() => [...(project.sceneProposals || [])].reverse().find(item => item.status === 'pending_review') || null, [project.sceneProposals]);
  const [sceneProposal, setSceneProposal] = useState<CinematicSceneProposal | null>(pendingSceneProposal);
  const [sceneProposalVersion, setSceneProposalVersion] = useState(project.version);
  const [busy, setBusy] = useState<'save' | 'add' | 'switch' | 'selected-ai' | 'all-ai' | 'apply' | 'discard' | 'restore' | 'scenes-ai' | 'scene-apply' | 'scene-discard' | 'scene-manual' | null>(null);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const editedRef = useRef(false);
  const loadedProjectRef = useRef(project.id);
  const closedChapterProposalIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedProjectRef.current !== project.id) {
      loadedProjectRef.current = project.id;
      editedRef.current = false;
      setProposal(null);
      setSceneProposal(null);
    }
    if (editedRef.current) return;
    setTitle(project.chapterTitle || currentChapter?.title || t('cinematic.chapterWriter.defaultTitle', { number: project.seriesMembership?.chapterNumber || 1 }));
    setStory(project.chapterStory || currentChapter?.storyBrief || '');
  }, [currentChapter?.storyBrief, currentChapter?.title, project.chapterStory, project.chapterTitle, project.id, project.seriesMembership?.chapterNumber, t]);

  useEffect(() => {
    if (!proposal && pendingChapterProposal && pendingChapterProposal.id !== closedChapterProposalIdRef.current) {
      setProposal(pendingChapterProposal);
      setPanel('assist');
    }
  }, [pendingChapterProposal, proposal]);

  useEffect(() => {
    if (!sceneProposal && pendingSceneProposal) {
      setSceneProposal(pendingSceneProposal);
      setSceneProposalVersion(project.version);
    }
  }, [pendingSceneProposal, project.version, sceneProposal]);

  const dirty = title.trim() !== initialTitle.trim() || story.trim() !== initialStory.trim();
  const hasPendingChapterProposal = Boolean(proposal || pendingChapterProposal);
  const sceneProposalStale = Boolean(sceneProposal && sceneProposal.sourceChapterRevisionId !== project.activeChapterVersionId);
  const orderedChapters = useMemo(() => [...chapters].sort((a, b) => a.order - b.order), [chapters]);
  const revisions = useMemo(() => [...(project.chapterVersions || [])].sort((a, b) => b.version - a.version), [project.chapterVersions]);

  async function run<T>(kind: NonNullable<typeof busy>, operation: () => Promise<T>) {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    setBusy(kind);
    setError('');
    try { return await operation(); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.chapterWriter.operationFailed'));
      return undefined;
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  async function saveCurrent(forceRevision = false) {
    if (!dirty && !forceRevision) return project;
    const result = await updateCinematicChapter(project.id, project.version, title, story);
    if (getActiveActorId() !== actorId) return project;
    queryClient.setQueryData(queryKey, result.workspace);
    queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
    editedRef.current = false;
    onProjectChanged(result.project);
    return result.project;
  }

  function save() {
    if (!title.trim()) return;
    void run('save', saveCurrent);
  }

  function switchChapter(projectId: string) {
    if (projectId === project.id) return;
    void run('switch', async () => {
      if (dirty && !title.trim()) throw new Error(t('cinematic.chapterWriter.titleRequired'));
      if (dirty) await saveCurrent();
      if (getActiveActorId() === actorId) onNavigateChapter(projectId);
    });
  }

  function addChapter() {
    const series = workspace.data?.series;
    const seasonId = currentChapter?.seasonId || project.seriesMembership?.seasonId || series?.seasons[0]?.id;
    if (!series || !seasonId) return;
    void run('add', async () => {
      if (dirty && !title.trim()) throw new Error(t('cinematic.chapterWriter.titleRequired'));
      const source = dirty || !project.activeChapterVersionId ? await saveCurrent(true) : project;
      const result = await mutateCinematicSeries(source.id, source.version, series.id, series.version, {
        kind: 'chapter',
        seasonId,
        title: t('cinematic.chapterWriter.defaultTitle', { number: chapters.length + 1 }),
        storyBrief: '',
        copyCast: true
      });
      if (getActiveActorId() !== actorId || !result.project) return;
      queryClient.setQueryData(['cinematic-series', actorId, result.project.id], result.workspace);
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey: ['cinematic-projects', actorId] });
      onNavigateChapter(result.project.id);
    });
  }

  function generate(scope: 'all' | 'selected') {
    if (!online || busyRef.current || (scope === 'selected' && !instruction.trim())) return;
    if (hasPendingChapterProposal) {
      setPanel('assist');
      return;
    }
    void run(scope === 'all' ? 'all-ai' : 'selected-ai', async () => {
      const result = await proposeCinematicChapters(project.id, {
        expectedVersion: project.version,
        scope,
        instruction,
        ...(scope === 'selected' ? { draftTitle: title, draftStory: story } : {})
      });
      closedChapterProposalIdRef.current = null;
      setProposal(result.proposal);
      setPanel('assist');
      queryClient.setQueryData(queryKey, result.workspace);
      if (result.project.id === storyProjectId) queryClient.setQueryData(['cinematic-project', actorId, storyProjectId], result.project);
      else void queryClient.invalidateQueries({ queryKey: ['cinematic-project', actorId, storyProjectId] });
      onProjectChanged(result.project);
    });
  }

  function applyProposal() {
    if (!proposal) return;
    void run('apply', async () => {
      const result = await applyCinematicChapterProposal(project.id, proposal.id);
      closedChapterProposalIdRef.current = proposal.id;
      setProposal(null); setInstruction(''); editedRef.current = false;
      queryClient.setQueryData(queryKey, result.workspace);
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey: ['cinematic-project', actorId, storyProjectId] });
      onProjectChanged(result.project);
    });
  }

  function discardProposal() {
    if (!proposal) return;
    void run('discard', async () => {
      const result = await discardCinematicChapterProposal(project.id, proposal.id);
      closedChapterProposalIdRef.current = proposal.id;
      setProposal(null);
      queryClient.setQueryData(queryKey, result.workspace);
      void queryClient.invalidateQueries({ queryKey: ['cinematic-project', actorId, storyProjectId] });
      onProjectChanged(result.project);
    });
  }

  function restore(revision: CinematicChapterRevision) {
    void run('restore', async () => {
      const result = await restoreCinematicChapterRevision(project.id, revision.id, project.version);
      editedRef.current = false;
      queryClient.setQueryData(queryKey, result.workspace);
      onProjectChanged(result.project);
    });
  }

  function generateScenes() {
    void run('scenes-ai', async () => {
      if (!title.trim()) throw new Error(t('cinematic.chapterWriter.titleRequired'));
      if (!story.trim()) throw new Error(t('cinematic.chapterWriter.sceneStoryRequired'));
      const source = dirty ? await saveCurrent() : project;
      const result = await proposeCinematicScenes(source.id, source.version);
      if (getActiveActorId() !== actorId) return;
      setSceneProposal(result.proposal);
      setSceneProposalVersion(result.project.version);
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey });
      onProjectChanged(result.project);
    });
  }

  function applyScenes() {
    if (!sceneProposal) return;
    void run('scene-apply', async () => {
      const result = await applyCinematicSceneProposal(project.id, sceneProposal.id, sceneProposalVersion);
      if (getActiveActorId() !== actorId) return;
      setSceneProposal(null);
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey });
      onProjectChanged(result.project);
      onOpenScenes();
    });
  }

  function discardScenes() {
    if (!sceneProposal) return;
    void run('scene-discard', async () => {
      const result = await discardCinematicSceneProposal(project.id, sceneProposal.id, sceneProposalVersion);
      if (getActiveActorId() !== actorId) return;
      setSceneProposal(null);
      setSceneProposalVersion(result.project.version);
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey });
      onProjectChanged(result.project);
    });
  }

  function addManualScene() {
    void run('scene-manual', async () => {
      if (!title.trim()) throw new Error(t('cinematic.chapterWriter.titleRequired'));
      const source = dirty ? await saveCurrent() : project;
      const result = await createCinematicManualScene(source.id, source.version, crypto.randomUUID());
      if (getActiveActorId() !== actorId) return;
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey });
      onProjectChanged(result.project);
      onOpenScenes();
    });
  }

  return (
    <main className="cinematic-story-writer cinematic-chapter-writer" data-testid="cinematic-chapter-writer">
      <header className="cinematic-story-writer__header">
        <button type="button" className="cinematic-story-writer__back" onClick={onBackToFullStory}>
          <ArrowLeft aria-hidden="true" />{t('cinematic.chapterWriter.backToFullStory')}
        </button>
        <div className="cinematic-chapter-writer__heading">
          <span>{t('cinematic.chapterWriter.eyebrow')}</span>
          <h1>{workspace.data?.productionProject.title || project.title}</h1>
          <p>{t(hasPendingChapterProposal ? 'cinematic.chapterWriter.reviewPendingDescription' : 'cinematic.chapterWriter.regenerateAllDescription')}</p>
        </div>
        <div className="cinematic-chapter-writer__header-actions">
          <Button size="sm" icon={hasPendingChapterProposal ? <FileText /> : <RefreshCw />} loading={busy === 'all-ai'} disabled={!online || Boolean(busy) || !storyProject.data?.confirmedFullStoryVersionId} title={t(hasPendingChapterProposal ? 'cinematic.chapterWriter.reviewPendingDescription' : 'cinematic.chapterWriter.regenerateAllDescription')} onClick={() => hasPendingChapterProposal ? setPanel('assist') : generate('all')}>
            {t(hasPendingChapterProposal ? 'cinematic.chapterWriter.reviewPendingProposal' : 'cinematic.chapterWriter.regenerateAll')}
          </Button>
          <span className="cinematic-story-writer__save-state" role="status">
            {busy ? <ProcessingSpinner /> : <Save aria-hidden="true" />}
            {t(busy ? 'cinematic.chapterWriter.saving' : dirty ? 'cinematic.chapterWriter.unsaved' : 'cinematic.chapterWriter.saved')}
          </span>
        </div>
      </header>

      {storyProject.data ? <div className="cinematic-chapter-target">
        <p>{t('cinematic.chapterPlan.target', { count: storyProject.data.setup.chapterCount || 1 })}</p>
        {onOpenSetup ? <Button size="sm" icon={<Settings2 />} disabled={Boolean(busy) || dirty}
          onClick={() => onOpenSetup(storyProjectId)}>{t('cinematic.chapterPlan.editSetup')}</Button> : null}
      </div> : null}
      {error ? <StatusNotice tone="error" title={t('cinematic.chapterWriter.operationFailed')}>{error}</StatusNotice> : null}
      {!storyProject.isLoading && !storyProject.data?.confirmedFullStoryVersionId ? (
        <StatusNotice tone="warning" title={t('cinematic.chapterWriter.confirmationRequired')}>{t('cinematic.chapterWriter.confirmationRequiredDescription')}</StatusNotice>
      ) : null}

      <div className="cinematic-story-writer__layout cinematic-chapter-writer__layout" inert={busy ? true : undefined}>
        <aside className="cinematic-story-writer__outline" aria-label={t('cinematic.chapterWriter.chapters')}>
          <details className="cinematic-story-writer__outline-section cinematic-story-writer__chapters" open>
            <summary>
              <FileText aria-hidden="true" />
              <span><strong>{t('cinematic.chapterWriter.chapters')}</strong><small>{t('cinematic.chapterWriter.chapterCount', { count: chapters.length || 1 })}</small></span>
              {workspace.isFetching ? <ProcessingSpinner /> : <ChevronDown aria-hidden="true" />}
            </summary>
            <div className="cinematic-story-writer__outline-content">
              <ol className="cinematic-story-writer__chapter-list">
                {(orderedChapters.length ? orderedChapters : [{ projectId: project.id, order: 1, title: initialTitle, classification: 'empty' as const, sceneCount: 0, shotCount: 0, scenePlanningStatus: 'not_started' as const }]).map(chapter => (
                  <li key={chapter.projectId}>
                    <button type="button" className={chapter.projectId === project.id ? 'is-active' : ''} aria-current={chapter.projectId === project.id ? 'page' : undefined} onClick={() => switchChapter(chapter.projectId)}>
                      <span>{String(chapter.order).padStart(2, '0')}</span>
                      <strong>{chapter.projectId === project.id ? title || chapter.title : chapter.title}</strong>
                      <small data-status={chapter.classification}>{t(`cinematic.chapterWriter.status.${chapter.classification}`)}</small>
                      <span className="cinematic-chapter-writer__production-counts">
                        <span><Clapperboard aria-hidden="true" />{t('cinematic.chapterWriter.sceneCount', { count: chapter.sceneCount || 0 })}</span>
                        <span><ListVideo aria-hidden="true" />{chapter.sceneCount && !chapter.shotCount ? t('cinematic.chapterWriter.shotsNotPlanned') : t('cinematic.chapterWriter.shotCount', { count: chapter.shotCount || 0 })}</span>
                      </span>
                      {chapter.scenePlanningStatus === 'proposal_pending' || chapter.scenePlanningStatus === 'source_changed' ? (
                        <small data-scene-status={chapter.scenePlanningStatus}>{t(`cinematic.chapterWriter.sceneStatus.${chapter.scenePlanningStatus}`)}</small>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ol>
              {workspace.data?.series ? (
                <Button variant="ghost" size="sm" icon={<Plus />} loading={busy === 'add'} disabled={Boolean(busy) || !online} onClick={addChapter}>
                  {t('cinematic.chapterWriter.addChapter')}
                </Button>
              ) : null}
            </div>
          </details>
        </aside>

        <section className="cinematic-story-writer__document">
          <label className="cinematic-story-writer__title-field">
            <span>{t('cinematic.chapterWriter.title')}</span>
            <input aria-label={t('cinematic.chapterWriter.title')} value={title} maxLength={120} onChange={event => { editedRef.current = true; setTitle(event.target.value); }} />
          </label>
          <label className="cinematic-story-writer__prose-field">
            <span>{t('cinematic.chapterWriter.story')}</span>
            <textarea aria-label={t('cinematic.chapterWriter.story')} value={story} maxLength={50000} placeholder={t('cinematic.chapterWriter.storyPlaceholder')} onChange={event => { editedRef.current = true; setStory(event.target.value); }} />
            <small>{t('cinematic.chapterWriter.characterCount', { count: Array.from(story).length, limit: 50000 })}</small>
          </label>
          {!story.trim() ? (
            <div className="cinematic-chapter-writer__empty-actions">
              <Button icon={<Sparkles />} loading={busy === 'selected-ai'} disabled={!online || Boolean(busy) || !storyProject.data?.confirmedFullStoryVersionId} onClick={() => generate('selected')}>
                {t('cinematic.chapterWriter.generateChapter')}
              </Button>
            </div>
          ) : null}
          <footer className="cinematic-story-writer__actions">
            <Button variant="primary" icon={<Save />} loading={busy === 'save'} disabled={Boolean(busy) || !online || !dirty || !title.trim()} onClick={save}>
              {t('cinematic.chapterWriter.save')}
            </Button>
          </footer>
          <section className="cinematic-chapter-writer__scene-handoff" aria-labelledby="chapter-scene-handoff-title">
            <header>
              <div><span>{t('cinematic.chapterWriter.sceneEyebrow')}</span><h2 id="chapter-scene-handoff-title">{t('cinematic.chapterWriter.sceneTitle')}</h2></div>
              <small>{project.scenes.length ? t('cinematic.chapterWriter.acceptedSceneSummary', { scenes: project.scenes.length, shots: project.scenes.reduce((total, scene) => total + scene.shots.length, 0) }) : t('cinematic.chapterWriter.noAcceptedScenes')}</small>
            </header>
            {sceneProposal ? (
              <div className="cinematic-chapter-writer__scene-proposal">
                <div className="cinematic-chapter-writer__scene-proposal-heading"><strong>{t('cinematic.chapterWriter.reviewScenes')}</strong><span>{t('cinematic.chapterWriter.sceneProposalCount', { count: sceneProposal.scenes.length })}</span></div>
                <ol>{sceneProposal.scenes.map((scene, index) => <li key={`${index}-${scene.title}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{scene.title}</strong><p>{scene.synopsis}</p><small>{[scene.location, scene.time, `${scene.targetDurationSeconds}s`].filter(Boolean).join(' · ')}</small></div></li>)}</ol>
                <p className="cinematic-chapter-writer__preservation-note">{t(sceneProposalStale ? 'cinematic.chapterWriter.sceneProposalStale' : 'cinematic.chapterWriter.scenePreservation')}</p>
                <footer><Button icon={<X />} loading={busy === 'scene-discard'} disabled={Boolean(busy)} onClick={discardScenes}>{t('cinematic.chapterWriter.discardScenes')}</Button><Button variant="primary" icon={<Check />} loading={busy === 'scene-apply'} disabled={Boolean(busy) || sceneProposalStale} onClick={applyScenes}>{t('cinematic.chapterWriter.applyScenes')}</Button></footer>
              </div>
            ) : (
              <div className="cinematic-chapter-writer__scene-actions">
                {project.scenes.length ? <Button variant="primary" icon={<Clapperboard />} disabled={Boolean(busy)} onClick={onOpenScenes}>{t('cinematic.chapterWriter.openScenes')}</Button> : <Button variant="primary" icon={<Sparkles />} loading={busy === 'scenes-ai'} disabled={!online || Boolean(busy) || !story.trim()} onClick={generateScenes}>{t('cinematic.chapterWriter.generateScenes')}</Button>}
                <Button icon={<Plus />} loading={busy === 'scene-manual'} disabled={!online || Boolean(busy) || !title.trim()} onClick={addManualScene}>{t('cinematic.chapterWriter.addSceneManually')}</Button>
              </div>
            )}
          </section>
        </section>

        <aside className="cinematic-chapter-writer__tools">
          <div className="cinematic-writer-panel-tabs" role="tablist" aria-label={t('cinematic.chapterWriter.tools')}>
            <button type="button" role="tab" aria-selected={panel === 'assist'} onClick={() => setPanel('assist')}><Sparkles aria-hidden="true" />{t('cinematic.chapterWriter.assist')}</button>
            <button type="button" role="tab" aria-selected={panel === 'characters'} onClick={() => setPanel('characters')}><Users aria-hidden="true" />{t('cinematic.chapterWriter.characters')}</button>
            <button type="button" role="tab" aria-selected={panel === 'history'} onClick={() => setPanel('history')}><History aria-hidden="true" />{t('cinematic.chapterWriter.history')}</button>
          </div>
          {panel === 'assist' ? (
            <div className="cinematic-writer-panel">
              <label><span>{t('cinematic.chapterWriter.instruction')}</span><textarea rows={6} maxLength={2000} value={instruction} placeholder={t('cinematic.chapterWriter.instructionPlaceholder')} onChange={event => setInstruction(event.target.value)} /></label>
              <Button variant="primary" icon={<Sparkles />} loading={busy === 'selected-ai'} disabled={!online || Boolean(busy) || !instruction.trim() || !storyProject.data?.confirmedFullStoryVersionId} onClick={() => generate('selected')}>{t('cinematic.chapterWriter.reviseWithAi')}</Button>
              {proposal ? (
                <section className="cinematic-chapter-writer__proposal">
                  <header><strong>{t(proposal.scope === 'all' ? 'cinematic.chapterWriter.allProposal' : 'cinematic.chapterWriter.selectedProposal')}</strong><small>{t('cinematic.chapterWriter.proposalCount', { count: proposal.chapters.length })}</small></header>
                  <ol>{proposal.chapters.map(item => <li key={`${item.order}-${item.projectId || 'new'}`}><span>{String(item.order).padStart(2, '0')}</span><div><strong>{item.title}</strong><p>{item.story}</p></div></li>)}</ol>
                  <footer><Button size="sm" icon={<X />} loading={busy === 'discard'} disabled={Boolean(busy)} onClick={discardProposal}>{t('cinematic.chapterWriter.discard')}</Button><Button size="sm" variant="primary" icon={<Check />} loading={busy === 'apply'} disabled={Boolean(busy)} onClick={applyProposal}>{t('cinematic.chapterWriter.apply')}</Button></footer>
                </section>
              ) : null}
            </div>
          ) : null}
          {panel === 'characters' ? <CinematicSharedCharactersPanel actorId={actorId} project={project} storyProjectId={storyProjectId} chapterMode online={online} onProjectChanged={onProjectChanged} /> : null}
          {panel === 'history' ? (
            <div className="cinematic-chapter-writer__history">
              <header><strong>{t('cinematic.chapterWriter.revisionHistory')}</strong><small>{t('cinematic.chapterWriter.revisionCount', { count: revisions.length })}</small></header>
              {revisions.length ? <ol>{revisions.map(revision => <li key={revision.id}><div><strong>{t('cinematic.chapterWriter.revision', { version: revision.version })}</strong><span>{new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(revision.createdAt))}</span></div>{revision.id !== project.activeChapterVersionId ? <Button size="sm" loading={busy === 'restore'} disabled={Boolean(busy)} onClick={() => restore(revision)}>{t('cinematic.chapterWriter.restore')}</Button> : null}</li>)}</ol> : <p>{t('cinematic.chapterWriter.noHistory')}</p>}
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
