import * as Dialog from '@radix-ui/react-dialog';
import { Check, Clock3, Pencil, RotateCcw, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GenerationExperience } from '../../../components/generation/GenerationExperience';
import { ReferenceRows, type ReferenceRowSource } from '../../../components/generation/ReferenceSlotGrid';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useActor } from '../../../lib/auth/ActorProvider';
import type { JobStatus } from '../../generation/schemas/generationSchemas';
import {
  approveCinematicStoryboardSource,
  getCinematicStoryboardGenerationContext,
  submitCinematicStoryboardBatch,
  updateCinematicShotDirection,
  updateCinematicStoryboardSettings
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
import { shotVideoReferencePreviews } from './storyboardGenerationAdapter';
import { StoryboardVideoCompatibilityNotice } from './StoryboardVideoCompatibilityNotice';
import { ProduceVideoReferences } from './produce/ProduceVideoReferences';
import { DialogueSoundSummary } from './authoring/DialogueSoundSummary';
import { StoryboardShotEditor } from './StoryboardShotEditor';
import { StoryboardShotWorkspace, type StoryboardWorkspaceTab } from './StoryboardShotWorkspace';
import { SceneEnvironmentControl } from './SceneEnvironmentControl';
import { useShotVideoReferences } from '../state/useShotVideoReferences';
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
  onEditStory?: () => void;
  initialEditorOpen?: boolean;
  embedded?: boolean;
  blockedReason?: string | null;
};

