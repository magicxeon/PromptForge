import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowUp, CheckCircle2, Eye, Film, Images, Maximize2, Sparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useCreditConfirmation } from '../../../components/generation/useCreditConfirmation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { EngineTargetPanelFrame } from '../../../components/generation/EngineTargetPanelFrame';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { GenerationReferenceDisclosure } from '../../../components/generation/GenerationReferenceDisclosure';
import { PlaygroundGenerationWorkspace, type PlaygroundRenderAttempt } from '../../../components/generation/PlaygroundGenerationWorkspace';
import { PromptEditor } from '../../../components/generation/PromptEditor';
import { VideoEngineTargetPanel } from '../../../components/generation/VideoEngineTargetPanel';
import {
  GenerationVideoViewer,
  type GenerationVideoViewerItem
} from '../../../components/media/GenerationVideoViewer';
import { VideoMediaPlayer } from '../../../components/media/VideoMediaPlayer';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { queryKeys } from '../../../lib/api/queryKeys';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { characterSummarySchema, type CharacterSummary } from '../../profiles/schemas/profileSchemas';
import { VideoLookSheetSources } from './VideoLookSheetSources';
import { trustedVideoSourceSchema, type TrustedVideoSource } from '../api/trustedVideoSources';
import { buildVideoReferenceSelection, selectedLooks, usesUploadedCompositionReferences, type NamedTrustedVideoSource, type VideoLookSheet } from './videoReferenceSelection';
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
const VIDEO_DRAFT_VERSION = 6;
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);

