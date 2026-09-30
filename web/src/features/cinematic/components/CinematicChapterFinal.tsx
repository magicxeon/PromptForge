import { ArrowLeft, CheckCircle2, Film, Pencil, RotateCcw, TriangleAlert } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { VideoMediaPlayer } from '../../../components/media/VideoMediaPlayer';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { ApiError } from '../../../lib/api/apiError';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { getCinematicClipBundleManifest } from '../api/cinematicApi';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';
import { ClipBundleDownload } from './produce/ClipBundleDownload';

type Props = {
  project: CinematicProject;
  actorId: string;
  onOpenShot: (shotId: string) => void;
  onBackToScenes: () => void;
  onOpenTimeline?: () => void;
};

const takeSchema = z.object({
  id: z.string(), shotId: z.string(),
  operation: z.enum(['cinematic_draft_clip', 'cinematic_final_clip', 'cinematic_motion_preview']),
  status: z.string(),
  outputAsset: z.object({ id: z.string().optional(), publicUrl: z.string().nullish(), posterUrl: z.string().nullish() }).nullish(),
  usableRange: z.object({ trimInMs: z.number().nonnegative(), trimOutMs: z.number().positive() }).nullish()
});

type Take = z.infer<typeof takeSchema>;
type Reason = 'ready' | 'no_selection' | 'not_ready' | 'source_changed' | 'source_unavailable'
  | 'checking' | 'checkUnavailable' | 'projectChanged';

export function CinematicChapterFinal(props: Props) {
  return <ChapterFinalWorkspace key={`${props.actorId}:${props.project.id}`} {...props} />;
}

