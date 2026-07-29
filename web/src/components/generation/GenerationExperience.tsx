import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Coins, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ErrorState, LoadingState } from '../ui/AsyncState';
import { Surface } from '../ui/Surface';
import { PromptEditor } from './PromptEditor';
import { PromptComposerAssist } from './PromptComposerAssist';
import { ReferenceSlotGrid } from './ReferenceSlotGrid';
import {
  EngineTargetPanel,
  type EngineValue
} from './EngineTargetPanel';
import { createDefaultComparisonSlots } from './engineTargetPanelHelpers';
import { GenerationResultSurface } from './GenerationResultSurface';
import {
  estimateComparison,
  estimateGeneration,
  getProviderCatalog,
  submitComparison,
  submitGeneration,
  type ComparisonSlotInput,
  type GenerationReferenceRole,
  type GenerationRequestDraft
} from '../../features/generation/api/generationApi';
import { useGenerationJob } from '../../features/generation/hooks/useGenerationJob';
import {
  getComparison,
  updateComparison
} from '../../features/comparisons/api/comparisonApi';
import {
  comparisonNeedsPolling,
  comparisonRunStatus,
  newestComparisonRun
} from '../../features/comparisons/comparisonRunState';
import { useActor } from '../../lib/auth/ActorProvider';
import { emitTelemetry } from '../../lib/telemetry/telemetry';
import type { JobStatus } from '../../features/generation/schemas/generationSchemas';
import { StudioRecentGenerations } from '../../features/studio/components/StudioRecentGenerations';
import { StudioGenerationWorkspace } from './StudioGenerationWorkspace';
import { PlaygroundGenerationWorkspace } from './PlaygroundGenerationWorkspace';
import { GenerationReferenceActions } from './GenerationReferenceActions';
import type { StudioCustomColors } from '../../features/studio/attributes/customColorModel';
import { PlaygroundRecentGenerations } from '../../features/playground/components/PlaygroundRecentGenerations';
import {
  GenerationQueueStatus,
  type GenerationProcessQueueItem
} from './GenerationQueueStatus';
import {
  readComparisonGenerationPreferences,
  writeComparisonGenerationPreferences
} from '../../features/comparisons/comparisonGenerationPreferences';
import {
  getCreditAccount,
  grantMockCredits
} from '../../features/credits/api/creditApi';
import { CreditExhaustedDialog } from '../../features/credits/components/CreditExhaustedDialog';
import { queryKeys } from '../../lib/api/queryKeys';
import { ApiError } from '../../lib/api/apiError';

type GenerationExperienceProps = {
  surface: 'playground' | 'studio' | 'fashion';
  generationMode: 'playground' | 'headshot' | 'scene' | 'character-sheet' | 'fashion';
  initialPrompt?: string;
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
  selections?: Record<string, unknown>;
  customColors?: StudioCustomColors;
  initialReferences?: Partial<Record<GenerationReferenceRole, string>>;
  references?: Partial<Record<GenerationReferenceRole, string>>;
  onReferencesChange?: (references: Partial<Record<GenerationReferenceRole, string>>) => void;
  characterProfileContext?: Record<string, unknown> | null;
  characterReferenceOutfitBehavior?: 'replaceable' | 'preserve';
  faceReferenceContext?: { authorizationToken: string; expiresAt?: string } | null;
  sceneTemplateSnapshot?: Record<string, unknown> | null;
  authoringMode?: 'guided' | 'manual';
  characterType?: 'reusable_model' | 'styled_character' | null;
  allowComparison?: boolean;
  showPromptEditor?: boolean;
  onCompleted?: (jobId: string) => void;
  blockedReason?: string | null;
  showEngine?: boolean;
  layoutVariant?: 'stacked' | 'studio' | 'playground';
  recentExpanded?: boolean;
  onRecentExpandedChange?: (expanded: boolean) => void;
  referenceRoles?: GenerationReferenceRole[];
  renderResultActions?: (job: JobStatus) => ReactNode;
  studioBuilder?: ReactNode;
  studioModeSelector?: ReactNode;
  studioQueueExtra?: ReactNode;
  studioConfigActions?: ReactNode;
};

