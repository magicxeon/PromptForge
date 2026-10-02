import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Film, Images, Sparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCreditConfirmation } from '../../../components/generation/useCreditConfirmation';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { useTranslation } from 'react-i18next';
import {
  EngineTargetPanel,
  type EngineValue
} from '../../../components/generation/EngineTargetPanel';
import {
  imageModelUnavailableReason,
  filterImageCatalogForSurface,
  resolveAvailableImageEngine
} from '../../../components/generation/engineTargetPanelHelpers';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { useActor } from '../../../lib/auth/ActorProvider';
import { queryKeys } from '../../../lib/api/queryKeys';
import {
  estimateGeneration,
  getProviderCatalog,
  type GenerationReferenceRole,
  type GenerationRequestDraft
} from '../../generation/api/generationApi';
import {
  getCinematicStoryboardGenerationContext,
  submitCinematicStoryboardBatch
} from '../api/cinematicApi';
import type {
  CinematicProject,
  CinematicScene,
  CinematicShot,
  CinematicStoryboardGenerationContext
} from '../schemas/cinematicSchemas';
import {
  readStoryboardEnginePreference,
  writeStoryboardEnginePreference
} from '../state/storyboardEnginePreference';
import { DialogHeader } from './ProjectCostSummary';
import {
  CINEMATIC_NATURAL_CAMERA_PROFILE_ID,
  NaturalCameraRealismControl
} from './NaturalCameraRealismControl';
import { StoryboardVideoCompatibilityNotice } from './StoryboardVideoCompatibilityNotice';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CinematicProject;
  onProjectRefresh?: () => void;
};

type Candidate = {
  scene: CinematicScene;
  shot: CinematicShot;
  context: CinematicStoryboardGenerationContext;
  draft: GenerationRequestDraft;
  blockedReason: string | null;
};

