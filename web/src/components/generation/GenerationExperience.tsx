import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Coins, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import { getComparison } from '../../features/comparisons/api/comparisonApi';
import { useActor } from '../../lib/auth/ActorProvider';
import { emitTelemetry } from '../../lib/telemetry/telemetry';
import type { JobStatus } from '../../features/generation/schemas/generationSchemas';
import { StudioRecentGenerations } from '../../features/studio/components/StudioRecentGenerations';
import { StudioGenerationWorkspace } from './StudioGenerationWorkspace';
import { GenerationReferenceActions } from './GenerationReferenceActions';

type GenerationExperienceProps = {
  surface: 'playground' | 'studio' | 'fashion';
  generationMode: 'playground' | 'headshot' | 'scene' | 'character-sheet' | 'fashion';
  initialPrompt?: string;
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
  selections?: Record<string, unknown>;
  initialReferences?: Partial<Record<GenerationReferenceRole, string>>;
  references?: Partial<Record<GenerationReferenceRole, string>>;
  onReferencesChange?: (references: Partial<Record<GenerationReferenceRole, string>>) => void;
  characterProfileContext?: Record<string, unknown> | null;
  sceneTemplateSnapshot?: Record<string, unknown> | null;
  authoringMode?: 'guided' | 'manual';
  characterType?: 'reusable_model' | 'styled_character' | null;
  allowComparison?: boolean;
  showPromptEditor?: boolean;
  onCompleted?: (jobId: string) => void;
  blockedReason?: string | null;
  showEngine?: boolean;
  layoutVariant?: 'stacked' | 'studio';
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
  initialReferences = {},
  references: controlledReferences,
  onReferencesChange,
  characterProfileContext = null,
  sceneTemplateSnapshot = null,
  authoringMode = 'manual',
  characterType = null,
  allowComparison = true,
  showPromptEditor = true,
  onCompleted,
  blockedReason = null,
  showEngine = true,
  layoutVariant = 'stacked',
  referenceRoles,
  renderResultActions,
  studioBuilder,
  studioModeSelector,
  studioQueueExtra,
  studioConfigActions
}: GenerationExperienceProps) {
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const { t } = useTranslation('playground');
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [comparisonSetId, setComparisonSetId] = useState<string | null>(null);
  const [debouncedDraft, setDebouncedDraft] = useState<GenerationRequestDraft | null>(null);
  const completedJobRef = useRef<string | null>(null);

  const catalog = useQuery({ queryKey: ['provider-catalog'], queryFn: getProviderCatalog, staleTime: 5 * 60_000 });
  useEffect(() => {
    setJobId(null);
    setComparisonSetId(null);
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
    setComparisonSlots(createDefaultComparisonSlots(catalog.data));
  }, [catalog.data, engine.provider]);

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
    sceneTemplateSnapshot,
    characterProfileContext,
    authoringMode,
    characterType
  }), [authoringMode, characterProfileContext, characterType, engine, generationMode, negativePrompt, prompt, references, sceneTemplateSnapshot, selections, surface]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDraft(draft), 320);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const canEstimate = Boolean(debouncedDraft?.provider && debouncedDraft.submodel && debouncedDraft.prompt.trim());
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
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    onError: error => emitTelemetry('generation_transition', {
      actorId: actor?.userId,
      mode: generationMode,
      surface,
      status: 'enqueue_failed',
      errorCode: 'code' in error ? String(error.code) : null
    })
  });
  const submitCompare = useMutation({
    mutationFn: async () => {
      const estimate = comparisonEstimate.data || await estimateComparison(draft, comparisonSlots);
      return submitComparison(draft, comparisonSlots, estimate);
    },
    onSuccess: response => {
      setJobId(null);
      setComparisonSetId(response.setId);
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        comparisonSetId: response.setId,
        mode: generationMode,
        surface,
        status: response.status
      });
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    onError: error => emitTelemetry('generation_transition', {
      actorId: actor?.userId,
      mode: generationMode,
      surface,
      status: 'comparison_enqueue_failed',
      errorCode: 'code' in error ? String(error.code) : null
    })
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
      const status = query.state.data?.runs.at(-1)?.status;
      return status && ['queued', 'processing', 'streaming'].includes(status) ? 1400 : false;
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

  if (catalog.isLoading) return <LoadingState label={t('playground.engine.loading')} />;
  if (catalog.isError || !catalog.data) return <ErrorState title={t('playground.engine.unavailable')} description={catalog.error?.message} onRetry={() => void catalog.refetch()} />;
  const model = catalog.data.providers.find(item => item.id === engine.provider)?.models.find(item => item.id === engine.model);
  const estimate = comparison ? comparisonEstimate.data?.estimatedTotalCredit : singleEstimate.data?.estimate.estimatedCredits;
  const canAfford = comparison ? true : singleEstimate.data?.account.canAfford !== false;
  const pending = submitSingle.isPending || submitCompare.isPending || Boolean(jobId && !['completed', 'succeeded', 'failed', 'cancelled'].includes(job.data?.status || '')) || Boolean(comparisonSetId && ['queued', 'processing', 'streaming'].includes(comparisonResult.data?.runs.at(-1)?.status || ''));
  const submitError = submitSingle.error || submitCompare.error;
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
        showEmpty={layoutVariant === 'studio'}
        showGoToPrompt={layoutVariant !== 'studio'}
        canRevealPrompt={actor?.role === 'admin'}
        viewerContext={{
          prompt,
          provider: engine.provider,
          model: engine.model,
          estimatedCredit: estimate,
          parentImages: Object.entries(references)
            .filter((entry): entry is [string, string] => Boolean(entry[1]))
            .map(([role, imageUrl]) => ({
              id: role,
              imageUrl
            }))
        }}
      />
    </div>
  );
  const promptRegion = (
    <div ref={node => { promptRef.current = node; }}>
      {showPromptEditor ? (
        <PromptEditor
          value={prompt}
          negativeValue={negativePrompt}
          onChange={setPrompt}
          onNegativeChange={setNegativePrompt}
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
  );
  const referencesRegion = (
    <ReferenceSlotGrid
      value={references}
      roles={referenceRoles}
      supported={model?.capabilities.imageReferences === true}
      maxReferences={model?.capabilities.maxReferenceImages || 0}
      compact={layoutVariant === 'studio'}
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
      studioLayout={layoutVariant === 'studio'}
      allowComparison={allowComparison}
      onChange={setEngine}
      onComparisonChange={setComparison}
      onSlotsChange={setComparisonSlots}
    />
  ) : null;
  const actionRegion = layoutVariant === 'studio' ? (
    <Surface className="studio-generation-action">
      <Button
        className="studio-generate-button btn-neon-yellow-glow"
        size="lg"
        icon={<Sparkles className="size-5" />}
        disabled={!prompt.trim() || pending || (estimate !== undefined && !canAfford) || Boolean(blockedReason)}
        onClick={() => comparison ? submitCompare.mutate() : submitSingle.mutate()}
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
            disabled={!prompt.trim() || pending || (estimate !== undefined && !canAfford) || Boolean(blockedReason)}
            onClick={() => comparison ? submitCompare.mutate() : submitSingle.mutate()}
          >
            {pending ? t('playground.result.generating') : comparison ? t('playground.action.generateComparison') : t('playground.action.generate')}
          </Button>
        </div>
    </Surface>
  );
  const messages = (
    <>
      {submitError ? <p role="alert" className="text-sm text-red-300">{submitError.message}</p> : null}
      {blockedReason ? <p role="alert" className="text-sm text-amber-300">{blockedReason}</p> : null}
      {job.isError ? <p role="alert" className="text-sm text-red-300">{job.error.message}</p> : null}
    </>
  );

  if (layoutVariant === 'studio') {
    const queueRegion = (
      <>
        <Surface className="studio-job-context">
          <header className="studio-job-context__heading">
            <h2>{t('playground.queue.title')}</h2>
            <Link to="/history">{t('playground.queue.viewAll')}</Link>
          </header>
          {jobId ? (
            <div className="studio-job-context__row">
              <span className="is-live" aria-hidden="true" />
              <div>
                <strong>{t('playground.queue.current')}</strong>
                <small>{job.data?.status || t('playground.result.generating')}</small>
              </div>
            </div>
          ) : (
            <p>{t('playground.queue.empty')}</p>
          )}
        </Surface>
        <StudioRecentGenerations limit={6} />
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
