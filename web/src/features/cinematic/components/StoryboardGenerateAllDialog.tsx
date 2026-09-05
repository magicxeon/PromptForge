import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Film, Images, LoaderCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
    queryKey: ['provider-catalog'],
    queryFn: getProviderCatalog,
    select: data => filterImageCatalogForSurface(data, 'cinematic', 'scene'),
    staleTime: 5 * 60_000
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
        + (item.context.characterProfileContext ? 1 : 0)
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
      + (item.context.characterProfileContext ? 1 : 0);
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
      eligible.map(candidate => `${candidate.shot.id}:${candidate.shot.version}`).join('|')
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
  const availableCredits = quotes.data?.[0]?.quote.account.availableCredits;
  const canAfford = totalCredits !== undefined
    && availableCredits !== undefined
    && availableCredits >= totalCredits;
  const sceneCount = new Set(eligible.map(candidate => candidate.scene.id)).size;
  const submit = useMutation({
    mutationFn: () => submitCinematicStoryboardBatch(project.id, {
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
    }),
    onSuccess: result => {
      if (actor?.userId && result.acceptedCount > 0) {
        writeStoryboardEnginePreference(actor.userId, {
          provider: engine.provider,
          model: engine.model
        });
      }
      onProjectRefresh?.();
      if (actor?.userId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.generationJobCenter(actor.userId)
        });
      }
    }
  });

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="cinematic-dialog__overlay" />
      <Dialog.Content className="cinematic-dialog__content cinematic-storyboard-batch-dialog">
        <DialogHeader
          title={t('cinematic.storyboard.batch.title')}
          description={t('cinematic.storyboard.batch.description')}
        />
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
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          <span>{contexts.isFetching
            ? t('cinematic.storyboard.batch.checking')
            : t('cinematic.storyboard.batch.quoting')}</span>
        </div> : null}
        {contexts.error || quotes.error ? <StatusNotice tone="error" title={t('cinematic.storyboard.batch.quoteFailed')}>
          {(contexts.error || quotes.error)?.message}
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
            disabled={!quotes.data?.length || !canAfford || contexts.isFetching || quotes.isFetching
              || Boolean(contexts.error || quotes.error) || submit.isPending || Boolean(submit.data)}
            onClick={() => submit.mutate()}
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