export function StoryboardGenerateAllDialog({ open, onOpenChange, project, onProjectRefresh }: Props) {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [engine, setEngine] = useState<EngineValue>({
    provider: '',
    model: '',
    resolution: null,
    aspectRatio: project.aspectRatio,
    outputCount: 1
  });
  const [idempotencyKey, setIdempotencyKey] = useState(() => createBatchKey(project.id));
  const [naturalRealismEnabled, setNaturalRealismEnabled] = useState(true);
  const [includeApproved, setIncludeApproved] = useState(false);
  const catalog = useQuery({
    queryKey: ['provider-catalog', 'cinematic', 'scene'],
    queryFn: () => getProviderCatalog({
      generationSurface: 'cinematic', generationMode: 'scene'
    }),
    select: data => filterImageCatalogForSurface(data, 'cinematic', 'scene'),
    staleTime: 0
  });
  const scopedShots = useMemo(() => project.scenes.flatMap(scene =>
    scene.shots.filter(shot => includeApproved || !shot.approvedStoryboardSource).map(shot => ({ scene, shot }))
  ), [includeApproved, project.scenes]);
  const approvedCount = project.scenes.reduce(
    (count, scene) => count + scene.shots.filter(shot => Boolean(shot.approvedStoryboardSource)).length,
    0
  );
  const contexts = useQuery({
    queryKey: ['cinematic-storyboard-batch-contexts', actor?.userId || 'loading', project.id, project.version, includeApproved],
    queryFn: () => Promise.all(scopedShots.map(async item => ({
      ...item,
      context: await getCinematicStoryboardGenerationContext(
        project.id,
        item.scene.id,
        item.shot.id
      )
    }))),
    enabled: open && scopedShots.length > 0,
    staleTime: 0,
    retry: false
  });
  const maximumReferenceCount = useMemo(() => (contexts.data || []).reduce(
    (maximum, item) => Math.max(
      maximum,
      Object.values(item.context.references || {}).filter(Boolean).length
        + (item.context.characterProfileContext ? 1 : 0) + (item.context.cinematicCastReferences?.length || 0) + (item.context.cinematicSceneReference ? 1 : 0)
    ),
    0
  ), [contexts.data]);

  useEffect(() => {
    if (!open) return;
    setIdempotencyKey(createBatchKey(project.id));
    setNaturalRealismEnabled(true);
    setIncludeApproved(false);
    setEngine({
      provider: '',
      model: '',
      resolution: null,
      aspectRatio: project.aspectRatio,
      outputCount: 1
    });
  }, [actor?.userId, open, project.aspectRatio, project.id]);

  useEffect(() => {
    if (!open || !catalog.data || engine.provider || (scopedShots.length > 0 && !contexts.data)) return;
    const preference = actor?.userId
      ? readStoryboardEnginePreference(actor.userId)
      : null;
    const resolved = resolveAvailableImageEngine(
      catalog.data,
      preference,
      maximumReferenceCount,
      project.aspectRatio
    );
    const provider = resolved?.provider;
    const model = resolved?.model;
    setEngine(current => ({
      ...current,
      provider: provider?.id || '',
      model: model?.id || '',
      resolution: model?.capabilities.resolutions?.[0] || model?.defaults?.resolution || null,
      aspectRatio: project.aspectRatio,
      outputCount: 1
    }));
  }, [
    actor?.userId,
    catalog.data,
    contexts.data,
    engine.provider,
    maximumReferenceCount,
    open,
    project.aspectRatio,
    scopedShots.length
  ]);

  const selectedModel = catalog.data?.providers.find(item => item.id === engine.provider)
    ?.models.find(item => item.id === engine.model);
  const candidates = useMemo<Candidate[]>(() => (contexts.data || []).map(item => {
    const references = Object.fromEntries(Object.entries(item.context.references || {})
      .filter((entry): entry is [GenerationReferenceRole, string] => Boolean(entry[1])));
    const requiredReferenceCount = Object.values(references).length
      + (item.context.characterProfileContext ? 1 : 0) + (item.context.cinematicCastReferences?.length || 0) + (item.context.cinematicSceneReference ? 1 : 0);
    const modelReason = imageModelUnavailableReason(
      selectedModel,
      requiredReferenceCount,
      project.aspectRatio
    );
    const blockedReason = !item.context.generationEligible
      ? item.context.blockingReason || 'generation_blocked'
      : modelReason;
    return {
      ...item,
      blockedReason,
      draft: {
        provider: engine.provider,
        submodel: engine.model,
        prompt: item.context.keyframeContract.providerIndependentPrompt,
        aspectRatio: project.aspectRatio,
        imageResolution: engine.resolution,
        outputCount: 1,
        generationMode: 'scene',
        generationSurface: 'cinematic',
        cinematicCaptureProfileId: naturalRealismEnabled
          ? CINEMATIC_NATURAL_CAMERA_PROFILE_ID
          : null,
        references,
        characterProfileContext: item.context.characterProfileContext,
        cinematicCastReferences: item.context.cinematicCastReferences,
        cinematicSceneReference: item.context.cinematicSceneReference,
        cinematicContainsPeople: item.context.cinematicContainsPeople,
        cinematicFaceless: item.context.cinematicFaceless === true,
        cinematicFacialTreatment: item.context.cinematicFacialTreatment,
        cinematicManualStoryboard: item.context.cinematicManualStoryboard === true,
        characterReferenceOutfitBehavior: references.outfit_front ? 'replaceable' : 'preserve',
        authoringMode: 'manual'
      }
    };
  }), [contexts.data, engine.model, engine.provider, engine.resolution, naturalRealismEnabled, project, selectedModel]);
  const eligible = candidates.filter(candidate => !candidate.blockedReason);
  const blocked = candidates.filter(candidate => candidate.blockedReason);
  const quotes = useQuery({
    queryKey: [
      'cinematic-storyboard-batch-quotes',
      actor?.userId || 'loading',
      project.id,
      project.version,
      engine.provider,
      engine.model,
      engine.resolution,
      naturalRealismEnabled,
      eligible
    ],
    queryFn: () => Promise.all(eligible.map(async candidate => ({
      candidate,
      quote: await estimateGeneration(candidate.draft)
    }))),
    enabled: open && eligible.length > 0 && Boolean(engine.provider && engine.model),
    staleTime: 15_000,
    retry: false
  });
  const totalCredits = quotes.data?.reduce(
    (total, item) => total + item.quote.estimate.estimatedCredits,
    0
  );
  const [quoteTime, setQuoteTime] = useState(Date.now);
  const refreshQuotes = quotes.refetch;
  const quoteExpiry = quotes.data?.length ? Math.min(...quotes.data.map(item => quoteDeadline(item.quote.estimate.expiresAt))) : 0;
  const quotesCurrent = Number.isFinite(quoteExpiry) && quoteExpiry > Math.max(quoteTime, Date.now());
  useEffect(() => {
    if (!open || !Number.isFinite(quoteExpiry) || quoteExpiry <= Date.now()) return;
    // One timer per quote snapshot, not a second Job polling loop.
    const timer = window.setTimeout(() => { setQuoteTime(Date.now()); void refreshQuotes(); }, quoteExpiry - Date.now());
    return () => window.clearTimeout(timer);
  }, [open, quoteExpiry, refreshQuotes]);
  const availableCredits = quotes.data?.[0]?.quote.account.availableCredits;
  const canAfford = totalCredits !== undefined
    && availableCredits !== undefined
    && availableCredits >= totalCredits;
  const sceneCount = new Set(eligible.map(candidate => candidate.scene.id)).size;
  const submit = useMutation({
    mutationFn: (snapshot: { projectId: string; actorId: string; engine: EngineValue;
      input: Parameters<typeof submitCinematicStoryboardBatch>[1] }) => submitCinematicStoryboardBatch(snapshot.projectId, snapshot.input),
    onSuccess: (result, snapshot) => {
      if (getActiveActorId() !== snapshot.actorId) return;
      if (result.acceptedCount > 0) {
        writeStoryboardEnginePreference(snapshot.actorId, {
          provider: snapshot.engine.provider,
          model: snapshot.engine.model
        });
      }
      onProjectRefresh?.();
      void queryClient.invalidateQueries({ queryKey: queryKeys.generationJobCenter(snapshot.actorId) });
    }
  });
  const ready = Boolean(open && actor?.userId && quotes.isSuccess && quotesCurrent && quotes.data?.length
    && canAfford && !contexts.isFetching && !quotes.isFetching && !contexts.error
    && totalCredits !== undefined && Number.isFinite(totalCredits) && totalCredits >= 0);
  const consent = useCreditConfirmation({
    mandatory: true,
    actorId: actor?.userId || '',
    requestKey: JSON.stringify([project.id, project.version, includeApproved, engine, naturalRealismEnabled,
      eligible, quotes.data?.map(item => item.quote.estimate), idempotencyKey]),
    estimatedCredits: totalCredits,
    description: `${t('cinematic.storyboard.batch.title')} - ${eligible.length} ${t('cinematic.storyboard.batch.shots')} - ${engine.provider} / ${engine.model}`,
    ready
  });
  const submitting = useRef(false);
  async function requestSubmit() {
    if (!ready || submitting.current || submit.isPending || submit.data) return;
    submitting.current = true;
    const snapshot = { projectId: project.id, actorId: actor!.userId, engine, input: {
      expectedVersion: project.version,
      idempotencyKey,
      operations: (quotes.data || []).map(({ candidate, quote }) => ({
        operationId: candidate.shot.id,
        sceneId: candidate.scene.id,
        shotId: candidate.shot.id,
        expectedShotVersion: candidate.shot.version,
        keyframeContractFingerprint: candidate.context.keyframeContract.sourceFingerprint,
        estimateId: quote.estimate.estimateId,
        draft: candidate.draft
      }))
    } };
    try {
      if (!await consent.request() || !consent.isCurrent()) return;
      if (snapshot.input.operations.some(operation => !quotes.data?.some(item => item.quote.estimate.estimateId === operation.estimateId && quoteDeadline(item.quote.estimate.expiresAt) > Date.now()))) {
        await quotes.refetch(); return;
      }
      await submit.mutateAsync(snapshot);
    } catch {
      // Submission errors remain visible in the existing batch status region.
    } finally {
      submitting.current = false;
    }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="cinematic-dialog__overlay" />
      <Dialog.Content className="cinematic-dialog__content cinematic-storyboard-batch-dialog">
        <DialogHeader
          title={t('cinematic.storyboard.batch.title')}
          description={t('cinematic.storyboard.batch.description')}
        />
        {consent.dialog}
        <div className="cinematic-storyboard-batch-dialog__summary">
          <span><Film aria-hidden="true" /><strong>{sceneCount}</strong>{t('cinematic.storyboard.batch.scenes')}</span>
          <span><Images aria-hidden="true" /><strong>{eligible.length}</strong>{t('cinematic.storyboard.batch.shots')}</span>
          <span><CheckCircle2 aria-hidden="true" /><strong>{approvedCount}</strong>{t(includeApproved
            ? 'cinematic.storyboard.batch.approvedIncluded'
            : 'cinematic.storyboard.batch.approvedSkipped')}</span>
        </div>

        {approvedCount > 0 ? <label className="cinematic-check-row">
          <input
            type="checkbox"
            checked={includeApproved}
            disabled={submit.isPending || Boolean(submit.data)}
            onChange={event => setIncludeApproved(event.target.checked)}
          />
          <span>{t('cinematic.storyboard.batch.includeApproved')}</span>
        </label> : null}

        {catalog.data ? <EngineTargetPanel
          catalog={catalog.data}
          value={engine}
          comparison={false}
          comparisonSlots={[]}
          allowComparison={false}
          allowMultiOutput={false}
          fixedAspectRatio={project.aspectRatio}
          requiredReferenceCount={maximumReferenceCount}
          extraControls={<NaturalCameraRealismControl
            enabled={naturalRealismEnabled}
            onChange={setNaturalRealismEnabled}
          />}
          onChange={value => setEngine({ ...value, outputCount: 1 })}
          onComparisonChange={() => undefined}
          onSlotsChange={() => undefined}
        /> : null}
        <StoryboardVideoCompatibilityNotice
          model={selectedModel || null}
          containsCharacter={(contexts.data || []).some(item => item.context.cast.length > 0)}
        />

        {contexts.isFetching || quotes.isFetching ? <div className="cinematic-storyboard-batch-dialog__loading" role="status">
          <ProcessingSpinner className="animate-spin" aria-hidden="true" />
          <span>{contexts.isFetching
            ? t('cinematic.storyboard.batch.checking')
            : t('cinematic.storyboard.batch.quoting')}</span>
        </div> : null}
        {contexts.error || quotes.error ? <StatusNotice tone="error" title={t('cinematic.storyboard.batch.quoteFailed')}>
          {(contexts.error || quotes.error)?.message}
          <Button onClick={() => void (contexts.error ? contexts.refetch() : quotes.refetch())}>{t('cinematic.lookReferences.refresh')}</Button>
        </StatusNotice> : null}
        {quotes.isSuccess && !quotesCurrent && !quotes.isFetching ? <StatusNotice tone="warning" title={t('cinematic.storyboard.batch.quoteExpired')}>
          <Button onClick={() => void quotes.refetch()}>{t('cinematic.lookReferences.refresh')}</Button>
        </StatusNotice> : null}
        {blocked.length ? <section className="cinematic-storyboard-batch-dialog__blocked">
          <strong>{t('cinematic.storyboard.batch.blocked', { count: blocked.length })}</strong>
          <ul>{blocked.map(candidate => <li key={candidate.shot.id}>
            <span>{candidate.scene.title} / {candidate.shot.title}</span>
            <small>{t(`playground:playground.engine.unavailable.${candidate.blockedReason}`, {
              defaultValue: candidate.blockedReason || ''
            })}</small>
          </li>)}</ul>
        </section> : null}
        <section className="cinematic-storyboard-batch-dialog__quote" aria-live="polite">
          <div><span>{t('cinematic.storyboard.batch.queuedJobs')}</span><strong>{eligible.length}</strong></div>
          <div><span>{t('cinematic.storyboard.batch.total')}</span><strong>{totalCredits !== undefined ? `${totalCredits} ${t('cinematic.cost.credits')}` : '-'}</strong></div>
          <div><span>{t('cinematic.storyboard.batch.available')}</span><strong>{availableCredits ?? '-'}</strong></div>
        </section>
        {submit.data ? <StatusNotice tone="success" title={t('cinematic.storyboard.batch.queued')}>
          {t('cinematic.storyboard.batch.queuedDescription', {
            count: submit.data.acceptedCount,
            failed: submit.data.failedCount
          })}
        </StatusNotice> : null}
        {submit.error ? <StatusNotice tone="error" title={t('cinematic.storyboard.batch.submitFailed')}>
          {submit.error.message}
        </StatusNotice> : null}
        <div className="cinematic-dialog__footer">
          <Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close>
          <Button
            variant="primary"
            icon={<Sparkles aria-hidden="true" />}
            disabled={!ready || consent.awaitingConfirmation || submit.isPending || Boolean(submit.data)}
            onClick={() => void requestSubmit()}
          >
            {submit.isPending
              ? t('cinematic.storyboard.batch.submitting')
              : t('cinematic.storyboard.batch.generate')}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function createBatchKey(projectId: string) {
  return `cinematic-storyboard:${projectId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function quoteDeadline(value: string | number) {
  return typeof value === 'number' ? value : Date.parse(value);
}
