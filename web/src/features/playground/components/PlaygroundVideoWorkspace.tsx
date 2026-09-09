import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDown, CheckCircle2, Film, Maximize2, Sparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { EngineTargetPanelFrame } from '../../../components/generation/EngineTargetPanelFrame';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { PlaygroundGenerationWorkspace } from '../../../components/generation/PlaygroundGenerationWorkspace';
import { PromptEditor } from '../../../components/generation/PromptEditor';
import { VideoEngineTargetPanel } from '../../../components/generation/VideoEngineTargetPanel';
import {
  GenerationVideoViewer,
  type GenerationVideoViewerItem
} from '../../../components/media/GenerationVideoViewer';
import { VideoMediaPlayer } from '../../../components/media/VideoMediaPlayer';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { queryKeys } from '../../../lib/api/queryKeys';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { characterSummarySchema, type CharacterSummary } from '../../profiles/schemas/profileSchemas';
import { VideoLookSheetSources } from './VideoLookSheetSources';
import { trustedVideoSourceSchema, type TrustedVideoSource } from '../api/trustedVideoSources';
import { buildVideoReferenceSelection, selectedLooks, type NamedTrustedVideoSource, type VideoLookSheet } from './videoReferenceSelection';
import {
  getVideoCapabilityCatalog,
  getVideoTask,
  listRecentVideoTasks,
  quoteVideoGeneration,
  submitVideoGeneration,
  type VideoGenerationInput
} from '../../generation/api/videoGenerationApi';
import type { VideoTask } from '../../generation/schemas/videoGenerationSchemas';
import { focusResultRegionAfterLayout } from './resultRegionFocus';
import { canQuoteVideoModel, filterVideoModelsForOperation, migrateVideoProviderModelKey } from './videoModelSelection';
import { getVideoGenerationReadiness } from './videoGenerationReadiness';

const VIDEO_DRAFT_FEATURE = 'playground-video';
const VIDEO_DRAFT_VERSION = 5;
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);

type VideoDraft = {
  lookSheets?: VideoLookSheet[];
  trustedLooks?: NamedTrustedVideoSource[];
  prompt: string;
  operation: 'text_to_video' | 'image_to_video' | 'character_to_video';
  providerModelKey: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: string;
  comparisonActive: boolean;
  referenceImageUrl: string | null;
  character: CharacterSummary | null;
  lookSheet: VideoLookSheet | null;
  trustedFrame: TrustedVideoSource | null;
  trustedLook: TrustedVideoSource | null;
  activeTaskId: string | null;
  recentExpanded: boolean;
};

const EMPTY_DRAFT: VideoDraft = {
  prompt: '',
  operation: 'text_to_video',
  providerModelKey: '',
  aspectRatio: '9:16',
  resolution: '720p',
  durationSeconds: 8,
  audioMode: 'generated',
  comparisonActive: false,
  referenceImageUrl: null,
  character: null,
  lookSheet: null,
  trustedFrame: null,
  trustedLook: null,
  activeTaskId: null,
  recentExpanded: true
};

export function PlaygroundVideoExperience() {
  const { actor } = useActor();
  return <PlaygroundVideoSession key={actor?.userId || 'loading'} />;
}