export function GenerationExperience({
  surface,
  generationMode,
  initialPrompt = '',
  prompt: controlledPrompt,
  onPromptChange,
  selections,
  customColors,
  initialReferences = {},
  references: controlledReferences,
  onReferencesChange,
  characterProfileContext = null,
  characterReferenceOutfitBehavior = 'preserve',
  faceReferenceContext = null,
  sceneTemplateSnapshot = null,
  authoringMode = 'manual',
  characterType = null,
  allowComparison = true,
  showPromptEditor = true,
  onCompleted,
  blockedReason = null,
  showEngine = true,
  layoutVariant = 'stacked',
  recentExpanded = true,
  onRecentExpandedChange = () => {},
  referenceRoles,
  renderResultActions,
  studioBuilder,
  studioModeSelector,
  studioQueueExtra,
  studioConfigActions
}: GenerationExperienceProps) {
  const queryClient = useQueryClient();
  const { actor, mockSwitcherEnabled } = useActor();
  const { t, i18n } = useTranslation('playground');
  const promptRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const initialPromptRef = useRef(initialPrompt);
  const initialReferencesRef = useRef(initialReferences);
  const [localPrompt, setLocalPrompt] = useState(initialPrompt);
  const prompt = controlledPrompt ?? localPrompt;
  const setPrompt = (value: string) => {
    setLocalPrompt(value);
    onPromptChange?.(value);
  };
  const [negativePrompt, setNegativePrompt] = useState('');
  const [localReferences, setLocalReferences] = useState(initialReferences);
  const references = controlledReferences ?? localReferences;
  const setReferences = (next: Partial<Record<GenerationReferenceRole, string>>) => {
    setLocalReferences(next);
    onReferencesChange?.(next);
  };
  const [engine, setEngine] = useState<EngineValue>({ provider: '', model: '', resolution: null, aspectRatio: '6:8' });
  const [comparison, setComparison] = useState(false);
  const [comparisonSlots, setComparisonSlots] = useState<ComparisonSlotInput[]>([]);
  const [comparisonJobBindings, setComparisonJobBindings] = useState<Array<{
    slotId: string;
    jobId?: string | null;
  }>>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [comparisonSetId, setComparisonSetId] = useState<string | null>(null);
  const [resultFocusSequence, setResultFocusSequence] = useState(0);
  const [debouncedDraft, setDebouncedDraft] = useState<GenerationRequestDraft | null>(null);
  const [comparisonPreferencesActorId, setComparisonPreferencesActorId] = useState<string | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const completedJobRef = useRef<string | null>(null);
  const actorId = actor?.userId || 'loading';

  const catalog = useQuery({ queryKey: ['provider-catalog'], queryFn: getProviderCatalog, staleTime: 5 * 60_000 });
  const creditAccount = useQuery({
    queryKey: queryKeys.credits(actorId),
    queryFn: getCreditAccount,
    enabled: Boolean(actor),
    staleTime: 15_000
  });
  useEffect(() => {
    setJobId(null);
    setComparisonSetId(null);
    setComparison(false);
    setComparisonSlots([]);
    setComparisonPreferencesActorId(null);
    setCreditDialogOpen(false);
    setLocalPrompt(initialPromptRef.current);
    setNegativePrompt('');
    setLocalReferences(initialReferencesRef.current);
    completedJobRef.current = null;
  }, [actor?.userId]);

  useEffect(() => {
    if (!catalog.data || engine.provider) return;
    const provider = catalog.data.providers.find(item => item.id === catalog.data.defaultProvider) || catalog.data.providers[0];
    const model = provider?.models.find(item => item.id === provider.defaultModel) || provider?.models[0];
    setEngine({
      provider: provider?.id || '',
      model: model?.id || '',
      resolution: model?.capabilities.resolutions?.[0] || model?.defaults?.resolution || null,
      aspectRatio: model?.capabilities.aspectRatios.includes('6:8') ? '6:8' : model?.capabilities.aspectRatios[0] || '1:1'
    });
  }, [catalog.data, engine.provider]);

  useEffect(() => {
    if (!actor || !catalog.data || comparisonPreferencesActorId === actor.userId) return;
    const fallbackSlots = createDefaultComparisonSlots(catalog.data);
    const preference = readComparisonGenerationPreferences(
      actor.userId,
      catalog.data,
      fallbackSlots
    );
    setComparison(allowComparison && preference.active);
    setComparisonSlots(preference.slots);
    setComparisonPreferencesActorId(actor.userId);
  }, [actor, allowComparison, catalog.data, comparisonPreferencesActorId]);

  useEffect(() => {
    if (!actor || comparisonPreferencesActorId !== actor.userId || comparisonSlots.length < 2) {
      return;
    }
    writeComparisonGenerationPreferences(actor.userId, {
      active: allowComparison && comparison,
      slots: comparisonSlots
    });
  }, [
    actor,
    allowComparison,
    comparison,
    comparisonPreferencesActorId,
    comparisonSlots
  ]);

  const draft = useMemo<GenerationRequestDraft>(() => ({
    provider: engine.provider,
    submodel: engine.model,
    prompt,
    negativePrompt,
    aspectRatio: engine.aspectRatio,
    imageResolution: engine.resolution,
    outputCount: 1,
    generationMode,
    generationSurface: surface,
    references,
    selections,
    customColors,
    sceneTemplateSnapshot,
    characterProfileContext,
    characterReferenceOutfitBehavior,
    faceReferenceContext,
    authoringMode,
    characterType
  }), [authoringMode, characterProfileContext, characterReferenceOutfitBehavior, characterType, customColors, engine, faceReferenceContext, generationMode, negativePrompt, prompt, references, sceneTemplateSnapshot, selections, surface]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDraft(draft), 320);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const canEstimate = Boolean(debouncedDraft?.provider && debouncedDraft.submodel);
  const estimateKey = debouncedDraft ? createEstimateKey(debouncedDraft) : null;
  const singleEstimate = useQuery({
    queryKey: ['generation-estimate', actor?.userId || 'loading', estimateKey],
    queryFn: () => estimateGeneration(debouncedDraft as GenerationRequestDraft),
    enabled: canEstimate && !comparison,
    staleTime: 20_000,
    retry: false
  });
  const comparisonEstimate = useQuery({
    queryKey: ['comparison-estimate', actor?.userId || 'loading', estimateKey, comparisonSlots],
    queryFn: () => estimateComparison(debouncedDraft as GenerationRequestDraft, comparisonSlots),
    enabled: canEstimate && comparison && comparisonSlots.length >= 2,
    staleTime: 20_000,
    retry: false
  });

  const submitSingle = useMutation({
    mutationFn: async () => {
      const estimate = singleEstimate.data || await estimateGeneration(draft);
      return submitGeneration(draft, estimate.estimate.estimateId);
    },
    onMutate: () => {
      setJobId(null);
      setComparisonSetId(null);
      setComparisonJobBindings([]);
    },
    onSuccess: response => {
      setComparisonSetId(null);
      setJobId(response.jobId);
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        jobId: response.jobId,
        mode: generationMode,
        surface,
        status: response.status
      });
    },
    onError: error => {
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        mode: generationMode,
        surface,
        status: 'enqueue_failed',
        errorCode: 'code' in error ? String(error.code) : null
      });
      if (isInsufficientCreditError(error)) setCreditDialogOpen(true);
    }
  });
  const submitCompare = useMutation({
    mutationFn: async () => {
      const estimate = comparisonEstimate.data || await estimateComparison(draft, comparisonSlots);
      return submitComparison(draft, comparisonSlots, estimate);
    },
    onMutate: () => {
      setJobId(null);
      setComparisonSetId(null);
      setComparisonJobBindings([]);
    },
    onSuccess: response => {
      setJobId(null);
      setComparisonSetId(response.setId);
      setComparisonJobBindings(response.jobs);
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        comparisonSetId: response.setId,
        mode: generationMode,
        surface,
        status: response.status
      });
    },
    onError: error => {
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        mode: generationMode,
        surface,
        status: 'comparison_enqueue_failed',
        errorCode: 'code' in error ? String(error.code) : null
      });
      if (isInsufficientCreditError(error)) setCreditDialogOpen(true);
    }
  });
  const job = useGenerationJob(jobId);
  const comparisonResult = useQuery({
    queryKey: ['comparison', actor?.userId || 'loading', comparisonSetId],
    queryFn: ({ signal }) => {
      if (!comparisonSetId) throw new Error('A comparison set ID is required.');
      return getComparison(comparisonSetId, signal);
    },
    enabled: Boolean(comparisonSetId && actor),
    refetchInterval: query => {
      return comparisonNeedsPolling(comparisonSetId, query.state.data) ? 1400 : false;
    }
  });
  const comparisonRun = newestComparisonRun(comparisonResult.data);
  const derivedComparisonStatus = comparisonRunStatus(comparisonRun);
  const renameComparison = useMutation({
    mutationFn: (name: string) => {
      if (!comparisonSetId) throw new Error('A comparison set ID is required.');
      return updateComparison(comparisonSetId, { name });
    },
    onSuccess: updatedComparison => {
      queryClient.setQueryData(
        ['comparison', actor?.userId || 'loading', comparisonSetId],
        updatedComparison
      );
      void queryClient.invalidateQueries({
        queryKey: ['comparisons', actor?.userId || 'loading']
      });
    }
  });
  const grantCredits = useMutation({
    mutationFn: () => grantMockCredits(100),
    onSuccess: response => {
      queryClient.setQueryData(queryKeys.credits(actorId), response);
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger', actorId] });
      void queryClient.invalidateQueries({ queryKey: ['generation-estimate', actorId] });
      void queryClient.invalidateQueries({ queryKey: ['comparison-estimate', actorId] });
      setCreditDialogOpen(false);
    }
  });
  useEffect(() => {
    const status = job.data?.status;
    const completedJobId = job.data?.jobId || job.data?.id || jobId;
    if (
      status
      && ['completed', 'succeeded'].includes(status)
      && completedJobId
      && completedJobRef.current !== completedJobId
    ) {
      completedJobRef.current = completedJobId;
      onCompleted?.(completedJobId);
      void queryClient.invalidateQueries({ queryKey: ['history'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    }
  }, [job.data?.id, job.data?.jobId, job.data?.status, jobId, onCompleted, queryClient]);
  useEffect(() => {
    if (!jobId || !job.data?.status) return;
    emitTelemetry('generation_transition', {
      actorId: actor?.userId,
      jobId,
      mode: generationMode,
      surface,
      status: job.data.status
    });
  }, [actor?.userId, generationMode, job.data?.status, jobId, surface]);
  useEffect(() => {
    if (
      !comparisonSetId
      || !derivedComparisonStatus
      || !['completed', 'partially_completed', 'failed', 'cancelled']
        .includes(derivedComparisonStatus)
    ) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['history'] });
    void queryClient.invalidateQueries({ queryKey: ['credits'] });
  }, [comparisonSetId, derivedComparisonStatus, queryClient]);

  if (catalog.isLoading) return <LoadingState label={t('playground.engine.loading')} />;
  if (catalog.isError || !catalog.data) return <ErrorState title={t('playground.engine.unavailable')} description={catalog.error?.message} onRetry={() => void catalog.refetch()} />;
  const model = catalog.data.providers.find(item => item.id === engine.provider)?.models.find(item => item.id === engine.model);
  const estimate = comparison ? comparisonEstimate.data?.estimatedTotalCredit : singleEstimate.data?.estimate.estimatedCredits;
  const availableCredits = comparison
    ? creditAccount.data?.account.availableCredits
    : singleEstimate.data?.account.availableCredits
      ?? creditAccount.data?.account.availableCredits;
  const canAfford = estimate === undefined
    || availableCredits === undefined
    || availableCredits >= estimate;
  const pending = submitSingle.isPending
    || submitCompare.isPending
    || Boolean(jobId && !['completed', 'succeeded', 'failed', 'cancelled']
      .includes(job.data?.status || ''))
    || comparisonNeedsPolling(comparisonSetId, comparisonResult.data);
  const submitError = submitSingle.error || submitCompare.error;
  const comparisonQueueItems: GenerationProcessQueueItem[] = comparison
    && (
      Boolean(comparisonSetId)
      || Boolean(comparisonRun)
    )
    ? comparisonSlots.map(slot => {
        const persistedSlot = comparisonRun?.slots.find(item => item.id === slot.id);
        const binding = comparisonJobBindings.find(item => item.slotId === slot.id);
        const provider = catalog.data.providers.find(item => item.id === slot.provider);
        const providerModel = provider?.models.find(item => item.id === slot.model);
        return {
          slotId: slot.id,
          providerLabel: localizedLabel(provider?.displayName, i18n.resolvedLanguage)
            || slot.provider,
          modelLabel: localizedLabel(providerModel?.displayName, i18n.resolvedLanguage)
            || slot.model,
          jobId: persistedSlot?.jobId || binding?.jobId || null,
          status: persistedSlot?.status
            || 'queued'
        };
      })
    : [];
  const effectiveResultActions = (completedJob: JobStatus) => (
    <>
      {model?.capabilities.imageReferences && completedJob.result?.imageUrl ? (
        <GenerationReferenceActions
          imageUrl={completedJob.result.imageUrl}
          roles={referenceRoles}
          value={references}
          maxReferences={model.capabilities.maxReferenceImages}
          onChange={setReferences}
        />
      ) : null}
      {renderResultActions?.(completedJob)}
    </>
  );

  const resultRegion = (
    <div ref={node => { resultRef.current = node; }}>
      <GenerationResultSurface
        job={job.data}
        comparison={comparisonResult.data}
        pending={pending}
        onGoToPrompt={() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        renderActions={effectiveResultActions}
        showEmpty={layoutVariant === 'studio' || layoutVariant === 'playground'}
        showGoToPrompt={layoutVariant !== 'studio'}
        comparisonActive={comparison}
        canRevealPrompt={actor?.role === 'admin'}
        onRenameComparison={comparisonSetId
          && ['completed', 'partially_completed'].includes(derivedComparisonStatus || '')
          ? name => renameComparison.mutateAsync(name)
          : undefined}
        comparisonRenamePending={renameComparison.isPending}
        comparisonRenameError={renameComparison.error?.message || null}
        viewerContext={{
          prompt,
          provider: engine.provider,
          model: engine.model,
          estimatedCredit: estimate,
          parentImages: Object.entries(references)
            .filter((entry): entry is [string, string] => Boolean(entry[1]))
            .map(([role, imageUrl]) => {
              const jobId = referenceJobId(imageUrl);
              return {
                id: jobId || role,
                imageUrl,
                role: lineageRole(role),
                href: jobId ? `/history/${encodeURIComponent(jobId)}` : null
              };
            })
        }}
      />
    </div>
  );
  const hasVisiblePromptRegion = showPromptEditor
    || (layoutVariant === 'studio' && actor?.role === 'admin');
  const promptRegion = hasVisiblePromptRegion ? (
    <div ref={node => { promptRef.current = node; }}>
      {showPromptEditor ? (
        <PromptEditor
          value={prompt}
          negativeValue={negativePrompt}
          onChange={setPrompt}
          onNegativeChange={setNegativePrompt}
          variant={layoutVariant === 'playground' ? 'playground' : 'default'}
        />
      ) : layoutVariant === 'studio' && actor?.role === 'admin' ? (
        <Surface className="studio-prompt-preview">
          <label>
            <span>{t('playground.prompt.label')}</span>
            <textarea readOnly value={prompt} />
          </label>
          <details>
            <summary>{t('playground.negative.label')}</summary>
            <textarea
              value={negativePrompt}
              onChange={event => setNegativePrompt(event.target.value)}
              placeholder={t('playground.negative.placeholder')}
            />
          </details>
        </Surface>
      ) : null}
    </div>
  ) : null;
  const referencesRegion = (
    <ReferenceSlotGrid
      value={references}
      roles={referenceRoles}
      supported={model?.capabilities.imageReferences === true}
      maxReferences={model?.capabilities.maxReferenceImages || 0}
      compact={layoutVariant === 'studio' || layoutVariant === 'playground'}
      onChange={setReferences}
    />
  );
  const engineRegion = showEngine ? (
    <EngineTargetPanel
      catalog={catalog.data}
      value={engine}
      comparison={comparison}
      comparisonSlots={comparisonSlots}
      comparisonEstimates={comparisonEstimate.data?.slots}
      comparisonEstimating={comparisonEstimate.isFetching}
      comparisonEstimateError={comparisonEstimate.error?.message || null}
      studioLayout={layoutVariant === 'studio' || layoutVariant === 'playground'}
      allowComparison={allowComparison}
      onChange={setEngine}
      onComparisonChange={setComparison}
      onSlotsChange={setComparisonSlots}
    />
  ) : null;
  const submitGenerationRequest = () => {
    if (estimate !== undefined && !canAfford) {
      setCreditDialogOpen(true);
      return;
    }
    if (layoutVariant === 'studio') {
      setResultFocusSequence(current => current + 1);
    } else {
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (comparison) {
      submitCompare.mutate();
      return;
    }
    submitSingle.mutate();
  };
  const usesStudioCommandPresentation = layoutVariant === 'studio'
    || layoutVariant === 'playground';
  const actionRegion = usesStudioCommandPresentation ? (
    <Surface className="studio-generation-action">
      <Button
        className="studio-generate-button btn-neon-yellow-glow"
        size="lg"
        icon={<Sparkles className="size-5" />}
        disabled={!prompt.trim() || pending || Boolean(blockedReason)}
        onClick={submitGenerationRequest}
      >
        <span>{pending
          ? t('playground.result.generating')
          : t('playground.action.generate')}</span>
        <small>
          {comparison
            ? t('playground.estimate.comparisonDetail')
            : estimate !== undefined
              ? `${estimate} ${t('playground.comparison.credits')}`
              : singleEstimate.isError || comparisonEstimate.isError
                ? t('playground.estimate.unavailable')
                : t('playground.estimate.pending')}
        </small>
      </Button>
    </Surface>
  ) : (
    <Surface className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-4 border-cyan-400/35 bg-[#0e1320f2] p-4 shadow-[var(--mpf-shadow-raised)] backdrop-blur">
        <div className="flex items-center gap-3">
          <Coins className="size-6 text-amber-300" />
          <span><strong className="block">{singleEstimate.isFetching || comparisonEstimate.isFetching ? t('playground.estimate.loading') : estimate !== undefined ? `${estimate} ${t('playground.comparison.credits')}` : t('playground.estimate.pending')}</strong><small className="text-[var(--mpf-text-muted)]">{canAfford ? t('playground.estimate.locked') : t('playground.estimate.insufficient')}</small></span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<ArrowUp className="size-4" />} onClick={() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{t('playground.action.goToPrompt')}</Button>
          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles className="size-5" />}
            disabled={!prompt.trim() || pending || Boolean(blockedReason)}
            onClick={submitGenerationRequest}
          >
            {pending ? t('playground.result.generating') : comparison ? t('playground.action.generateComparison') : t('playground.action.generate')}
          </Button>
        </div>
    </Surface>
  );
  const messages = (
    <>
      <CreditExhaustedDialog
        open={creditDialogOpen}
        requiredCredits={estimate}
        availableCredits={availableCredits}
        canGrantMockCredits={Boolean(actor?.isMockActor || mockSwitcherEnabled)}
        grantPending={grantCredits.isPending}
        grantError={grantCredits.error?.message || null}
        onOpenChange={setCreditDialogOpen}
        onGrantMockCredits={() => grantCredits.mutate()}
      />
      {submitError && !isInsufficientCreditError(submitError)
        ? <p role="alert" className="text-sm text-red-300">{submitError.message}</p>
        : null}
      {blockedReason ? <p role="alert" className="text-sm text-amber-300">{blockedReason}</p> : null}
      {job.isError ? <p role="alert" className="text-sm text-red-300">{job.error.message}</p> : null}
    </>
  );
  const queueStatusRegion = (
    <GenerationQueueStatus
      jobId={jobId}
      jobStatus={job.data?.status}
      comparisonSetId={comparisonSetId}
      comparisonStatus={derivedComparisonStatus
        || (comparisonSetId ? 'queued' : null)}
      comparisonItems={comparisonQueueItems}
      submitting={Boolean(jobId || comparisonSetId)
        && (submitSingle.isPending || submitCompare.isPending)}
    />
  );

  if (layoutVariant === 'studio') {
    const queueRegion = (
      <>
        {queueStatusRegion}
        <StudioRecentGenerations limit={12} />
        {studioQueueExtra}
      </>
    );
    return (
      <StudioGenerationWorkspace
        modeSelector={studioModeSelector}
        builder={studioBuilder}
        result={resultRegion}
        queue={queueRegion}
        engine={engineRegion}
        references={referencesRegion}
        prompt={promptRegion}
        configActions={studioConfigActions}
        actions={actionRegion}
        messages={messages}
        focusResultSignal={resultFocusSequence}
        showRenderPromptHeading={Boolean(promptRegion && prompt.trim())}
        comparisonActive={comparison}
      />
    );
  }

  if (layoutVariant === 'playground') {
    return (
      <PlaygroundGenerationWorkspace
        prompt={promptRegion}
        result={resultRegion}
        queue={queueStatusRegion}
        recent={<PlaygroundRecentGenerations />}
        engine={engineRegion}
        references={referencesRegion}
        actions={actionRegion}
        messages={messages}
        showRenderPromptHeading={Boolean(promptRegion && prompt.trim())}
        recentExpanded={recentExpanded}
        onRecentExpandedChange={onRecentExpandedChange}
        comparisonActive={comparison}
      />
    );
  }

  return (
    <div className="space-y-5">
      {resultRegion}
      {promptRegion}
      {surface === 'playground' && showPromptEditor ? <PromptComposerAssist onAccept={setPrompt} /> : null}
      {referencesRegion}
      {engineRegion}
      {actionRegion}
      {messages}
    </div>
  );
}

function localizedLabel(
  value: string | Record<string, string> | undefined,
  language = 'en'
) {
  if (typeof value === 'string') return value;
  return value?.[language] || value?.en || Object.values(value || {})[0] || '';
}

function createEstimateKey(draft: GenerationRequestDraft) {
  return {
    provider: draft.provider,
    submodel: draft.submodel,
    prompt: draft.prompt,
    negativePrompt: draft.negativePrompt,
    aspectRatio: draft.aspectRatio,
    imageResolution: draft.imageResolution,
    outputCount: draft.outputCount,
    generationMode: draft.generationMode,
    authoringMode: draft.authoringMode,
    characterType: draft.characterType,
    referenceRoles: Object.entries(draft.references || {})
      .filter(([, value]) => Boolean(value))
      .map(([role]) => role)
      .sort()
  };
}

function referenceJobId(value: string) {
  return value.match(/\/outputs\/(job_[a-zA-Z0-9_-]+)\.[a-zA-Z0-9]+/)?.[1] || null;
}

function lineageRole(role: string): 'face' | 'character' | 'style' | 'outfit' | undefined {
  if (role === 'face_reference') return 'face';
  if (role === 'character_reference') return 'character';
  if (role === 'style_reference' || role === 'pose_reference') return 'style';
  if (role === 'outfit_front' || role === 'outfit_back') return 'outfit';
  return undefined;
}

function isInsufficientCreditError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'credit_insufficient';
}