export function StoryboardShotDialog({
  open,
  onOpenChange,
  project,
  scene,
  shot,
  resumeJobId = null,
  onProjectRefresh,
  onEditStory,
  initialEditorOpen = false,
  embedded = false,
  blockedReason: externalBlockedReason = null
}: Props) {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const videoReferences = useShotVideoReferences(project, scene, shot, onProjectRefresh);
  const initialDirection = useMemo(() => readStoryboardAuthorDirection(shot.prompt), [shot.prompt]);
  const initialEnginePreference = actor?.userId
    ? readStoryboardEnginePreference(actor.userId)
    : null;
  const [direction, setDirection] = useState(initialDirection);
  const [savedDirection, setSavedDirection] = useState(initialDirection);
  const [generationRequestId, setGenerationRequestId] = useState(() => createShotGenerationKey(project.id, shot.id));
  const [saving, setSaving] = useState(false);
  const [editingShot, setEditingShot] = useState(initialEditorOpen);
  const [workspaceTab, setWorkspaceTab] = useState<StoryboardWorkspaceTab>(initialEditorOpen ? 'shot' : 'image');
  const [approvingJobId, setApprovingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [naturalRealismEnabled, setNaturalRealismEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [environmentBusy, setEnvironmentBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setEditingShot(initialEditorOpen);
      setWorkspaceTab(initialEditorOpen ? 'shot' : 'image');
    }
  }, [open, shot.id, initialEditorOpen]);
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
    queryKey: ['cinematic-storyboard-generation-context', actor?.userId, project.id, scene.id, shot.id, project.version],
    queryFn: () => getCinematicStoryboardGenerationContext(project.id, scene.id, shot.id),
    enabled: open,
    staleTime: 10_000,
    retry: false
  });
  const fallbackCharacterProfileContext = primaryCharacter?.characterProfileId ? {
    purpose: 'character_usage',
    characterProfileId: primaryCharacter.characterProfileId,
    characterProfileVersionId: primaryCharacter.characterProfileVersionId,
    useCase: 'cinematic',
    sourceType: 'scene_builder',
    sourceId: project.id
  } : null;
  const characterProfileContext = generationContext.data ? generationContext.data.characterProfileContext
    : fallbackCharacterProfileContext;
  const references = Object.fromEntries(Object.entries(generationContext.data?.references || {})
    .filter((entry): entry is [GenerationReferenceRole, string] => Boolean(entry[1])));
  const referenceRoles = Object.keys(references) as GenerationReferenceRole[];
  const referenceRows: ReferenceRowSource[] = (generationContext.data?.cinematicCastReferences || []).map((binding, index) => {
    const cast = project.castAssignments.find(item => item.id === binding.castAssignmentId);
    const look = generationContext.data?.looks.find(item => item.assignmentId === binding.castAssignmentId);
    const sheet = cast?.generatedSheet;
    const preview = binding.sourceType === 'generated_sheet'
      ? sheet && sheet.generationId === binding.generationId && sheet.contentHash === binding.contentHash ? sheet.previewUrl : null
      : binding.characterProfileId && binding.characterLookId && binding.characterLookVersionId
        ? `/api/character-profiles/${encodeURIComponent(binding.characterProfileId)}/looks/${encodeURIComponent(binding.characterLookId)}/versions/${encodeURIComponent(binding.characterLookVersionId)}/media/sheet`
        : null;
    return { slotId: `cinematic_cast_${index}`, name: binding.displayName,
      description: [cast?.storyRole, look?.name].filter(Boolean).join(' / '),
      sources: preview ? [{ src: preview, fit: 'contain' }] : [] };
  });
  const continuityShot = scene.shots.find(item => item.id === generationContext.data?.continuitySource?.shotId);
  const referenceLabels = continuityShot && references.style_reference
    ? { style_reference: t('cinematic.storyboard.referencePrevious', { title: continuityShot.title }) } : undefined;
  const keyframePrompt = generationContext.data?.keyframeContract.providerIndependentPrompt || '';
  const directionDirty = direction.trim() !== savedDirection.trim();
  const blockedReason = externalBlockedReason || (savingSettings || environmentBusy ? t('cinematic.save.saving') : null) || (generationContext.isPending
    ? t('cinematic.storyboard.loadingAuthority')
    : generationContext.error
      ? generationContext.error.message
      : generationContext.data?.generationEligible === false
        ? t(storyboardBlockingKey(generationContext.data.blockingReason))
        : editingShot
          ? t('cinematic.storyboard.saveDirectionBeforeGeneration')
        : directionDirty
          ? t('cinematic.storyboard.saveDirectionBeforeGeneration')
          : null);

  async function changeFaceless(value: boolean, treatment = generationContext.data?.cinematicFacialTreatment || shot.storyboardFacialTreatment || 'blank') {
    setSavingSettings(true);
    setError(null);
    try {
      await updateCinematicStoryboardSettings(project.id, scene.id, shot.id, {
        expectedVersion: generationContext.data?.projectVersion || project.version,
        expectedShotVersion: generationContext.data?.shotVersion || shot.version,
        storyboardFaceless: value,
        storyboardFacialTreatment: treatment
      });
      onProjectRefresh?.();
      await generationContext.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed'));
    } finally { setSavingSettings(false); }
  }

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
      if (!embedded) onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed'));
    } finally {
      setApprovingJobId(null);
    }
  }

  const generation = <GenerationExperience
          key={shot.id}
          renderWorkspace={regions => embedded ? <div className="cinematic-inline-image">
            {regions.result}{regions.queue}{regions.engine}{regions.references}
            {error ? <p role="alert">{error}</p> : null}
            {regions.messages}{regions.actions}
          </div> : <StoryboardShotWorkspace
            regions={{ ...regions, references: <ReferenceRows sources={referenceRows} labels={referenceLabels}>{regions.references}</ReferenceRows> }}
            tab={workspaceTab} onTabChange={setWorkspaceTab} editingShot={editingShot}
            notice={<>
              {error ? <p className="cinematic-storyboard-shot-dialog__error" role="alert">{error}</p> : null}
              {videoReferences.error ? <p role="alert">{videoReferences.error.message}</p> : null}
            </>}
            shotDetails={<>
              {editingShot ? <StoryboardShotEditor key={shot.id}
                project={{ ...project, version: generationContext.data?.projectVersion || project.version }}
                scene={scene} shot={{ ...shot, version: generationContext.data?.shotVersion || shot.version }}
                initialPrompt={direction} onClose={() => setEditingShot(false)} onSaved={() => {
                  setEditingShot(false);
                  onProjectRefresh?.();
                  void generationContext.refetch();
                }} /> : null}
            </>}
            videoDetails={<>
              <DialogueSoundSummary shot={shot} cast={project.castAssignments} onEdit={onEditStory ? () => { onOpenChange(false); onEditStory(); } : undefined} />
              <ProduceVideoReferences sketchAvailable={videoReferences.sketchAvailable} firstFrameEnabled={videoReferences.firstFrameEnabled} mode={videoReferences.mode} lastFirstFrameMode={videoReferences.lastFirstFrameMode}
                onChange={videoReferences.changeMode} disabled={saving || approvingJobId !== null || videoReferences.pending}
                loading={videoReferences.pending} references={shotVideoReferencePreviews(project, scene, shot, videoReferences.mode)} />
            </>}
          />}
          surface="cinematic"
          generationMode="scene"
          initialPrompt={keyframePrompt}
          prompt={keyframePrompt}
          showPromptEditor={false}
          readOnlyPrompt={keyframePrompt ? {
            label: t('cinematic.storyboard.compiledPrompt'),
            description: t('cinematic.storyboard.compiledPromptDescription'),
            collapsed: true
          } : null}
          readOnlyPromptSupplement={embedded ? null : <div className="cinematic-storyboard-shot-dialog__direction">
            <label htmlFor={`cinematic-shot-direction-${shot.id}`}>
              {t('cinematic.storyboard.shotDirection')}
            </label>
            <textarea
              id={`cinematic-shot-direction-${shot.id}`}
              aria-label={t('cinematic.storyboard.shotDirection')}
              value={direction}
              disabled={editingShot}
              onChange={event => setDirection(event.target.value)}
              placeholder={t('cinematic.storyboard.shotDirectionPlaceholder')}
              rows={3}
            />
            <small>{t('cinematic.storyboard.shotDirectionDescription')}</small>
            <div className="cinematic-storyboard-shot-dialog__direction-actions">
              <Button disabled={editingShot} icon={<RotateCcw aria-hidden="true" />} onClick={() => setDirection(savedDirection)}>{t('cinematic.storyboard.reset')}</Button>
              <Button disabled={editingShot || saving || !directionDirty} icon={saving ? <ProcessingSpinner size={16} /> : <Check />} onClick={() => void savePrompt()}>{saving ? t('cinematic.save.saving') : t('cinematic.storyboard.saveDirection')}</Button>
            </div>
          </div>}
          cinematicCaptureProfileId={naturalRealismEnabled
            ? CINEMATIC_NATURAL_CAMERA_PROFILE_ID
            : null}
          engineOptions={<><NaturalCameraRealismControl
            enabled={naturalRealismEnabled}
            onChange={setNaturalRealismEnabled}
          /><div className="engine-prompt-refinement">
            <strong className="engine-prompt-refinement__copy">{t('cinematic.storyboard.faceless')}</strong>
            {savingSettings ? <ProcessingSpinner size={16} /> : null}
            <ToggleSwitch label={t('cinematic.storyboard.faceless')}
              checked={generationContext.data?.cinematicFaceless ?? (shot.storyboardFaceless === true)}
              disabled={savingSettings || Boolean(externalBlockedReason) || generationContext.isPending}
              onClick={() => void changeFaceless(!(generationContext.data?.cinematicFaceless ?? (shot.storyboardFaceless === true)))} />
          </div>{(generationContext.data?.cinematicFaceless ?? shot.storyboardFaceless) ? <label className="cinematic-facial-treatment">
            <span>{t('cinematic.storyboard.facialTreatment')}</span>
            <select value={generationContext.data?.cinematicFacialTreatment || shot.storyboardFacialTreatment || 'blank'}
              disabled={savingSettings || Boolean(externalBlockedReason) || generationContext.isPending}
              onChange={event => void changeFaceless(true, event.target.value as 'blank' | 'white_previs')}>
              <option value="blank">{t('cinematic.storyboard.treatmentBlank')}</option>
              <option value="white_previs">{t('cinematic.storyboard.treatmentWhite')}</option>
            </select>
          </label> : null}</>}
          renderEngineSelectionNotice={({ model }) => <StoryboardVideoCompatibilityNotice
            model={model}
            containsCharacter={castAssignments.length > 0}
          />}
          references={references}
          characterProfileContext={characterProfileContext}
          cinematicCastReferences={generationContext.data?.cinematicCastReferences}
          cinematicSceneReference={generationContext.data?.cinematicSceneReference}
          referenceLead={<SceneEnvironmentControl project={project} scene={scene} compact={!embedded} onProjectRefresh={onProjectRefresh}
            onBusyChange={setEnvironmentBusy} disabled={saving || savingSettings || Boolean(externalBlockedReason)} />}
          cinematicContainsPeople={generationContext.data?.cinematicContainsPeople}
          cinematicFaceless={generationContext.data?.cinematicFaceless === true}
          cinematicFacialTreatment={generationContext.data?.cinematicFacialTreatment}
          cinematicManualStoryboard={generationContext.data?.cinematicManualStoryboard === true}
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
          blockedNotice={blockedReason ? <StatusNotice tone="warning" title={t('cinematic.storyboard.generationBlocked')}>{blockedReason}</StatusNotice> : undefined}
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
              icon={approvingJobId ? <ProcessingSpinner size={16} /> : <Check aria-hidden="true" />}
              disabled={editingShot || approvingJobId != null || Boolean(externalBlockedReason) || savingSettings}
              onClick={() => void approveJob(job)}
            >{approvingJobId ? t('cinematic.storyboard.approvingSource') : t('cinematic.storyboard.approveGeneratedSource')}</Button>
          </div>}
        />;
  if (embedded) return generation;
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="cinematic-dialog__overlay" />
      <Dialog.Content className="cinematic-dialog__content cinematic-storyboard-shot-dialog">
        <div className="cinematic-storyboard-shot-dialog__header">
          <DialogHeader title={`${t('cinematic.storyboard.shot')} ${shot.orderKey}: ${shot.title}`} description={scene.title} />
          <div className="cinematic-storyboard-shot-dialog__meta">
            <span><Clock3 aria-hidden="true" />{formatSeconds(shot.durationMs / 1000)}</span>
            <span><UsersRound aria-hidden="true" />{castAssignments.length ? castAssignments.map(item => item.displayName).join(', ') : t('cinematic.storyboard.environmentOnly')}</span>
            {selectedLooks.length ? <span>{selectedLooks.map(look => look.name).join(', ')}</span> : null}
            {previousSource ? <span>{t('cinematic.storyboard.previousFrameAttached')}</span> : null}
            <Button size="sm" icon={<Pencil />} disabled={editingShot || saving || approvingJobId !== null}
              onClick={() => { setWorkspaceTab('shot'); setEditingShot(true); }}>{t('cinematic.storyboard.editShot')}</Button>
          </div>
        </div>
        <div className="cinematic-storyboard-shot-dialog__generation">{generation}</div>
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
  if (reason === 'cinematic_storyboard_manual_look_required') return 'cinematic.manual.lookRequired';
  if (reason === 'cinematic_storyboard_multi_character_unqualified') return 'cinematic.storyboard.multiCharacterBlocked';
  if (reason === 'cinematic_storyboard_character_not_ready') return 'cinematic.storyboard.characterNotReady';
  if (reason === 'cinematic_storyboard_look_not_ready') return 'cinematic.storyboard.lookNotReady';
  if (reason === 'cinematic_storyboard_look_asset_unavailable') return 'cinematic.storyboard.lookAssetUnavailable';
  if (reason === 'cinematic_storyboard_direction_incomplete') return 'cinematic.storyboard.directionIncomplete';
  return 'cinematic.storyboard.generationBlocked';
}
