import { ArrowLeft, BookOpenText, ChevronDown, FileText, Plus, Save, Sparkles, UsersRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { routePaths } from '../../../app/routeRegistry/routes';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicSeriesWorkspace, mutateCinematicSeries } from '../api/cinematicSeriesApi';
import type { CinematicProject, CinematicSetupDraft } from '../schemas/cinematicSchemas';
import type { CinematicSaveState } from './CinematicWorkspaceHeader';

type Props = {
  actorId: string;
  project: CinematicProject;
  draft: CinematicSetupDraft;
  saveState: CinematicSaveState;
  saveError: Error | null;
  storyBriefLimit: number;
  online: boolean;
  onUpdate: <K extends keyof CinematicSetupDraft>(key: K, value: CinematicSetupDraft[K]) => void;
  onSave: () => Promise<void>;
  onEnhance: () => void;
  onPrepareNavigation: () => Promise<CinematicProject>;
  onNavigateChapter: (projectId: string) => void;
  onOpenStage: (stage: 'storyboard' | 'finish') => void;
  onBusyChange: (busy: boolean) => void;
};

export function CinematicStoryWriter({
  actorId,
  project,
  draft,
  saveState,
  saveError,
  storyBriefLimit,
  online,
  onUpdate,
  onSave,
  onEnhance,
  onPrepareNavigation,
  onNavigateChapter,
  onOpenStage,
  onBusyChange
}: Props) {
  const { t } = useTranslation('cinematic');
  const queryClient = useQueryClient();
  const [view, setView] = useState<'chapter' | 'full-story'>('chapter');
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState('');
  const busyRef = useRef(false);
  const queryKey = ['cinematic-series', actorId, project.id];
  const workspace = useQuery({
    queryKey,
    queryFn: () => getCinematicSeriesWorkspace(project.id),
    staleTime: 20_000,
    gcTime: 60_000,
    retry: false
  });
  const chapters = workspace.data?.chapters || [];
  const series = workspace.data?.series;
  const currentChapter = chapters.find(chapter => chapter.projectId === project.id);
  const currentSeason = series?.seasons.find(season => season.id === currentChapter?.seasonId)
    || series?.seasons.find(season => season.id === project.seriesMembership?.seasonId)
    || series?.seasons[0];

  async function runOperation(operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    onBusyChange(true);
    setOperationError('');
    try {
      await operation();
    } catch (cause) {
      setOperationError(cause instanceof Error ? cause.message : t('cinematic.storyWriter.operationFailed'));
    } finally {
      busyRef.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  function switchChapter(projectId: string) {
    if (projectId === project.id || busy) return;
    void runOperation(async () => {
      await onPrepareNavigation();
      if (getActiveActorId() === actorId) onNavigateChapter(projectId);
    });
  }

  function addChapter() {
    if (!series || !currentSeason) return;
    void runOperation(async () => {
      const prepared = await onPrepareNavigation();
      if (getActiveActorId() !== actorId) return;
      const result = await mutateCinematicSeries(project.id, prepared.version, series.id, series.version, {
        kind: 'chapter',
        seasonId: currentSeason.id,
        title: t('cinematic.storyWriter.newChapterTitle', { number: chapters.length + 1 }),
        storyBrief: '',
        copyCast: true
      });
      if (getActiveActorId() !== actorId || !result.project) return;
      queryClient.setQueryData(queryKey, result.workspace);
      queryClient.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
      void queryClient.invalidateQueries({ queryKey: ['cinematic-projects', actorId] });
      onNavigateChapter(result.project.id);
    });
  }

  const SaveStateIcon = saveState === 'saving' ? ProcessingSpinner : Save;
  const visibleChapters = chapters.map(chapter => chapter.projectId === project.id
    ? { ...chapter, title: draft.projectName || chapter.title, storyBrief: draft.storyBrief }
    : chapter);

  return (
    <main className="cinematic-story-writer" data-testid="cinematic-story-writer">
      <header className="cinematic-story-writer__header">
        <Link className="cinematic-story-writer__back" to={routePaths.createCinematic}>
          <ArrowLeft aria-hidden="true" />
          {t('cinematic.storyWriter.back')}
        </Link>
        <nav className="cinematic-story-writer__workspace-nav" aria-label={t('cinematic.storyWriter.workspaceNavigation')}>
          <button type="button" className="is-active" aria-current="page">{t('cinematic.storyWriter.story')}</button>
          <button type="button" onClick={() => onOpenStage('storyboard')}>{t('cinematic.storyWriter.production')}</button>
          <button type="button" onClick={() => onOpenStage('finish')}>{t('cinematic.storyWriter.final')}</button>
        </nav>
        <span className={`cinematic-story-writer__save-state is-${saveState}`} role="status" aria-live="polite">
          <SaveStateIcon aria-hidden="true" />
          {t(`cinematic.save.${saveState}`)}
        </span>
      </header>

      <div className="cinematic-story-writer__identity">
        <div>
          <span>{t('cinematic.storyWriter.eyebrow')}</span>
          <h1>{workspace.data?.productionProject.title || draft.projectName}</h1>
        </div>
        <div className="cinematic-story-writer__view-tabs" role="tablist" aria-label={t('cinematic.storyWriter.view')}>
          <button type="button" role="tab" aria-selected={view === 'chapter'} className={view === 'chapter' ? 'is-active' : ''} onClick={() => setView('chapter')}>
            <FileText aria-hidden="true" />{t('cinematic.storyWriter.chapterView')}
          </button>
          <button type="button" role="tab" aria-selected={view === 'full-story'} className={view === 'full-story' ? 'is-active' : ''} onClick={() => setView('full-story')}>
            <BookOpenText aria-hidden="true" />{t('cinematic.storyWriter.fullStory')}
          </button>
        </div>
      </div>

      {workspace.isError ? (
        <StatusNotice
          tone="error"
          title={t('cinematic.storyWriter.loadFailed')}
          action={<Button size="sm" onClick={() => void workspace.refetch()}>{t('cinematic.storyWriter.retry')}</Button>}
        >{t('cinematic.storyWriter.loadFailedDescription')}</StatusNotice>
      ) : null}
      {operationError || saveError ? <p className="cinematic-story-writer__error" role="alert">{operationError || saveError?.message}</p> : null}

      <div className="cinematic-story-writer__layout" inert={busy || undefined}>
        <aside className="cinematic-story-writer__outline" aria-label={t('cinematic.storyWriter.chapters')}>
          <details className="cinematic-story-writer__outline-section cinematic-story-writer__chapters" open>
            <summary>
              <FileText aria-hidden="true" />
              <span>
                <strong>{series && series.seasons.length > 1 && currentSeason
                  ? t('cinematic.storyWriter.seasonNumber', { number: currentSeason.number })
                  : t('cinematic.storyWriter.chapters')}</strong>
                <small>{t('cinematic.storyWriter.chapterCount', { count: chapters.length || 1 })}</small>
              </span>
              {workspace.isFetching ? <ProcessingSpinner aria-label={t('cinematic.storyWriter.loading')} /> : <ChevronDown aria-hidden="true" />}
            </summary>
            <div className="cinematic-story-writer__outline-content">
              <ol className="cinematic-story-writer__chapter-list">
                {(chapters.length ? chapters : [{ projectId: project.id, title: draft.projectName, order: 1, seasonId: null }]).map(chapter => (
                  <li key={chapter.projectId}>
                    <button
                      type="button"
                      className={chapter.projectId === project.id ? 'is-active' : ''}
                      aria-current={chapter.projectId === project.id ? 'page' : undefined}
                      onClick={() => switchChapter(chapter.projectId)}
                    >
                      <span>{String(chapter.order).padStart(2, '0')}</span>
                      <strong>{chapter.projectId === project.id ? draft.projectName || chapter.title : chapter.title}</strong>
                    </button>
                  </li>
                ))}
              </ol>
              {series ? (
                <Button variant="ghost" size="sm" icon={<Plus />} disabled={busy || workspace.isFetching || !online} onClick={addChapter}>
                  {t('cinematic.storyWriter.addChapter')}
                </Button>
              ) : null}
            </div>
          </details>

          <details className="cinematic-story-writer__outline-section cinematic-story-writer__characters">
            <summary>
              <UsersRound aria-hidden="true" />
              <span>
                <strong>{t('cinematic.storyWriter.characters')}</strong>
                <small>{t('cinematic.storyWriter.characterCountLabel', { count: draft.storyRoleSlots.length })}</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="cinematic-story-writer__outline-content">
              {draft.storyRoleSlots.length ? (
                <ul>{draft.storyRoleSlots.map(role => <li key={role.id}><strong>{role.label}</strong><span>{role.storyFunction || t('cinematic.storyWriter.draftRole')}</span></li>)}</ul>
              ) : <p>{t('cinematic.storyWriter.noCharacters')}</p>}
            </div>
          </details>
        </aside>

        <section className="cinematic-story-writer__document">
          {view === 'chapter' ? (
            <>
              <label className="cinematic-story-writer__title-field">
                <span>{t('cinematic.storyWriter.chapterTitle')}</span>
                <input aria-label={t('cinematic.storyWriter.chapterTitle')} value={draft.projectName} maxLength={120} onChange={event => onUpdate('projectName', event.target.value)} />
              </label>
              <label className="cinematic-story-writer__prose-field">
                <span>{t('cinematic.storyWriter.prose')}</span>
                <textarea
                  aria-label={t('cinematic.storyWriter.prose')}
                  value={draft.storyBrief}
                  maxLength={storyBriefLimit}
                  placeholder={t('cinematic.storyWriter.prosePlaceholder')}
                  onChange={event => onUpdate('storyBrief', event.target.value)}
                />
                <small>{t('cinematic.storyWriter.characterCount', { count: Array.from(draft.storyBrief).length, limit: storyBriefLimit })}</small>
              </label>
              <footer className="cinematic-story-writer__actions">
                <Button variant="secondary" icon={<Save />} disabled={busy || !online} onClick={() => void onSave()}>{t('cinematic.storyWriter.save')}</Button>
                <Button variant="primary" icon={<Sparkles />} disabled={busy || !online || !draft.storyBrief.trim()} onClick={onEnhance}>{t('cinematic.storyWriter.enhance')}</Button>
              </footer>
            </>
          ) : (
            <article className="cinematic-story-writer__full-story" aria-label={t('cinematic.storyWriter.fullStory')}>
              <header>
                <span>{t('cinematic.storyWriter.readingView')}</span>
                <h2>{workspace.data?.productionProject.title || draft.projectName}</h2>
                <p>{t('cinematic.storyWriter.fullStoryDescription')}</p>
              </header>
              {visibleChapters.map(chapter => (
                <section key={chapter.projectId}>
                  <span>{t('cinematic.storyWriter.chapterNumber', { number: chapter.order })}</span>
                  <h3>{chapter.title}</h3>
                  {chapter.storyBrief.trim()
                    ? chapter.storyBrief.split(/\n{2,}/).map((paragraph, index) => <p key={`${chapter.projectId}:${index}`}>{paragraph}</p>)
                    : <p className="is-empty">{t('cinematic.storyWriter.emptyChapter')}</p>}
                </section>
              ))}
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
