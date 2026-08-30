import * as Dialog from '@radix-ui/react-dialog';
import { Check, Clock3, RotateCcw, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import type { JobStatus } from '../../generation/schemas/generationSchemas';
import {
  approveCinematicStoryboardSource,
  getCinematicStoryboardGenerationContext,
  updateCinematicShotDirection
} from '../api/cinematicApi';
import type { GenerationReferenceRole } from '../../generation/api/generationApi';
import type {
  CinematicProject,
  CinematicScene,
  CinematicShot
} from '../schemas/cinematicSchemas';
import { DialogHeader } from './ProjectCostSummary';
import {
  buildStoryboardPrompt,
  previousApprovedStoryboardSource,
  resolveStoryboardShotCast,
  resolveStoryboardShotLooks
} from './storyboardGenerationAdapter';

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
  const defaultPrompt = useMemo(
    () => buildStoryboardPrompt(project, scene, shot),
    [project, scene, shot]
  );
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [saving, setSaving] = useState(false);
  const [approvingJobId, setApprovingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setPrompt(defaultPrompt);
      setError(null);
      setApprovingJobId(null);
    }
  }, [defaultPrompt, open, shot.prompt]);

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
  const blockedReason = generationContext.isPending
    ? t('cinematic.storyboard.loadingAuthority')
    : generationContext.error
      ? generationContext.error.message
      : generationContext.data?.generationEligible === false
        ? t(storyboardBlockingKey(generationContext.data.blockingReason))
        : null;

  async function savePrompt() {
    setSaving(true);
    setError(null);
    try {
      await updateCinematicShotDirection(project.id, scene.id, shot.id, {
        expectedVersion: project.version,
        expectedShotVersion: shot.version,
        prompt
      });
      onProjectRefresh?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function approveJob(job: JobStatus) {
    const jobId = job.jobId || job.id;
    if (!jobId) return;
    setApprovingJobId(jobId);
    setError(null);
    try {
      await approveCinematicStoryboardSource(project.id, shot.id, {
        expectedVersion: project.version,
        expectedShotVersion: shot.version,
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
          key={`${shot.id}:${shot.version}`}
          surface="cinematic"
          generationMode="scene"
          initialPrompt={defaultPrompt}
          prompt={prompt}
          onPromptChange={setPrompt}
          references={references}
          characterProfileContext={characterProfileContext}
          characterReferenceOutfitBehavior={references.outfit_front ? 'replaceable' : 'preserve'}
          allowComparison={false}
          layoutVariant="stacked"
          fixedAspectRatio={project.aspectRatio}
          persistenceScope={`${project.id}:${shot.id}`}
          resumeJobId={resumeJobId}
          referenceRoles={referenceRoles}
          referencesReadOnly
          blockedReason={blockedReason}
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
          <Button icon={<RotateCcw aria-hidden="true" />} onClick={() => setPrompt(defaultPrompt)}>{t('cinematic.storyboard.reset')}</Button>
          <Button disabled={saving || !prompt.trim()} onClick={() => void savePrompt()}>{saving ? t('cinematic.save.saving') : t('cinematic.storyboard.saveDirection')}</Button>
          <Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function formatSeconds(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}s`;
}

function storyboardBlockingKey(reason: string | null) {
  if (reason === 'cinematic_storyboard_multi_character_unqualified') return 'cinematic.storyboard.multiCharacterBlocked';
  if (reason === 'cinematic_storyboard_character_not_ready') return 'cinematic.storyboard.characterNotReady';
  if (reason === 'cinematic_storyboard_look_not_ready') return 'cinematic.storyboard.lookNotReady';
  if (reason === 'cinematic_storyboard_look_asset_unavailable') return 'cinematic.storyboard.lookAssetUnavailable';
  return 'cinematic.storyboard.generationBlocked';
}
