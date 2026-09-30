import * as Dialog from '@radix-ui/react-dialog';
import { Check, ImagePlus, Images, RotateCcw, Save, WandSparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { useActor } from '../../../lib/auth/ActorProvider';
import { queryKeys } from '../../../lib/api/queryKeys';
import type { estimateGeneration, GenerationRequestDraft } from '../../generation/api/generationApi';
import { approveCinematicSceneEnvironment, getCinematicSceneEnvironment, listCinematicSceneEnvironmentImages, proposeCinematicSceneEnvironment, saveCinematicSceneEnvironment, submitCinematicStoryboardBatch } from '../api/cinematicApi';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';
import { DialogHeader } from './ProjectCostSummary';

type Props = { project: CinematicProject; scene: CinematicScene; onProjectRefresh?: () => void; disabled?: boolean;
  onBusyChange?: (busy: boolean) => void; compact?: boolean };

export function SceneEnvironmentControl(props: Props) {
  const { t } = useTranslation('cinematic');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actor } = useActor();
  const client = useQueryClient();
  const source = props.scene.approvedEnvironmentSource;
  const enabled = props.scene.environmentReferenceEnabled !== false;
  useEffect(() => {
    props.onBusyChange?.(open || busy);
    return () => props.onBusyChange?.(false);
  }, [open, busy, props.onBusyChange]);
  async function changeEnabled() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await saveCinematicSceneEnvironment(props.project.id, props.scene.id, { expectedVersion: props.project.version,
        expectedSceneVersion: props.scene.version, referenceEnabled: !enabled });
      await props.onProjectRefresh?.();
      await client.invalidateQueries({ queryKey: ['cinematic-storyboard-generation-context', actor?.userId, props.project.id] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed')); }
    finally { setBusy(false); }
  }
  return <div className={`cinematic-scene-environment${props.compact ? ' cinematic-scene-environment--row' : ''}${source && !enabled ? ' is-inactive' : ''}`}>
    {props.compact ? <div className="cinematic-scene-environment__preview">
      {source ? <AuthenticatedMediaImage src={source.thumbnailUrl || source.imageUrl} alt={props.scene.title}
        fallback={<Images aria-hidden="true" />} /> : <Images aria-hidden="true" />}
    </div> : source ? <AuthenticatedMediaImage className="cinematic-scene-environment__thumbnail"
      src={source.thumbnailUrl || source.imageUrl} alt={t('cinematic.environment.active')} /> : null}
    {props.compact ? <div className="cinematic-scene-environment__identity"><strong>{props.scene.title}</strong>
      <small>{t('cinematic.storyboard.referenceScene')}{source && !enabled ? ` / ${t('cinematic.storyboard.referenceInactive')}` : ''}</small>
    </div> : null}
    <Button size="sm" icon={<ImagePlus aria-hidden="true" />} disabled={props.disabled || busy} onClick={() => setOpen(true)}>
      {t(props.scene.approvedEnvironmentSource ? 'cinematic.environment.edit' : 'cinematic.environment.generate')}
    </Button>
    {source ? <div className="cinematic-scene-environment__switch">
      <span>{t('cinematic.environment.enabled')}</span>
      <ToggleSwitch label={t('cinematic.environment.enabled')} checked={enabled} disabled={props.disabled || busy} onClick={() => void changeEnabled()} />
      {busy ? <span role="status" aria-label={t('cinematic.save.saving')}><ProcessingSpinner /></span> : null}
    </div> : null}
    {error ? <p role="alert">{error}</p> : null}
    {open ? <SceneEnvironmentDialog {...props} onClose={() => setOpen(false)} /> : null}
  </div>;
}

function SceneEnvironmentDialog({ project, scene, onProjectRefresh, onClose }: Props & { onClose: () => void }) {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const client = useQueryClient();
  const galleryKey = ['cinematic-scene-images', actor?.userId, project.id, scene.id];
  const query = useQuery({ queryKey: ['cinematic-scene-environment', actor?.userId, project.id, scene.id, project.version],
    queryFn: () => getCinematicSceneEnvironment(project.id, scene.id), retry: false, staleTime: 10_000 });
  const gallery = useInfiniteQuery({ queryKey: galleryKey,
    initialPageParam: null as string | null, queryFn: ({ pageParam }) => listCinematicSceneEnvironmentImages(project.id, scene.id, pageParam),
    getNextPageParam: page => page.nextCursor, maxPages: 5, retry: false, staleTime: 10_000, refetchOnMount: 'always' });
  const [direction, setDirection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const galleryTimers = useRef<Set<number>>(new Set());
  const galleryMounted = useRef(true);
  const dirty = direction !== null && direction !== query.data?.environmentPrompt;
  const attempt = [...project.generationAttempts].reverse().find(value => {
    const item = value as Record<string, unknown>;
    return item.operation === 'cinematic_scene_environment' && item.sceneId === scene.id;
  }) as Record<string, unknown> | undefined;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  useEffect(() => {
    galleryMounted.current = true;
    const timers = galleryTimers.current;
    return () => {
      galleryMounted.current = false;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);
  function close() {
    if (!busy && (!dirty || window.confirm(t('cinematic.environment.discard')))) onClose();
  }
  async function refreshProjectImages() {
    await Promise.allSettled([
      client.invalidateQueries({ queryKey: queryKeys.cinematicProject(actor?.userId || 'loading', project.id) }),
      client.invalidateQueries({ queryKey: galleryKey })
    ]);
  }
  async function refreshCompletedImage(jobId: string) {
    await refreshProjectImages();
    if (!galleryMounted.current) return;
    const first = await gallery.refetch();
    if (!galleryMounted.current || first.data?.pages.some(page => page.items.some(item => item.jobId === jobId))) return;
    function retry(remaining: number) {
      const timer = window.setTimeout(async () => {
        galleryTimers.current.delete(timer);
        if (!galleryMounted.current) return;
        const result = await gallery.refetch();
        if (galleryMounted.current && !result.data?.pages.some(page => page.items.some(item => item.jobId === jobId)) && remaining > 1) retry(remaining - 1);
      }, 1500);
      galleryTimers.current.add(timer);
    }
    retry(2);
  }
  async function mutate(operation: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try {
      await operation(); await onProjectRefresh?.(); await query.refetch();
      await client.invalidateQueries({ queryKey: ['cinematic-storyboard-generation-context', actor?.userId, project.id] });
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed')); }
    finally { setBusy(false); }
  }
  async function proposeDirection() {
    if (!query.data || busy) return;
    setBusy(true); setProposing(true); setError(null);
    try {
      const proposal = await proposeCinematicSceneEnvironment(project.id, scene.id, {
        expectedVersion: query.data.projectVersion,
        expectedSceneVersion: query.data.sceneVersion,
        currentDirection: direction ?? query.data.environmentPrompt
      });
      setDirection(proposal.environmentPrompt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.environment.proposalFailed'));
    } finally {
      setProposing(false); setBusy(false);
    }
  }
  async function submit(draft: GenerationRequestDraft, quote: Awaited<ReturnType<typeof estimateGeneration>>) {
    const context = query.data;
    if (!context || dirty || busy) throw new Error(t('cinematic.environment.saveFirst'));
    const result = await submitCinematicStoryboardBatch(project.id, { expectedVersion: context.projectVersion,
      idempotencyKey: requestKey.current, operations: [{ operationId: `environment:${scene.id}`, purpose: 'scene_environment',
        sceneId: scene.id, expectedSceneVersion: context.sceneVersion, promptFingerprint: context.promptFingerprint,
        estimateId: quote.estimate.estimateId, draft }] });
    const child = result.children[0];
    if (!child || child.status === 'failed') throw new Error(child?.error?.message || t('cinematic.storyboard.generationBlocked'));
    requestKey.current = crypto.randomUUID();
    await refreshProjectImages();
    await query.refetch();
    return { jobId: child.jobId, status: child.status };
  }
  const blockedReason = busy ? t('cinematic.save.saving') : query.isPending ? t('cinematic.storyboard.loadingAuthority')
    : query.error?.message || (dirty ? t('cinematic.environment.saveFirst') : null);
  return <Dialog.Root open onOpenChange={open => { if (!open) close(); }}><Dialog.Portal>
    <Dialog.Overlay className="cinematic-dialog__overlay" />
    <Dialog.Content className="cinematic-dialog__content cinematic-environment-dialog">
      <DialogHeader title={t('cinematic.environment.title')} description={scene.title} />
      <div className="cinematic-environment-dialog__body">
        <section className="cinematic-environment-stage cinematic-environment-stage--direction">
        <div className="cinematic-environment-dialog__prompt">
          <div className="cinematic-environment-dialog__prompt-heading">
            <label htmlFor={`scene-environment-direction-${scene.id}`}><span className="cinematic-environment-stage__number" aria-hidden="true">01</span>{t('cinematic.environment.direction')}</label>
            <Button size="sm" icon={proposing ? <ProcessingSpinner /> : <WandSparkles aria-hidden="true" />}
              disabled={busy || query.isPending || !query.data} onClick={() => void proposeDirection()}>
              {t(proposing ? 'cinematic.environment.generatingDescription' : 'cinematic.environment.generateDescription')}
            </Button>
          </div>
          {proposing ? <small role="status">{t('cinematic.environment.generatingStatus')}</small> : null}
          <textarea id={`scene-environment-direction-${scene.id}`} rows={4} maxLength={2500}
            value={direction ?? query.data?.environmentPrompt ?? ''} disabled={busy || query.isPending}
            onChange={event => setDirection(event.target.value)} />
          <small>{t('cinematic.environment.proposalHint')}</small>
        </div>
        <Button icon={busy ? <ProcessingSpinner /> : <Save />} disabled={busy || !dirty || !query.data}
          onClick={() => void mutate(async () => {
            await saveCinematicSceneEnvironment(project.id, scene.id, { expectedVersion: query.data!.projectVersion,
              expectedSceneVersion: query.data!.sceneVersion, environmentPrompt: direction! });
            setDirection(null);
          })}>{t('cinematic.environment.save')}</Button>
        {error || query.error ? <p role="alert">{error || query.error?.message}</p> : null}
        </section>
        <GenerationExperience surface="cinematic" generationMode="scene" authoringMode="manual"
          renderWorkspace={regions => <div className="cinematic-environment-workspace">
            <section className="cinematic-environment-stage cinematic-environment-stage--generate">
              <h3 className="cinematic-environment-stage__heading"><span className="cinematic-environment-stage__number" aria-hidden="true">02</span>{t('cinematic.environment.generate')}</h3>
              {regions.engine}{regions.actions}{regions.queue}{regions.messages}{regions.prompt}
            </section>
            <section className="cinematic-environment-stage cinematic-environment-stage--review">
              <h3 className="cinematic-environment-stage__heading"><span className="cinematic-environment-stage__number" aria-hidden="true">03</span>{t('cinematic.environment.gallery')}</h3>
              {query.data?.approvedSource ? <div className="cinematic-environment-dialog__approved">
                <AuthenticatedMediaImage src={query.data.approvedSource.thumbnailUrl || query.data.approvedSource.imageUrl} alt={t('cinematic.environment.active')} />
                <strong><Check size={16} aria-hidden="true" />{t('cinematic.environment.active')}</strong>
              </div> : null}
              {regions.result}
              <div className="cinematic-environment-gallery">
                <header><h4><Images size={16} aria-hidden="true" />{t('cinematic.environment.gallery')}</h4>
                  <Button size="sm" icon={gallery.isFetching ? <ProcessingSpinner /> : <RotateCcw />}
                    aria-label={t('cinematic.environment.refresh')} title={t('cinematic.environment.refresh')}
                    disabled={gallery.isFetching || busy} onClick={() => void gallery.refetch()} /></header>
                {gallery.isPending ? <span role="status"><ProcessingSpinner />{t('cinematic.environment.loading')}</span> : null}
                {gallery.error ? <p role="alert">{gallery.error.message}</p> : null}
                {gallery.data && !gallery.data.pages.some(page => page.items.length) ? <p>{t('cinematic.environment.empty')}</p> : null}
                <div className="cinematic-environment-gallery__grid">
                  {gallery.data?.pages.flatMap(page => page.items).map(item => {
                    const selected = query.data?.approvedSource?.sourceJobId === item.jobId;
                    const title = item.sceneTitle || t('cinematic.manual.sceneNumber', { number: Math.max(1, project.scenes.findIndex(scene => scene.id === item.sceneId) + 1) });
                    return <button type="button" key={item.jobId} className="cinematic-environment-gallery__item" aria-pressed={selected}
                      aria-label={`${t('cinematic.environment.select')}: ${title}`} disabled={busy || dirty || !query.data}
                      onClick={() => void mutate(() => approveCinematicSceneEnvironment(project.id, scene.id,
                        { expectedVersion: query.data!.projectVersion, jobId: item.jobId, reuse: true }))}>
                      <AuthenticatedMediaImage src={item.thumbnailUrl || item.imageUrl} alt={title} />
                      <span>{title}{selected ? <Check size={16} aria-hidden="true" /> : null}</span>
                    </button>;
                  })}
                </div>
                {gallery.hasNextPage ? <Button size="sm" disabled={gallery.isFetchingNextPage || busy}
                  icon={gallery.isFetchingNextPage ? <ProcessingSpinner /> : <Images />}
                  onClick={() => void gallery.fetchNextPage()}>{t('cinematic.environment.more')}</Button> : null}
              </div>
            </section>
          </div>}
          prompt={query.data?.compiledPrompt || ''} cinematicContainsPeople={false} cinematicFaceless={false} cinematicManualStoryboard
          allowComparison={false} allowPromptRefinement={false} fixedOutputCount={1} fixedAspectRatio={project.aspectRatio}
          references={{}} referenceRoles={[]} referencesReadOnly enginePresentation="compact" layoutVariant="stacked"
          showPromptEditor={false} readOnlyPrompt={{ label: t('cinematic.environment.compiledPrompt'), collapsed: true }}
          persistenceScope={`${project.id}:${scene.id}:environment`} blockedReason={blockedReason} showEmptyResult
          resumeJobId={typeof attempt?.generationJobId === 'string' ? attempt.generationJobId : null} submitSingleDraft={submit}
          onCompleted={jobId => { void refreshCompletedImage(jobId); }}
          renderResultActions={job => <Button variant="primary" icon={busy ? <ProcessingSpinner /> : <Check />}
            disabled={busy || dirty || !query.data || query.data.approvedSource?.sourceJobId === (job.jobId || job.id)}
            onClick={() => void mutate(() => approveCinematicSceneEnvironment(project.id, scene.id,
              { expectedVersion: query.data!.projectVersion, jobId: (job.jobId || job.id)! }))}>{t('cinematic.environment.use')}</Button>} />
      </div>
      <footer className="cinematic-dialog__footer"><Button disabled={busy} onClick={close}>{t('cinematic.actions.close')}</Button></footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
