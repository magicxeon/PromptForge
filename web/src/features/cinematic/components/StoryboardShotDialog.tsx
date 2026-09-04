import * as Dialog from '@radix-ui/react-dialog';
import { Check, Clock3, RotateCcw, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { useActor } from '../../../lib/auth/ActorProvider';
import type { JobStatus } from '../../generation/schemas/generationSchemas';
import {
  approveCinematicStoryboardSource,
  getCinematicStoryboardGenerationContext,
  submitCinematicStoryboardBatch,
  updateCinematicShotDirection
} from '../api/cinematicApi';
import {
  estimateGeneration,
  type GenerationReferenceRole,
  type GenerationRequestDraft
} from '../../generation/api/generationApi';
import type {
  CinematicProject,
  CinematicScene,
  CinematicShot
} from '../schemas/cinematicSchemas';
import { DialogHeader } from './ProjectCostSummary';
import {
  CINEMATIC_NATURAL_CAMERA_PROFILE_ID,
  NaturalCameraRealismControl
} from './NaturalCameraRealismControl';
import {
  previousApprovedStoryboardSource,
  readStoryboardAuthorDirection,
  resolveStoryboardShotCast,
  resolveStoryboardShotLooks
} from './storyboardGenerationAdapter';
import { StoryboardVideoCompatibilityNotice } from './StoryboardVideoCompatibilityNotice';
import {
  readStoryboardEnginePreference,
  writeStoryboardEnginePreference
} from '../state/storyboardEnginePreference';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CinematicProject;
  scene: CinematicScene;
  shot: CinematicShot;
  resumeJobId?: string | null;
  onProjectRefresh?: () => void;
};