type VideoDraft = {
  imageReferences?: Array<{ url: string; characterName?: string }>;
  trustedImages?: NamedTrustedVideoSource[];
  lookSheets?: VideoLookSheet[];
  trustedLooks?: NamedTrustedVideoSource[];
  prompt: string;
  operation: 'text_to_video' | 'image_to_video' | 'character_to_video';
  providerModelKey: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: string;
  audioPreference?: 'none' | 'generated';
  comparisonActive: boolean;
  referenceImageUrl: string | null;
  character: CharacterSummary | null;
  lookSheet: VideoLookSheet | null;
  trustedFrame: TrustedVideoSource | null;
  trustedLook: TrustedVideoSource | null;
  activeTaskId: string | null;
  dismissedReferenceIssueTaskId?: string | null;
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
  dismissedReferenceIssueTaskId: null,
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
  const resultRef = useRef<HTMLElement>(null);
  const cancelResultFocusRef = useRef<(() => void) | null>(null);
  const completedTaskRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<VideoDraft>(() => readVideoDraft(actor?.userId));
  const [taskId, setTaskId] = useState<string | null>(draft.activeTaskId);
  const [submittedRenderAttempt, setSubmittedRenderAttempt] = useState<PlaygroundRenderAttempt | null>(null);
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
    audioMode: (selectedModel.audioModes.includes(draft.audioPreference || 'generated')
      ? draft.audioPreference || 'generated' : selectedModel.audioModes[0] || 'none') as 'none' | 'generated',
    references: referencePlan.references,
    referencePlanVersion: draft.operation === 'text_to_video' ? undefined : trustedOnly && !usesUploadedCompositionReferences(draft, selectedModel) ? 'playground-trusted-v1' : 'playground-reference-v1',
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
    onMutate: () => {
      setSubmittedRenderAttempt(current => ({ sequence: (current?.sequence || 0) + 1, pending: true, renderKey: null }));
    },
    onSuccess: submitted => {
      setSubmittedRenderAttempt(current => current && ({ ...current, pending: false, renderKey: `video:${submitted.id}` }));
      submissionKeyRef.current = null;
      setTaskId(submitted.id);
      setDraft(current => ({ ...current, activeTaskId: submitted.id, dismissedReferenceIssueTaskId: null }));
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      void queryClient.invalidateQueries({ queryKey: ['video-tasks', actor?.userId] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.generationJobCenter(actor?.userId || 'loading') });
    },
    onError: () => {
      setSubmittedRenderAttempt(current => current && ({ ...current, pending: false, renderKey: null }));
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
      audioMode: selectedModel.audioModes.includes(current.audioPreference || 'generated')
        ? current.audioPreference || 'generated'
        : (selectedModel.audioModes[0] ?? 'none')
    }));
  }, [selectedModel]);

  const activeTask = task.data || submit.data;
  const referenceIssue = activeTask?.id !== draft.dismissedReferenceIssueTaskId
    && activeTask?.providerError?.code === 'video_provider_input_image_rejected'
    && activeTask.providerError.referenceIssue
    && activeTask.providerError.referenceIssue.referenceIndex < referencePlan.references.length
    ? activeTask.providerError.referenceIssue
    : null;
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
  const creditConsent = useCreditConfirmation({ actorId: actor?.userId || '',
    requestKey: JSON.stringify([generationInput, quote.data?.estimate.estimateId, quote.data?.requestFingerprint]),
    estimatedCredits: quote.data?.estimate.billingStatus === 'qualification_no_charge' ? 0 : quote.data?.estimate.estimatedCredits,
    description: [selectedModel?.displayName, `${draft.durationSeconds}s`, draft.resolution].filter(Boolean).join(' / '),
    ready: generationReady });
  const loading = submit.isPending || Boolean(activeTask && !TERMINAL.has(activeTask.status));
  const providerErrorMessage = activeTask?.providerError?.code === 'ModelNotOpen'
    ? t('playground.video.providerError.modelNotOpen')
    : referenceIssue?.reason === 'possible_real_person'
      ? t('playground.video.providerError.possibleRealPerson', { number: referenceIssue.referenceIndex + 1 })
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
            icon={<ArrowUp className="size-4" />}
            onClick={() => focusWorkspaceRegion(resultRef.current?.closest('.playground-workspace')
              ?.querySelector<HTMLElement>('.playground-workspace__tools-frame') || null)}
          >
            {t('playground.options.returnToSettings')}
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
    <div>
      <PromptEditor
        variant="playground"
        value={draft.prompt}
        negativeValue=""
        onChange={prompt => setDraft(current => ({ ...current, prompt }))}
        onNegativeChange={() => {}}
        primaryLabel={t('playground.video.promptTitle')}
        primaryDescription={t('playground.video.promptDescription')}
        primaryPlaceholder={t('playground.video.promptPlaceholder')}
        primaryMaxLength={capabilities.data?.promptMaximumCharacters ?? 8000}
        showNegative={false}
        inputId="playground-video-prompt"
      />
    </div>
  );

  const referenceRegion = (
    <GenerationReferenceDisclosure
      count={referencePlan.references.length}
      limit={Math.min(12, selectedModel?.supportsOrderedImageReferences
        ? selectedModel.referenceImageLimit : Math.min(1, selectedModel?.referenceImageLimit || 0))}
      leadingContent={(
        <label className="playground-video-source-options grid min-w-0 gap-1 text-sm">
          <span>{t('playground.video.sourceTitle')}</span>
          <select className="w-full min-w-0" value={draft.operation}
            onChange={event => {
              const operation = event.target.value as VideoDraft['operation'];
              setDraft(current => ({ ...current, operation,
                dismissedReferenceIssueTaskId: current.operation !== operation
                  ? activeTask?.id || current.dismissedReferenceIssueTaskId : current.dismissedReferenceIssueTaskId }));
            }}>
            {(['text_to_video', 'image_to_video', 'character_to_video'] as const).map(operation => (
              <option key={operation} value={operation}>{t(`playground.video.operation.${operation}`)}</option>
            ))}
          </select>
        </label>
      )}
      focusTargetSelector={referenceIssue ? '.is-provider-rejected' : undefined}
      problem={referenceIssue ? <>{t('playground.video.references.imageNumber', { number: referenceIssue.referenceIndex + 1 })}: {t(referenceIssue.reason === 'possible_real_person'
        ? 'playground.video.references.providerRejectedInline' : 'playground.options.referenceRejected')}</>
        : referencePlan.reason ? t(referencePlan.reason) : undefined}
      summary={(
        <div className="playground-video-reference-summary">
        {referencePlan.references.length ? (
          <ul className="playground-video-reference-summary__list">
            {referencePlan.references.slice(0, 2).map((reference, index) => (
              <li key={`${reference.purpose}:${index}`} className={referenceIssue?.referenceIndex === index ? 'is-rejected' : undefined}>
                <VideoReferenceThumbnail url={reference.referenceImageUrl || [draft.trustedFrame, draft.trustedLook,
                  ...(draft.trustedImages || []), ...(draft.trustedLooks || [])]
                  .find(source => source && source.id === reference.generationId)?.previewUrl} />
                <div>
                  <span>{t('playground.video.references.imageNumber', { number: index + 1 })}</span>
                  <strong>{t(reference.role === 'first_frame'
                  ? 'playground.video.references.frame'
                  : `playground.video.references.purpose.${reference.purpose}`)}</strong>
                  {reference.characterName ? <span>{reference.characterName}</span> : null}
                  {referenceIssue?.referenceIndex === index ? <small role="status">{t('playground.options.referenceRejected')}</small> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {referencePlan.references.length > 2 ? <span>{t('playground.options.moreReferences', {
          count: referencePlan.references.length - 2,
        })}</span> : null}
        </div>
      )}
    >
      {draft.operation !== 'text_to_video' ? <VideoLookSheetSources key={`${draft.operation}:${draft.providerModelKey}`}
        model={selectedModel} value={draft} referenceIssue={referenceIssue}
        onChange={patch => {
          setDraft(current => ({ ...current, ...patch,
            ...(activeTask?.id && referenceIssue ? { dismissedReferenceIssueTaskId: activeTask.id } : {}) }));
        }} onBusy={setUploading} /> : null}
    </GenerationReferenceDisclosure>
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
        inlineModelAction
          models={models}
          catalogModels={models}
          selectedModel={selectedModel}
          aspectRatio={draft.aspectRatio}
          resolution={draft.resolution}
          durationSeconds={draft.durationSeconds}
          audioMode={draft.audioMode}
          comparisonEnabled={comparisonEnabled}
          comparisonActive={draft.comparisonActive}
          showComparisonAction={comparisonEnabled}
          showQuote={false}
          compactNotices
          quoteLoading={quote.isFetching}
          estimatedCredits={quote.data?.estimate.estimatedCredits}
          maximumCreditEstimate={quote.data?.estimate.chargeMode === 'actual_usage'}
          canAfford={quote.data?.account.canAfford}
          quoteError={quote.error?.message}
          onModelChange={providerModelKey => setDraft(current => ({ ...current, providerModelKey,
            dismissedReferenceIssueTaskId: current.providerModelKey !== providerModelKey
              ? activeTask?.id || current.dismissedReferenceIssueTaskId : current.dismissedReferenceIssueTaskId }))}
          onAspectRatioChange={aspectRatio => setDraft(current => ({ ...current, aspectRatio }))}
          onResolutionChange={resolution => setDraft(current => ({ ...current, resolution }))}
          onDurationChange={durationSeconds => setDraft(current => ({ ...current, durationSeconds }))}
          onAudioModeChange={audioMode => setDraft(current => ({ ...current, audioMode, audioPreference: audioMode === 'none' ? 'none' : 'generated' }))}
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

  const quoteExpired = Boolean(quote.data && new Date(quote.data.estimate.expiresAt).getTime() <= Date.now());
  const healthyQuote = Boolean(quote.data && !quote.isFetching && !quote.error && !quoteExpired && quote.data.account.canAfford !== false);
  const quoteLabel = quote.data?.estimate.chargeMode === 'actual_usage'
    ? t('playground.options.maximumCredits', { count: quote.data.estimate.estimatedCredits })
    : `${quote.data?.estimate.estimatedCredits} ${t('playground.comparison.credits')}`;
  const actionRegion = (
    <Surface className="studio-generation-action">
      {!healthyQuote ? <div className="engine-target-panel__video-quote" aria-live="polite" aria-busy={quote.isFetching}>
        <span>{t('playground.video.creditEstimate')}</span>
        <strong>{quote.isFetching ? <><ProcessingSpinner className="size-4" />{t('playground.estimate.loading')}</>
          : quote.data?.estimate.estimatedCredits !== undefined ? quote.data.estimate.chargeMode === 'actual_usage'
            ? t('playground.options.maximumCredits', { count: quote.data.estimate.estimatedCredits })
            : `${quote.data.estimate.estimatedCredits} ${t('playground.comparison.credits')}` : '-'}</strong>
        {quote.data?.account.canAfford === false ? <small>{t('playground.estimate.insufficient')}</small> : null}
        {quoteExpired ? <small role="status">{t('playground.options.quoteExpired')}</small> : null}
        {quote.error ? <small role="alert">{quote.error.message}</small> : null}
      </div> : null}
      <div className="playground-generate-controls">
      <Button
        className="studio-generate-button btn-neon-yellow-glow"
        size="lg"
        icon={<Sparkles className="size-5" />}
        disabled={!generationReady || creditConsent.awaitingConfirmation}
        onClick={async () => {
          if (!generationReady || !generationInput || !quote.data || submittingRef.current) return;
          if (new Date(quote.data.estimate.expiresAt).getTime() <= Date.now()) { void quote.refetch(); return; }
          submittingRef.current = true;
          if (!await creditConsent.request() || !creditConsent.isCurrent()) { submittingRef.current = false; return; }
          if (new Date(quote.data.estimate.expiresAt).getTime() <= Date.now()) { submittingRef.current = false; void quote.refetch(); return; }
          const signature = JSON.stringify(generationInput);
          if (submissionKeyRef.current?.signature !== signature) submissionKeyRef.current = { signature, key: `playground-video:${crypto.randomUUID()}` };
          submit.mutate({ ...generationInput, estimateId: quote.data.estimate.estimateId,
            requestFingerprint: quote.data.requestFingerprint, idempotencyKey: submissionKeyRef.current.key });
          focusWorkspaceRegion(resultRef.current);
        }}
      >
        <span>{submit.isPending ? t('playground.video.submitting') : t('playground.video.generate')}</span>
        <small>{healthyQuote ? quoteLabel : readiness.reason === 'source_required' && referencePlan.reason
          ? t(referencePlan.reason) : t(`playground.video.readiness.${readiness.reason || 'ready'}`)}</small>
      </Button>
      <Button type="button" variant="ghost" size="icon" icon={<Eye className="size-5" />}
        disabled={!activeTask && !loading && !errorMessage}
        title={t('playground.options.viewResult')} aria-label={t('playground.options.viewResult')}
        onClick={() => focusWorkspaceRegion(resultRef.current)} />
      </div>
      {healthyQuote && !readiness.ready ? <small role="status">{readiness.reason === 'source_required' && referencePlan.reason
        ? t(referencePlan.reason) : t(`playground.video.readiness.${readiness.reason || 'ready'}`)}</small> : null}
    </Surface>
  );

  return (
    <>
      {creditConsent.dialog}
      <PlaygroundGenerationWorkspace
        composer
        completedResultKey={activeTask?.status === 'completed' && activeTask.outputAsset?.publicUrl ? `video:${activeTask.id}` : null}
        activeRenderKey={activeTask?.id === taskId && !TERMINAL.has(activeTask.status) ? `video:${activeTask.id}` : null}
        submittedRenderAttempt={submittedRenderAttempt}
        renderBusy={loading}
        showResult={Boolean(activeTask || loading || errorMessage)}
        modelSummary={[selectedModel?.displayName, draft.aspectRatio, `${draft.durationSeconds}s`].filter(Boolean).join(' · ')}
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
        references={referenceRegion}
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

  function focusWorkspaceRegion(region: HTMLElement | null) {
    cancelResultFocusRef.current?.();
    cancelResultFocusRef.current = focusResultRegionAfterLayout(region);
  }
}

function VideoReferenceThumbnail({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const src = apiMediaUrl(url);
  return <span className="playground-video-reference-summary__thumbnail" aria-hidden="true">
    {src && !failed ? new URL(src, window.location.origin).pathname.startsWith('/api/')
      ? <AuthenticatedMediaImage src={url} alt="" fallback={<Images />} onError={() => setFailed(true)} />
      : <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <Images />}
  </span>;
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
    migrate: envelope => [2, 3, 4, 5].includes(envelope.schemaVersion) ? envelope.payload as Partial<VideoDraft> : null
  });
  const restored = { ...EMPTY_DRAFT, ...value };
  restored.audioPreference = value.audioPreference === 'none' || value.audioPreference === 'generated'
    ? value.audioPreference : undefined;
  const imageReferences = z.array(z.object({ url: z.string().startsWith('/outputs/'), characterName: z.string().max(80).optional() })).max(12)
    .safeParse(restored.imageReferences ?? (restored.referenceImageUrl ? [{ url: restored.referenceImageUrl }] : [])).data || [];
  const trustedImages = z.array(trustedVideoSourceSchema.extend({ characterName: z.string().max(80).optional() })).max(12)
    .safeParse(restored.trustedImages ?? (restored.trustedFrame ? [restored.trustedFrame] : [])).data || [];
  const character = characterSummarySchema.safeParse(restored.character);
  const lookSheets = z.array(videoLookDraftSchema).max(12).safeParse(restored.lookSheets ?? (restored.lookSheet ? [restored.lookSheet] : [])).data || [];
  const trustedLooks = z.array(trustedVideoSourceSchema.extend({ characterName: z.string().max(80).optional() })).max(12)
    .safeParse(restored.trustedLooks ?? (restored.trustedLook ? [restored.trustedLook] : [])).data || [];
  return {
    ...restored,
    imageReferences,
    trustedImages,
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
