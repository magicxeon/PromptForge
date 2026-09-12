import { Layers3, Plus, RefreshCw, Settings2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { ThemeSelect } from '../../../components/ui/ThemeSelect';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicSeriesWorkspace, mutateCinematicSeries } from '../api/cinematicSeriesApi';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import type { SeriesCommand } from '../schemas/cinematicSeriesSchemas';
import { SeriesManagerDialog } from './SeriesManagerDialog';

type Props = {
  actorId: string; project: CinematicProject; isSetup: boolean;
  onPrepare: () => Promise<CinematicProject>;
  onProjectChanged: (project: CinematicProject) => void;
  onNavigate: (projectId: string, stage: string) => void;
  onBusyChange: (busy: boolean) => void;
};

export function SeriesWorkspaceControls({ actorId, project, isSetup, onPrepare, onProjectChanged, onNavigate, onBusyChange }: Props) {
  const { t } = useTranslation('cinematic');
  const client = useQueryClient();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [season, setSeason] = useState(project.seriesMembership?.seasonId || '');
  const busyRef = useRef(false);
  const queryKey = ['cinematic-series', actorId, project.id];
  const workspace = useQuery({ queryKey, queryFn: () => getCinematicSeriesWorkspace(project.id),
    enabled: Boolean(project.seriesMembership) || open, staleTime: 0, gcTime: 60_000, retry: false });
  const series = workspace.data?.series;
  const selectedSeason = series?.seasons.some(item => item.id === season) ? season : project.seriesMembership?.seasonId || series?.seasons[0]?.id || '';
  const chapters = workspace.data?.chapters.filter(item => item.seriesMembership?.seasonId === selectedSeason) || [];
  const currentChapter = chapters.find(item => item.projectId === project.id);
  async function execute(operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); onBusyChange(true); setError('');
    try { await operation(); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.series.failed'));
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ['cinematic-project', actorId, project.id] });
    } finally { busyRef.current = false; setBusy(false); onBusyChange(false); }
  }
  async function submit(command: SeriesCommand) {
    await execute(async () => {
      const prepared = await onPrepare();
      if (getActiveActorId() !== actorId) return;
      const result = await mutateCinematicSeries(project.id, prepared.version, series?.id, series?.version, command);
      if (getActiveActorId() !== actorId) return;
      client.setQueryData(queryKey, result.workspace);
      void client.invalidateQueries({ queryKey: ['cinematic-series', actorId] });
      void client.invalidateQueries({ queryKey: ['cinematic-projects', actorId] });
      if (result.project?.id === project.id) onProjectChanged(result.project);
      if (command.kind === 'chapter' && result.project) {
        client.setQueryData(['cinematic-project', actorId, result.project.id], result.project);
        onNavigate(result.project.id, 'setup');
      }
      if (command.kind === 'season') setSeason(result.workspace.series?.seasons.at(-1)?.id || '');
      setOpen(false);
    });
  }
  if (!isSetup && !project.seriesMembership) return null;
  return <section className="cinematic-series-bar" aria-label={t('cinematic.series.section')}>
    <div className="cinematic-series-heading"><Layers3 aria-hidden="true" /><div><small>{t('cinematic.series.section')}</small><strong>{series?.title || t(project.seriesMembership ? 'cinematic.series.loading' : 'cinematic.series.standalone')}</strong></div></div>
    {series ? <>
      <label><span>{t('cinematic.series.season')}</span><ThemeSelect value={selectedSeason} options={series.seasons.map(item => ({ value: item.id, label: `${t('cinematic.series.seasonNumber', { number: item.number })}${item.title ? `: ${item.title}` : ''}` }))} ariaLabel={t('cinematic.series.season')} onValueChange={setSeason} disabled={busy} /></label>
      <label><span>{t('cinematic.series.chapter')}</span><ThemeSelect value={currentChapter?.projectId || ''} options={[{ value: '', label: t(chapters.length ? 'cinematic.series.chooseChapter' : 'cinematic.series.emptySeason'), disabled: true }, ...chapters.map(item => ({ value: item.projectId, label: `${t('cinematic.series.chapterNumber', { number: item.seriesMembership?.chapterNumber })}: ${item.title}` }))]} ariaLabel={t('cinematic.series.chapter')} disabled={busy || !chapters.length} onValueChange={id => { const chapter = chapters.find(item => item.projectId === id); if (chapter && id !== project.id) void execute(async () => { await onPrepare(); if (getActiveActorId() === actorId) onNavigate(id, chapter.activeStage); }); }} /></label>
    </> : null}
    {isSetup || series ? <Button size="sm" icon={busy || workspace.isFetching ? <ProcessingSpinner className="size-4" /> : series ? <Settings2 /> : <Plus />} disabled={busy || workspace.isFetching} onClick={() => { setError(''); setOpen(true); }}>{t(series ? 'cinematic.series.manage' : 'cinematic.series.create')}</Button> : null}
    {workspace.isError ? <div className="cinematic-series-feedback"><span role="alert">{t('cinematic.series.failed')}</span><Button size="sm" icon={<RefreshCw />} onClick={() => void workspace.refetch()}>{t('cinematic.series.retry')}</Button></div> : null}
    {error && !open ? <p className="cinematic-series-feedback cinematic-series-error" role="alert">{error}</p> : null}
    {open && workspace.data ? <SeriesManagerDialog key={`${project.id}:manager`} workspace={workspace.data} sourceTitle={project.title} seasonId={selectedSeason} busy={busy} error={error} onClose={() => setOpen(false)} onSubmit={command => void submit(command)} /> : null}
  </section>;
}