function ChapterFinalWorkspace({ project, actorId, onOpenShot, onBackToScenes, onOpenTimeline }: Props) {
  const { t } = useTranslation('cinematic');
  const headingId = useId();
  const previewId = useId();
  const [previewShotId, setPreviewShotId] = useState<string | null>(null);
  const scenes = useMemo(() => [...project.scenes].sort((a, b) => a.orderKey - b.orderKey)
    .map(scene => ({ scene, shots: orderedShots(scene) })), [project.scenes]);
  const shots = scenes.flatMap(({ shots }) => shots);
  const takes = useMemo(() => project.generationAttempts.flatMap(value => {
    const parsed = takeSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  }), [project.generationAttempts]);
  const actorMatches = actorId === getActiveActorId();
  const manifest = useQuery({
    queryKey: ['cinematic-clip-bundle', actorId, project.id, project.version],
    queryFn: ({ signal }) => getCinematicClipBundleManifest(project.id, signal),
    enabled: actorMatches && shots.length > 0,
    retry: false, staleTime: 0, gcTime: 60_000,
    refetchOnWindowFocus: false, refetchOnReconnect: false
  });
  const currentManifest = !manifest.isError && manifest.data?.projectId === project.id
    && manifest.data.projectVersion === project.version ? manifest.data : undefined;
  const projectChanged = Boolean(manifest.data && !currentManifest && !manifest.isError);
  const checkUnavailable = manifest.isError || manifest.fetchStatus === 'paused';
  const selectedTake = (shot: CinematicShot) => takes.find(take => take.id === shot.approvedVideoAttemptId && take.shotId === shot.id);
  function reason(shot: CinematicShot, take: Take | undefined): Reason {
    if (checkUnavailable) return 'checkUnavailable';
    if (projectChanged) return 'projectChanged';
    if (!currentManifest) return 'checking';
    const missing = currentManifest.missing.find(item => item.shotId === shot.id);
    if (missing) return missing.reason;
    const clip = currentManifest.clips.find(item => item.shotId === shot.id);
    if (!clip) return 'checkUnavailable';
    return take?.status === 'approved' && clip.attemptId === take.id && clip.assetId === take.outputAsset?.id ? 'ready' : 'projectChanged';
  }
  const currentShot = shots.find(shot => shot.id === previewShotId) || shots[0];
  const selected = currentShot ? selectedTake(currentShot) : undefined;
  const currentReason = currentShot ? reason(currentShot, selected) : null;
  const currentClip = currentManifest?.clips.find(clip => clip.shotId === currentShot?.id);
  const currentTake = currentClip
    ? currentReason === 'ready' ? takes.find(take => take.id === currentClip.attemptId && take.shotId === currentShot?.id) : undefined
    : currentReason === 'source_changed' || currentReason === 'not_ready' ? selected : undefined;
  const readyCount = shots.filter(shot => reason(shot, selectedTake(shot)) === 'ready').length;
  const range = currentClip?.usableRange || currentTake?.usableRange;
  const errorKey = manifest.error instanceof ApiError && manifest.error.code === 'cinematic_clip_bundle_too_large'
    ? 'cinematic.chapterFinal.bundleTooLarge' : 'cinematic.chapterFinal.checkUnavailable';

  if (!actorMatches) return <StatusNotice tone="error" title={t('cinematic.chapterFinal.checkUnavailable')} />;

  return <section aria-labelledby={headingId} className="cinematic-chapter-final grid min-w-0 gap-5">
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 break-words">
        <h1 id={headingId} className="m-0 text-xl font-semibold">{t('cinematic.chapterFinal.title')}</h1>
        <p className="mt-1 break-words text-sm text-[var(--theme-text-muted)]">{project.chapterTitle || project.title}</p>
      </div>
      <div className="flex max-w-full flex-wrap gap-2 [&>button]:max-w-full [&>button]:whitespace-normal">
        <Button icon={<ArrowLeft aria-hidden="true" />} onClick={onBackToScenes}>{t('cinematic.shotWriter.backToScenes')}</Button>
        {onOpenTimeline ? <Button icon={<Film aria-hidden="true" />} onClick={onOpenTimeline}>{t('cinematic.chapterFinal.openTimeline')}</Button> : null}
        {shots.length && !projectChanged ? <ClipBundleDownload projectId={project.id} version={project.version} /> : null}
      </div>
    </header>

    {!shots.length ? <StatusNotice tone="info" title={t('cinematic.chapterFinal.empty')} /> : <>
      {manifest.isFetching ? <p role="status" className="flex items-center gap-2 text-sm"><ProcessingSpinner className="size-4" />{t('cinematic.chapterFinal.checking')}</p> : null}
      {checkUnavailable ? <StatusNotice tone="error" title={t(errorKey)} action={<Button size="sm" icon={<RotateCcw aria-hidden="true" />} disabled={manifest.isFetching} onClick={() => void manifest.refetch()}>{t('cinematic.series.retry')}</Button>} /> : null}
      {projectChanged ? <StatusNotice tone="warning" title={t('cinematic.chapterFinal.projectChanged')} /> : null}
      {currentManifest && !checkUnavailable ? <p role="status" className="m-0 text-sm">{t('cinematic.chapterFinal.summary', { ready: readyCount, total: shots.length })}</p> : null}

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby={previewId} className="grid min-w-0 gap-3">
          <h2 id={previewId} className="m-0 break-words text-base font-semibold">{t('cinematic.chapterFinal.preview', { title: currentShot?.title })}</h2>
          <div className="relative grid aspect-video min-w-0 w-full overflow-hidden rounded-[var(--mpf-radius-sm)] bg-[var(--theme-input)]">
            {currentTake?.outputAsset?.publicUrl ? <VideoMediaPlayer
              key={`${actorId}:${project.id}:${currentShot?.id}:${currentTake.id}`}
              className="absolute inset-0"
              videoUrl={currentTake.outputAsset.publicUrl} posterUrl={currentTake.outputAsset.posterUrl}
              title={t('cinematic.chapterFinal.preview', { title: currentShot?.title })}
            /> : <p role="status" className="m-auto max-w-full break-words p-4 text-center text-sm">{t('cinematic.chapterFinal.noPreview')}</p>}
          </div>
          {currentReason ? <p role="status" className="m-0 break-words text-sm">{t(`cinematic.chapterFinal.reason.${currentReason}`)}</p> : null}
          {currentTake ? <p className="m-0 break-all text-sm text-[var(--theme-text-muted)]">{t('cinematic.chapterFinal.selectedTake', { id: currentTake.id })}</p> : null}
          {range && range.trimOutMs > range.trimInMs ? <p className="m-0 text-sm">{t('cinematic.chapterFinal.usableRange', { start: range.trimInMs / 1000, end: range.trimOutMs / 1000 })}</p> : null}
        </section>

        <div className="grid min-w-0 gap-4">
          {scenes.map(({ scene, shots: sceneShots }, sceneIndex) => <section key={scene.id} aria-label={scene.title} className="min-w-0">
            <h2 className="m-0 break-words text-base font-semibold">{scene.title}</h2>
            {!sceneShots.length ? <p className="text-sm text-[var(--theme-text-muted)]">{t('cinematic.chapterFinal.emptyScene')}</p> : null}
            <ol className="m-0 list-none p-0">
              {sceneShots.map((shot, shotIndex) => {
                const take = selectedTake(shot);
                const status = reason(shot, take);
                const active = currentShot?.id === shot.id;
                return <li key={shot.id} className="flex min-w-0 flex-wrap items-center gap-2 border-b border-[var(--theme-border)] py-3">
                  <button type="button" aria-pressed={active} onClick={() => setPreviewShotId(shot.id)}
                    className={`min-w-0 flex-[1_1_12rem] rounded-[var(--mpf-radius-sm)] border p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--theme-primary)] ${active ? 'border-[var(--theme-primary)] bg-[var(--theme-hover)]' : 'border-transparent hover:bg-[var(--theme-hover)]'}`}>
                    <span className="block text-xs text-[var(--theme-text-muted)]">{t('cinematic.bundle.shot', { scene: sceneIndex + 1, shot: shotIndex + 1 })}</span>
                    <strong className="block break-words font-semibold">{shot.title}</strong>
                    <span className="mt-1 flex items-start gap-2 break-words text-[var(--theme-text-muted)]">
                      {status === 'ready' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : status === 'checking' ? <ProcessingSpinner className="size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                      <span className="min-w-0">{t(`cinematic.chapterFinal.reason.${status}`)}</span>
                    </span>
                  </button>
                  <Button size="sm" icon={<Pencil aria-hidden="true" />} aria-label={t('cinematic.chapterFinal.openShot', { title: shot.title })} onClick={() => onOpenShot(shot.id)}>{t('cinematic.produce.openShot')}</Button>
                </li>;
              })}
            </ol>
          </section>)}
        </div>
      </div>
    </>}
  </section>;
}

function orderedShots(scene: CinematicScene) {
  const byId = new Map(scene.shots.map(shot => [shot.id, shot]));
  const order = [...new Set([...(scene.shotOrder || []), ...[...scene.shots].sort((a, b) => a.orderKey - b.orderKey).map(shot => shot.id)])];
  return order.flatMap(id => { const shot = byId.get(id); return shot ? [shot] : []; });
}