function PlaygroundVideoSession() {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const promptRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const cancelResultFocusRef = useRef<(() => void) | null>(null);
  const completedTaskRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<VideoDraft>(() => readVideoDraft(actor?.userId));
  const [taskId, setTaskId] = useState<string | null>(draft.activeTaskId);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerActiveId, setViewerActiveId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const submissionKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const capabilities = useQuery({
    queryKey: ['video-capabilities', actor?.userId],
    queryFn: getVideoCapabilityCatalog,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false
  });
  const models = useMemo(() => capabilities.data?.models || [], [capabilities.data?.models]);
  const availableModels = useMemo(
    () => filterVideoModelsForOperation(models, draft.operation),
    [draft.operation, models]
  );
  const selectedModel = useMemo(
    () => models.find(model => `${model.providerId}:${model.modelId}` === draft.providerModelKey)
      || (!draft.providerModelKey ? availableModels[0] : null)
      || null,
    [models, availableModels, draft.providerModelKey]
  );
  const selectedModelCanQuote = canQuoteVideoModel(selectedModel);
  const trustedOnly = selectedModel?.playgroundReferencePolicy?.kind === 'trusted_generated_only';
  const referencePlan = useMemo(() => buildVideoReferenceSelection(draft, selectedModel), [draft, selectedModel]);
  const sourceReady = referencePlan.ready && !uploading;
  const generationInput = useMemo<VideoGenerationInput | null>(() => selectedModel ? ({
    providerId: selectedModel.providerId,
    modelId: selectedModel.modelId,
    operation: draft.operation,
    inputMode: referencePlan.inputMode,
    prompt: draft.prompt.trim(),
    aspectRatio: draft.aspectRatio,
    resolution: draft.resolution,
    durationSeconds: draft.durationSeconds,
    audioMode: draft.audioMode === 'none' ? 'none' : 'generated',
    references: referencePlan.references,
    referencePlanVersion: draft.operation === 'text_to_video' ? undefined : trustedOnly ? 'playground-trusted-v1' : 'playground-reference-v1',
    characterProfileId: !trustedOnly && draft.operation === 'character_to_video' ? selectedLooks(draft)[0]?.characterProfileId || draft.character?.id : null,
    characterProfileVersionId: !trustedOnly && draft.operation === 'character_to_video'
      ? selectedLooks(draft)[0]?.characterProfileVersionId || draft.character?.characterProfileVersionId
      : null
  }) : null, [draft, selectedModel, referencePlan, trustedOnly]);
  const quote = useQuery({
    queryKey: ['video-quote', actor?.userId, generationInput],
    queryFn: () => quoteVideoGeneration(generationInput!),
    enabled: Boolean(generationInput?.prompt && sourceReady && selectedModelCanQuote),
    retry: false,
    staleTime: 30_000
  });
  const task = useQuery({
    queryKey: ['video-task', actor?.userId, taskId],
    queryFn: () => getVideoTask(taskId!),
    enabled: Boolean(taskId),
    retry: false,
    refetchInterval: query => TERMINAL.has(query.state.data?.status || '') ? false : 5_000
  });
  const recent = useQuery({
    queryKey: ['video-tasks', actor?.userId, 'playground-recent'],
    queryFn: () => listRecentVideoTasks(6),
    enabled: Boolean(actor?.userId),
    staleTime: 15_000
  });
  const submit = useMutation({
    mutationFn: (input: VideoGenerationInput & { estimateId: string; idempotencyKey: string }) => submitVideoGeneration(input),
    onSuccess: submitted => {
      submissionKeyRef.current = null;
      setTaskId(submitted.id);
      setDraft(current => ({ ...current, activeTaskId: submitted.id }));
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      void queryClient.invalidateQueries({ queryKey: ['video-tasks', actor?.userId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.generationJobCenter(actor?.userId || 'loading') });
    },
    onSettled: () => { submittingRef.current = false; }
  });
  useEffect(() => {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: VIDEO_DRAFT_FEATURE,
      schemaVersion: VIDEO_DRAFT_VERSION,
      payload: draft
    });
  }, [actor?.userId, draft]);
  useEffect(() => () => cancelResultFocusRef.current?.(), []);
  useEffect(() => {
    if (!selectedModel) return;
    setDraft(current => ({
      ...current,
      providerModelKey: `${selectedModel.providerId}:${selectedModel.modelId}`,
      aspectRatio: selectedModel.aspectRatios.includes(current.aspectRatio)
        ? current.aspectRatio
        : (selectedModel.aspectRatios[0] ?? current.aspectRatio),
      resolution: selectedModel.resolutions.includes(current.resolution)
        ? current.resolution
        : (selectedModel.resolutions[0] ?? current.resolution),
      durationSeconds: selectedModel.durations.includes(current.durationSeconds)
        ? current.durationSeconds
        : (selectedModel.durations[0] ?? current.durationSeconds),
      audioMode: selectedModel.audioModes.includes(current.audioMode as 'none' | 'generated')
        ? current.audioMode
        : (selectedModel.audioModes[0] ?? current.audioMode)
    }));
  }, [selectedModel]);

  const activeTask = task.data || submit.data;
  const viewerItems = useMemo(() => {
    const byId = new Map<string, VideoTask>();
    for (const item of recent.data?.items || []) byId.set(item.id, item);
    if (activeTask) byId.set(activeTask.id, activeTask);
    return [...byId.values()]
      .filter(item => item.status === 'completed' && Boolean(item.outputAsset?.publicUrl))
      .map(toVideoViewerItem);
  }, [activeTask, recent.data?.items]);
  useEffect(() => {
    if (!activeTask || !TERMINAL.has(activeTask.status) || completedTaskRef.current === activeTask.id) return;
    completedTaskRef.current = activeTask.id;
    void queryClient.invalidateQueries({ queryKey: ['credits'] });
    void queryClient.invalidateQueries({ queryKey: ['video-tasks', actor?.userId] });
    void queryClient.invalidateQueries({ queryKey: ['trusted-video-sources', actor?.userId] });
  }, [activeTask, actor?.userId, queryClient]);

  const comparisonEnabled = capabilities.data?.comparison.enabled === true
    && availableModels.filter(canQuoteVideoModel).length >= 2;
  const readiness = getVideoGenerationReadiness({
    submitting: submit.isPending,
    hasActiveTask: Boolean(activeTask && !TERMINAL.has(activeTask.status)),
    hasPrompt: Boolean(generationInput?.prompt),
    sourceReady,
    modelCanQuote: selectedModelCanQuote,
    quoteFetching: quote.isFetching,
    quoteFailed: quote.isError,
    quoteAvailable: Boolean(quote.data),
    canAfford: quote.data?.account.canAfford === true
  });
  const generationReady = readiness.ready;
  const loading = submit.isPending || Boolean(activeTask && !TERMINAL.has(activeTask.status));
  const providerErrorMessage = activeTask?.providerError?.code === 'ModelNotOpen'
    ? t('playground.video.providerError.modelNotOpen')
    : activeTask?.providerError?.providerCode || activeTask?.providerError?.code || null;
  const errorMessage = submit.error?.message
    || task.error?.message
    || providerErrorMessage
    || null;

  const resultRegion = (
    <section
      ref={resultRef}
      id="generation-video-results"
      aria-labelledby="playground-video-result-title"
      tabIndex={-1}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase text-cyan-300">{t('playground.result.kicker')}</span>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h2 id="playground-video-result-title" className="m-0 truncate text-xl">{t('playground.video.resultTitle')}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTask?.status === 'completed' && activeTask.outputAsset?.publicUrl ? (
            <Button
              variant="ghost"
              icon={<Maximize2 className="size-4" />}
              onClick={() => openViewer(activeTask.id)}
            >
              {t('playground.video.openDetails')}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            icon={<ArrowDown className="size-4" />}
            onClick={() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            {t('playground.action.goToPrompt')}
          </Button>
        </div>
      </header>
      <Surface
        fill={!activeTask || activeTask.status !== 'completed'}
        centerContent={!activeTask || activeTask.status !== 'completed'}
        className={`generation-result__media-surface playground-video-result-media overflow-hidden bg-[var(--theme-bg-raised)] p-0${!activeTask || activeTask.status !== 'completed' ? ' generation-result__media-surface--placeholder' : ''}`}
      >
          {activeTask?.status === 'completed' && activeTask.outputAsset?.publicUrl ? (
            <VideoMediaPlayer
              videoUrl={activeTask.outputAsset.publicUrl}
              title={t('playground.video.resultTitle')}
            />
          ) : (
            <GenerationStageState
              className="generation-stage-state--result"
              loading={loading}
              title={loading
                ? t('playground.video.generatingTitle')
                : errorMessage
                  ? t('playground.video.failedTitle')
                  : t('playground.video.emptyTitle')}
              description={errorMessage || (loading
                ? t('playground.video.generatingDescription')
                : t('playground.video.emptyDescription'))}
            />
          )}
      </Surface>
      {activeTask ? (
        <div
          className={`playground-video-task-status playground-video-task-status--${videoTaskTone(activeTask.status)}`}
          role="status"
        >
          <div className="playground-video-task-status__state">
            {videoTaskTone(activeTask.status) === 'active'
              ? <ProcessingSpinner className="playground-video-task-status__spinner" aria-hidden="true" />
              : videoTaskTone(activeTask.status) === 'success'
                ? <CheckCircle2 aria-hidden="true" />
                : <AlertCircle aria-hidden="true" />}
            <span>
              <strong>{t(videoTaskStatusKey(activeTask.status))}</strong>
              <small title={activeTask.id}>{t('playground.video.taskStatus.taskId', { id: activeTask.id })}</small>
            </span>
          </div>
          {activeTask.providerError?.providerRequestId ? (
            <small className="playground-video-task-status__request-id">
              {t('playground.video.references.requestId', { id: activeTask.providerError.providerRequestId })}
            </small>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  const directionRegion = (
    <div ref={promptRef}>
      <PromptEditor
        variant="playground"
        value={draft.prompt}
        negativeValue=""
        onChange={prompt => setDraft(current => ({ ...current, prompt }))}
        onNegativeChange={() => {}}
        primaryLabel={t('playground.video.promptTitle')}
        primaryDescription={t('playground.video.promptDescription')}
        primaryPlaceholder={t('playground.video.promptPlaceholder')}
        primaryMaxLength={4000}
        showNegative={false}
        inputId="playground-video-prompt"
        primaryFooter={(
          <div className="playground-video-source-block">
            <fieldset className="playground-video-source-options">
              <legend>{t('playground.video.sourceTitle')}</legend>
              <div>
                {(['text_to_video', 'image_to_video', 'character_to_video'] as const).map(operation => (
                  <Button
                    key={operation}
                    type="button"
                    variant={draft.operation === operation ? 'primary' : 'secondary'}
                    aria-pressed={draft.operation === operation}
                    onClick={() => setDraft(current => ({ ...current, operation }))}
                  >
                    {t(`playground.video.operation.${operation}`)}
                  </Button>
                ))}
              </div>
            </fieldset>
            {draft.operation !== 'text_to_video' ? <VideoLookSheetSources key={`${draft.operation}:${draft.providerModelKey}`}
              model={selectedModel} value={draft} onChange={patch => setDraft(current => ({ ...current, ...patch }))} onBusy={setUploading} /> : null}
            <div className="playground-video-reference-summary">
              {t('playground.video.references.summary', { mode: referencePlan.inputMode, count: referencePlan.references.length })}
              {referencePlan.references.map((reference, index) => <div key={`${reference.purpose}:${index}`}>
                {index + 1}. {reference.role} · {t(`playground.video.references.purpose.${reference.purpose}`)}
              </div>)}
              {referencePlan.reason ? <p role="status">{t(referencePlan.reason)}</p> : null}
            </div>
          </div>
        )}
      />
    </div>
  );

  const engineRegion = (
    capabilities.isLoading ? (
      <EngineTargetPanelFrame
        title={t('playground.section.engine')}
        description={t('playground.video.engineDescription')}
        badge={<Sparkles className="size-5 text-amber-300" aria-hidden="true" />}
        studioLayout
      >
        <p className="p-4" role="status">{t('playground.video.loadingModels')}</p>
      </EngineTargetPanelFrame>
    ) : selectedModel ? (
      <VideoEngineTargetPanel
          models={models}
          catalogModels={models}
          selectedModel={selectedModel}
          aspectRatio={draft.aspectRatio}
          resolution={draft.resolution}
          durationSeconds={draft.durationSeconds}
          audioMode={draft.audioMode}
          comparisonEnabled={comparisonEnabled}
          comparisonActive={draft.comparisonActive}
          quoteLoading={quote.isFetching}
          estimatedCredits={quote.data?.estimate.estimatedCredits}
          canAfford={quote.data?.account.canAfford}
          quoteError={quote.error?.message}
          onModelChange={providerModelKey => setDraft(current => ({ ...current, providerModelKey }))}
          onAspectRatioChange={aspectRatio => setDraft(current => ({ ...current, aspectRatio }))}
          onResolutionChange={resolution => setDraft(current => ({ ...current, resolution }))}
          onDurationChange={durationSeconds => setDraft(current => ({ ...current, durationSeconds }))}
          onAudioModeChange={audioMode => setDraft(current => ({ ...current, audioMode }))}
          onComparisonChange={() => setDraft(current => ({ ...current, comparisonActive: !current.comparisonActive }))}
      />
    ) : (
      <EngineTargetPanelFrame
        title={t('playground.section.engine')}
        description={t('playground.video.engineDescription')}
        badge={<Sparkles className="size-5 text-amber-300" aria-hidden="true" />}
        studioLayout
      >
        <div className="p-4">
          <p className="m-0 font-semibold text-amber-200">{t('playground.video.qualificationBlockedTitle')}</p>
          <p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('playground.video.qualificationBlockedDescription')}</p>
        </div>
      </EngineTargetPanelFrame>
    )
  );

  const actionRegion = (
    <Surface className="studio-generation-action">
      <Button
        className="studio-generate-button btn-neon-yellow-glow"
        size="lg"
        icon={<Sparkles className="size-5" />}
        disabled={!generationReady}
        onClick={() => {
          if (!generationReady || !generationInput || !quote.data || submittingRef.current) return;
          if (new Date(quote.data.estimate.expiresAt).getTime() <= Date.now()) { void quote.refetch(); return; }
          submittingRef.current = true;
          const signature = JSON.stringify(generationInput);
          if (submissionKeyRef.current?.signature !== signature) submissionKeyRef.current = { signature, key: `playground-video:${crypto.randomUUID()}` };
          submit.mutate({ ...generationInput, estimateId: quote.data.estimate.estimateId,
            requestFingerprint: quote.data.requestFingerprint, idempotencyKey: submissionKeyRef.current.key });
          cancelResultFocusRef.current?.();
          cancelResultFocusRef.current = focusResultRegionAfterLayout(resultRef.current);
        }}
      >
        <span>{submit.isPending ? t('playground.video.submitting') : t('playground.video.generate')}</span>
        <small>{generationReady && quote.data
          ? `${quote.data.estimate.estimatedCredits} ${t('playground.comparison.credits')}`
          : readiness.reason === 'source_required' && referencePlan.reason
            ? t(referencePlan.reason)
            : t(`playground.video.readiness.${readiness.reason || 'ready'}`)}</small>
      </Button>
    </Surface>
  );

  return (
    <>
      <PlaygroundGenerationWorkspace
        prompt={directionRegion}
        result={resultRegion}
        queue={null}
        recent={<RecentVideoOutputs tasks={recent.data?.items || []} loading={recent.isLoading} onSelect={selected => {
          setTaskId(selected.id);
          setDraft(current => ({ ...current, activeTaskId: selected.id }));
          openViewer(selected.id);
        }} />}
        recentTitle={t('playground.video.recentTitle')}
        recentPlacement="after-engine"
        engine={engineRegion}
        references={null}
        actions={actionRegion}
        showRenderPromptHeading={false}
        recentExpanded={draft.recentExpanded}
        onRecentExpandedChange={recentExpanded => setDraft(current => ({ ...current, recentExpanded }))}
        comparisonActive={false}
      />
      <GenerationVideoViewer
        items={viewerItems}
        activeId={viewerActiveId}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onActiveIdChange={id => {
          setViewerActiveId(id);
          setTaskId(id);
          setDraft(current => ({ ...current, activeTaskId: id }));
        }}
      />
    </>
  );

  function openViewer(id: string) {
    setViewerActiveId(id);
    setViewerOpen(true);
  }
}

function videoTaskTone(status: string) {
  if (status === 'completed') return 'success';
  if (TERMINAL.has(status)) return 'error';
  return 'active';
}

function videoTaskStatusKey(status: string) {
  if (status === 'completed') return 'playground.video.taskStatus.completed';
  if (TERMINAL.has(status)) return 'playground.video.taskStatus.failed';
  if (['accepted', 'provider_submitting', 'submitted'].includes(status)) {
    return 'playground.video.taskStatus.submitting';
  }
  if (['queued', 'provider_queued'].includes(status)) return 'playground.video.taskStatus.queued';
  return 'playground.video.taskStatus.processing';
}

function RecentVideoOutputs({ tasks, loading, onSelect }: { tasks: VideoTask[]; loading: boolean; onSelect: (task: VideoTask) => void }) {
  const { t } = useTranslation('playground');
  if (loading) return <p className="playground-recent-panel__empty" role="status">{t('playground.video.loadingRecent')}</p>;
  if (!tasks.length) return <p className="playground-recent-panel__empty">{t('playground.video.recentEmpty')}</p>;
  return (
    <div className="playground-video-recent-grid">
      {tasks.map(task => (
        <button key={task.id} type="button" disabled={task.status !== 'completed'} onClick={() => onSelect(task)}>
          <span className="playground-video-recent-grid__media">
            {task.outputAsset?.publicUrl ? <video src={apiMediaUrl(task.outputAsset.publicUrl) || undefined} muted preload="metadata" aria-hidden="true" /> : <Film aria-hidden="true" />}
          </span>
          <strong>{task.durationSeconds ? `${task.durationSeconds}s` : task.status}</strong>
          <small>{task.modelId || task.status}</small>
        </button>
      ))}
    </div>
  );
}

function readVideoDraft(actorId?: string): VideoDraft {
  if (!actorId) return EMPTY_DRAFT;
  const value = readActorScopedDraft<Partial<VideoDraft>>({
    actorId,
    feature: VIDEO_DRAFT_FEATURE,
    schemaVersion: VIDEO_DRAFT_VERSION,
    fallback: EMPTY_DRAFT,
    migrate: envelope => [2, 3, 4].includes(envelope.schemaVersion) ? envelope.payload as Partial<VideoDraft> : null
  });
  const restored = { ...EMPTY_DRAFT, ...value };
  const character = characterSummarySchema.safeParse(restored.character);
  const lookSheets = z.array(videoLookDraftSchema).max(12).safeParse(restored.lookSheets ?? (restored.lookSheet ? [restored.lookSheet] : [])).data || [];
  const trustedLooks = z.array(trustedVideoSourceSchema.extend({ characterName: z.string().max(80).optional() })).max(12)
    .safeParse(restored.trustedLooks ?? (restored.trustedLook ? [restored.trustedLook] : [])).data || [];
  return {
    ...restored,
    lookSheets,
    trustedLooks,
    character: character.success ? character.data : null,
    trustedFrame: trustedVideoSourceSchema.safeParse(restored.trustedFrame).data || null,
    trustedLook: trustedLooks[0] || null,
    referenceImageUrl: typeof restored.referenceImageUrl === 'string' && restored.referenceImageUrl.startsWith('/outputs/') ? restored.referenceImageUrl : null,
    lookSheet: lookSheets[0] || null,
    providerModelKey: migrateVideoProviderModelKey(restored.providerModelKey)
  };
}

const videoLookDraftSchema = z.object({
  url: z.string().refine(url => url.startsWith('/outputs/') || url.startsWith('/api/character-profiles/')),
  name: z.string(), characterName: z.string().max(80).optional(), generated: z.boolean().optional(),
  assetId: z.string().optional(), lookId: z.string().optional(), versionId: z.string().optional(),
  characterProfileId: z.string().optional(), characterProfileVersionId: z.string().optional(),
});

function toVideoViewerItem(task: VideoTask): GenerationVideoViewerItem {
  const request = task.submittedRequest;
  return {
    id: task.id,
    videoUrl: task.outputAsset?.publicUrl || '',
    posterUrl: task.outputAsset?.posterUrl,
    status: task.status,
    provider: task.providerId,
    model: task.modelId,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    clipDurationSeconds: task.durationSeconds ?? request?.durationSeconds,
    aspectRatio: task.aspectRatio ?? request?.aspectRatio,
    resolution: task.resolution ?? request?.resolution,
    audioMode: request?.audioMode,
    operation: task.operation ?? request?.operation,
    creditCost: task.estimatedCredits,
    characterProfileId: request?.characterAttributions?.[0]?.characterProfileId || null
  };
}