export function StoryboardShotDialog({
  open,
  onOpenChange,
  project,
  scene,
  shot,
  resumeJobId = null,
  onProjectRefresh
}: Props) {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const initialDirection = useMemo(() => readStoryboardAuthorDirection(shot.prompt), [shot.prompt]);
  const initialEnginePreference = actor?.userId
    ? readStoryboardEnginePreference(actor.userId)
    : null;
  const [direction, setDirection] = useState(initialDirection);
  const [savedDirection, setSavedDirection] = useState(initialDirection);
  const [generationRequestId, setGenerationRequestId] = useState(() => createShotGenerationKey(project.id, shot.id));
  const [saving, setSaving] = useState(false);
  const [approvingJobId, setApprovingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [naturalRealismEnabled, setNaturalRealismEnabled] = useState(true);
  useEffect(() => {
    if (open) {
      setDirection(initialDirection);
      setSavedDirection(initialDirection);
      setGenerationRequestId(createShotGenerationKey(project.id, shot.id));
      setError(null);
      setApprovingJobId(null);
      setNaturalRealismEnabled(true);
    }
  }, [initialDirection, open, project.id, shot.id]);

  const castAssignments = resolveStoryboardShotCast(project, scene, shot);
  const primaryCharacter = castAssignments[0] || null;
  const selectedLooks = resolveStoryboardShotLooks(castAssignments, scene, shot);
  const previousSource = previousApprovedStoryboardSource(scene, shot.id);
  const generationContext = useQuery({
    queryKey: ['cinematic-storyboard-generation-context', project.id, scene.id, shot.id, project.version],
    queryFn: () => getCinematicStoryboardGenerationContext(project.id, scene.id, shot.id),
    enabled: open,
    staleTime: 10_000,
    retry: false
  });
  const fallbackCharacterProfileContext = primaryCharacter ? {
    purpose: 'character_usage',
    characterProfileId: primaryCharacter.characterProfileId,
    characterProfileVersionId: primaryCharacter.characterProfileVersionId,
    useCase: 'cinematic',
    sourceType: 'scene_builder',
    sourceId: project.id
  } : null;
  const characterProfileContext = generationContext.data?.characterProfileContext
    || fallbackCharacterProfileContext;
  const references = Object.fromEntries(Object.entries(generationContext.data?.references || {})
    .filter((entry): entry is [GenerationReferenceRole, string] => Boolean(entry[1])));
  const referenceRoles = Object.keys(references) as GenerationReferenceRole[];
  const keyframePrompt = generationContext.data?.keyframeContract.providerIndependentPrompt || '';
  const directionDirty = direction.trim() !== savedDirection.trim();
  const blockedReason = generationContext.isPending
    ? t('cinematic.storyboard.loadingAuthority')
    : generationContext.error
      ? generationContext.error.message
      : generationContext.data?.generationEligible === false
        ? t(storyboardBlockingKey(generationContext.data.blockingReason))
        : directionDirty
          ? t('cinematic.storyboard.saveDirectionBeforeGeneration')
          : null;

  async function savePrompt() {
    setSaving(true);
    setError(null);
    try {
      await updateCinematicShotDirection(project.id, scene.id, shot.id, {
        expectedVersion: generationContext.data?.projectVersion || project.version,
        expectedShotVersion: generationContext.data?.shotVersion || shot.version,
        prompt: direction
      });
      setSavedDirection(direction);
      onProjectRefresh?.();
      await generationContext.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function submitStoryboardDraft(draft: GenerationRequestDraft) {
    const context = generationContext.data;
    if (!context) throw new Error(t('cinematic.storyboard.loadingAuthority'));
    const quote = await estimateGeneration(draft);
    const result = await submitCinematicStoryboardBatch(project.id, {
      expectedVersion: context.projectVersion,
      idempotencyKey: generationRequestId,
      operations: [{
        operationId: shot.id,
        sceneId: scene.id,
        shotId: shot.id,
        expectedShotVersion: context.shotVersion,
        keyframeContractFingerprint: context.keyframeContract.sourceFingerprint,
        estimateId: quote.estimate.estimateId,
        draft
      }]
    });
    const child = result.children[0];
    if (!child || child.status === 'failed') {
      throw new Error(child?.error?.message || t('cinematic.storyboard.generationBlocked'));
    }
    if (actor?.userId) {
      writeStoryboardEnginePreference(actor.userId, {
        provider: draft.provider,
        model: draft.submodel
      });
    }
    setGenerationRequestId(createShotGenerationKey(project.id, shot.id));
    onProjectRefresh?.();
    await generationContext.refetch();
    return { jobId: child.jobId, status: child.status };
  }

  async function approveJob(job: JobStatus) {
    const jobId = job.jobId || job.id;
    if (!jobId) return;
    setApprovingJobId(jobId);
    setError(null);
    try {
      await approveCinematicStoryboardSource(project.id, shot.id, {
        expectedVersion: generationContext.data?.projectVersion || project.version,
        expectedShotVersion: generationContext.data?.shotVersion || shot.version,
        jobId,
        idempotencyKey: `storyboard:${project.id}:${shot.id}:${jobId}`
      });
      onProjectRefresh?.();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed'));
    } finally {
      setApprovingJobId(null);
    }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="cinematic-dialog__overlay" />
      <Dialog.Content className="cinematic-dialog__content cinematic-storyboard-shot-dialog">
        <DialogHeader
          title={`${t('cinematic.storyboard.shot')} ${shot.orderKey}: ${shot.title}`}
          description={t('cinematic.storyboard.shotDialogDescription')}
        />
        <div className="cinematic-storyboard-shot-dialog__meta">
          <span><Clock3 aria-hidden="true" />{formatSeconds(shot.durationMs / 1000)}</span>
          <span><UsersRound aria-hidden="true" />{castAssignments.length
            ? castAssignments.map(item => item.displayName).join(', ')
            : t('cinematic.storyboard.environmentOnly')}</span>
          {selectedLooks.length ? <span>{selectedLooks.map(look => look.name).join(', ')}</span> : null}
          {previousSource ? <span>{t('cinematic.storyboard.previousFrameAttached')}</span> : null}
        </div>
        {blockedReason ? <StatusNotice tone="warning" title={t('cinematic.storyboard.generationBlocked')}>{blockedReason}</StatusNotice> : null}
        <div className="cinematic-storyboard-shot-dialog__generation">
        <GenerationExperience
          key={`${shot.id}:${shot.version}:${generationContext.data?.keyframeContract.sourceFingerprint || 'loading'}`}
          surface="cinematic"
          generationMode="scene"
          initialPrompt={keyframePrompt}
          prompt={keyframePrompt}
          showPromptEditor={false}
          readOnlyPrompt={keyframePrompt ? {
            label: t('cinematic.storyboard.compiledPrompt'),
            description: t('cinematic.storyboard.compiledPromptDescription')
          } : null}
          readOnlyPromptSupplement={<div className="cinematic-storyboard-shot-dialog__direction">
            <label htmlFor={`cinematic-shot-direction-${shot.id}`}>
              {t('cinematic.storyboard.shotDirection')}
            </label>
            <textarea
              id={`cinematic-shot-direction-${shot.id}`}
              aria-label={t('cinematic.storyboard.shotDirection')}
              value={direction}
              onChange={event => setDirection(event.target.value)}
              placeholder={t('cinematic.storyboard.shotDirectionPlaceholder')}
              rows={3}
            />
            <small>{t('cinematic.storyboard.shotDirectionDescription')}</small>
            <div className="cinematic-storyboard-shot-dialog__direction-actions">
              <Button icon={<RotateCcw aria-hidden="true" />} onClick={() => setDirection(savedDirection)}>{t('cinematic.storyboard.reset')}</Button>
              <Button disabled={saving || !directionDirty} onClick={() => void savePrompt()}>{saving ? t('cinematic.save.saving') : t('cinematic.storyboard.saveDirection')}</Button>
            </div>
          </div>}
          cinematicCaptureProfileId={naturalRealismEnabled
            ? CINEMATIC_NATURAL_CAMERA_PROFILE_ID
            : null}
          engineOptions={<NaturalCameraRealismControl
            enabled={naturalRealismEnabled}
            onChange={setNaturalRealismEnabled}
          />}
          renderEngineSelectionNotice={({ model }) => <StoryboardVideoCompatibilityNotice
            model={model}
            containsCharacter={castAssignments.length > 0}
          />}
          references={references}
          characterProfileContext={characterProfileContext}
          characterReferenceOutfitBehavior={references.outfit_front ? 'replaceable' : 'preserve'}
          allowComparison={false}
          enginePresentation="compact"
          layoutVariant="stacked"
          fixedAspectRatio={project.aspectRatio}
          initialEnginePreference={initialEnginePreference}
          persistenceScope={`${project.id}:${shot.id}`}
          resumeJobId={resumeJobId}
          referenceRoles={referenceRoles}
          referencesReadOnly
          showEmptyResult
          blockedReason={blockedReason}
          allowPromptRefinement={false}
          submitSingleDraft={submitStoryboardDraft}
          renderResultActions={(job) => <div className="cinematic-storyboard-approval-callout">
            <div>
              <strong>{t('cinematic.storyboard.approvalTitle')}</strong>
              <small>{t('cinematic.storyboard.approvalDescription')}</small>
            </div>
            <Button
              className="cinematic-storyboard-approval-callout__action"
              variant="primary"
              size="lg"
              icon={<Check aria-hidden="true" />}
              disabled={approvingJobId != null}
              onClick={() => void approveJob(job)}
            >{approvingJobId ? t('cinematic.storyboard.approvingSource') : t('cinematic.storyboard.approveGeneratedSource')}</Button>
          </div>}
        />
        </div>
        {error ? <p className="cinematic-storyboard-shot-dialog__error" role="alert">{error}</p> : null}
        <div className="cinematic-dialog__footer">
          <Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function createShotGenerationKey(projectId: string, shotId: string) {
  return `cinematic-storyboard:${projectId}:${shotId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function formatSeconds(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}s`;
}

function storyboardBlockingKey(reason: string | null) {
  if (reason === 'cinematic_storyboard_multi_character_unqualified') return 'cinematic.storyboard.multiCharacterBlocked';
  if (reason === 'cinematic_storyboard_character_not_ready') return 'cinematic.storyboard.characterNotReady';
  if (reason === 'cinematic_storyboard_look_not_ready') return 'cinematic.storyboard.lookNotReady';
  if (reason === 'cinematic_storyboard_look_asset_unavailable') return 'cinematic.storyboard.lookAssetUnavailable';
  if (reason === 'cinematic_storyboard_direction_incomplete') return 'cinematic.storyboard.directionIncomplete';
  return 'cinematic.storyboard.generationBlocked';
}
