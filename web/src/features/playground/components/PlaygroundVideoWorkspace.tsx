import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, Film, ImagePlus, Sparkles, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EngineTargetPanelFrame } from '../../../components/generation/EngineTargetPanelFrame';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { PlaygroundGenerationWorkspace } from '../../../components/generation/PlaygroundGenerationWorkspace';
import { PromptEditor } from '../../../components/generation/PromptEditor';
import { VideoEngineTargetPanel } from '../../../components/generation/VideoEngineTargetPanel';
import { VideoMediaPlayer } from '../../../components/media/VideoMediaPlayer';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { readActorScopedDraft, writeActorScopedDraft } from '../../../lib/persistence/actorScopedStorage';
import { CharacterPickerDialog, type CharacterCandidate } from '../../cinematic/components/CinematicDialogs';
import { uploadGenerationReference } from '../../generation/api/generationApi';
import {
  getVideoCapabilityCatalog,
  getVideoTask,
  listRecentVideoTasks,
  quoteVideoGeneration,
  submitVideoGeneration,
  type VideoGenerationInput
} from '../../generation/api/videoGenerationApi';
import type { VideoTask } from '../../generation/schemas/videoGenerationSchemas';
import { filterVideoModelsForOperation } from './videoModelSelection';

const VIDEO_DRAFT_FEATURE = 'playground-video';
const VIDEO_DRAFT_VERSION = 2;
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);

type VideoDraft = {
  prompt: string;
  operation: 'text_to_video' | 'image_to_video' | 'character_to_video';
  providerModelKey: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: string;
  comparisonActive: boolean;
  referenceImageUrl: string | null;
  character: CharacterCandidate | null;
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
  activeTaskId: null,
  recentExpanded: true
};

export function PlaygroundVideoExperience() {
  const { t } = useTranslation('playground');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const uploadRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const completedTaskRef = useRef<string | null>(null);
  const [draft, setDraft] = useState<VideoDraft>(() => readVideoDraft(actor?.userId));
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(draft.activeTaskId);
  const [uploading, setUploading] = useState(false);

  const capabilities = useQuery({
    queryKey: ['video-capabilities'],
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
    () => availableModels.find(model => `${model.providerId}:${model.modelId}` === draft.providerModelKey)
      || availableModels[0]
      || null,
    [availableModels, draft.providerModelKey]
  );
  const sourceReady = draft.operation === 'text_to_video'
    || (draft.operation === 'image_to_video' && Boolean(draft.referenceImageUrl))
    || (draft.operation === 'character_to_video' && Boolean(draft.character?.characterProfileVersionId));
  const generationInput = useMemo<VideoGenerationInput | null>(() => selectedModel ? ({
    providerId: selectedModel.providerId,
    modelId: selectedModel.modelId,
    operation: draft.operation,
    prompt: draft.prompt.trim(),
    aspectRatio: draft.aspectRatio,
    resolution: draft.resolution,
    durationSeconds: draft.durationSeconds,
    audioMode: draft.audioMode === 'none' ? 'none' : 'generated',
    referenceImageUrl: draft.operation === 'image_to_video' ? draft.referenceImageUrl : null,
    characterProfileId: draft.operation === 'character_to_video' ? draft.character?.id : null,
    characterProfileVersionId: draft.operation === 'character_to_video'
      ? draft.character?.characterProfileVersionId
      : null
  }) : null, [draft, selectedModel]);
  const quote = useQuery({
    queryKey: ['video-quote', actor?.userId, generationInput],
    queryFn: () => quoteVideoGeneration(generationInput!),
    enabled: Boolean(generationInput?.prompt && sourceReady),
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
    mutationFn: () => submitVideoGeneration({
      ...generationInput!,
      estimateId: quote.data!.estimate.estimateId,
      idempotencyKey: `playground-video:${crypto.randomUUID()}`
    }),
    onSuccess: submitted => {
      setTaskId(submitted.id);
      setDraft(current => ({ ...current, activeTaskId: submitted.id }));
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      void queryClient.invalidateQueries({ queryKey: ['video-tasks', actor?.userId] });
    }
  });

  useEffect(() => {
    if (!actor?.userId) return;
    const restored = readVideoDraft(actor.userId);
    setDraft(restored);
    setTaskId(restored.activeTaskId);
  }, [actor?.userId]);
  useEffect(() => {
    if (!actor?.userId) return;
    writeActorScopedDraft({
      actorId: actor.userId,
      feature: VIDEO_DRAFT_FEATURE,
      schemaVersion: VIDEO_DRAFT_VERSION,
      payload: draft
    });
  }, [actor?.userId, draft]);
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
  useEffect(() => {
    if (!activeTask || !TERMINAL.has(activeTask.status) || completedTaskRef.current === activeTask.id) return;
    completedTaskRef.current = activeTask.id;
    void queryClient.invalidateQueries({ queryKey: ['credits'] });
    void queryClient.invalidateQueries({ queryKey: ['video-tasks', actor?.userId] });
  }, [activeTask, actor?.userId, queryClient]);

  async function receiveImage(file?: File) {
    if (!file || !file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) return;
    setUploading(true);
    try {
      const uploaded = await uploadGenerationReference(
        await readFileAsDataUrl(file),
        'character_reference',
        'playground-video'
      );
      setDraft(current => ({ ...current, referenceImageUrl: uploaded.imageUrl }));
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  }

  const comparisonEnabled = capabilities.data?.comparison.enabled === true && availableModels.length >= 2;
  const generationReady = Boolean(
    generationInput?.prompt
    && sourceReady
    && quote.data?.account.canAfford
    && !submit.isPending
  );
  const loading = submit.isPending || Boolean(activeTask && !TERMINAL.has(activeTask.status));
  const providerErrorMessage = activeTask?.providerError?.code === 'ModelNotOpen'
    ? t('playground.video.providerError.modelNotOpen')
    : activeTask?.providerError?.code || null;
  const errorMessage = submit.error?.message
    || task.error?.message
    || providerErrorMessage
    || null;

  const resultRegion = (
    <section id="generation-video-results" aria-labelledby="playground-video-result-title">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase text-cyan-300">{t('playground.result.kicker')}</span>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h2 id="playground-video-result-title" className="m-0 truncate text-xl">{t('playground.video.resultTitle')}</h2>
          </div>
        </div>
        <Button
          variant="ghost"
          icon={<ArrowDown className="size-4" />}
          onClick={() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          {t('playground.action.goToPrompt')}
        </Button>
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
            {draft.operation === 'image_to_video' ? (
              <SourceChoice
                title={t('playground.video.imageSource')}
                value={draft.referenceImageUrl}
                action={(
                  <>
                    <Button icon={<ImagePlus className="size-4" />} onClick={() => uploadRef.current?.click()} disabled={uploading}>
                      {uploading ? t('playground.reference.uploading') : t('playground.reference.browse')}
                    </Button>
                    {draft.referenceImageUrl ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        icon={<X className="size-4" />}
                        title={t('playground.reference.remove')}
                        onClick={() => setDraft(current => ({ ...current, referenceImageUrl: null }))}
                      />
                    ) : null}
                    <input ref={uploadRef} hidden type="file" accept="image/*" onChange={event => void receiveImage(event.target.files?.[0])} />
                  </>
                )}
              />
            ) : null}
            {draft.operation === 'character_to_video' ? (
              <SourceChoice
                title={t('playground.video.characterSource')}
                value={draft.character?.displayName || null}
                action={<Button icon={<UserRound className="size-4" />} onClick={() => setCharacterPickerOpen(true)}>{t('playground.video.chooseCharacter')}</Button>}
              />
            ) : null}
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
    ) : availableModels.length && selectedModel ? (
      <VideoEngineTargetPanel
          models={availableModels}
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
        onClick={() => submit.mutate()}
      >
        <span>{submit.isPending ? t('playground.video.submitting') : t('playground.video.generate')}</span>
        <small>{quote.data
          ? `${quote.data.estimate.estimatedCredits} ${t('playground.comparison.credits')}`
          : t('playground.estimate.pending')}</small>
      </Button>
    </Surface>
  );

  return (
    <>
      <PlaygroundGenerationWorkspace
        prompt={directionRegion}
        result={resultRegion}
        queue={null}
        recent={<RecentVideoOutputs tasks={recent.data?.items || []} loading={recent.isLoading} onSelect={selected => { setTaskId(selected.id); setDraft(current => ({ ...current, activeTaskId: selected.id })); }} />}
        recentTitle={t('playground.video.recentTitle')}
        engine={engineRegion}
        references={null}
        actions={actionRegion}
        showRenderPromptHeading={false}
        recentExpanded={draft.recentExpanded}
        onRecentExpandedChange={recentExpanded => setDraft(current => ({ ...current, recentExpanded }))}
        comparisonActive={false}
      />
      <CharacterPickerDialog
        open={characterPickerOpen}
        onOpenChange={setCharacterPickerOpen}
        onSelect={character => setDraft(current => ({ ...current, character }))}
      />
    </>
  );
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

function SourceChoice({ title, value, action }: { title: string; value: string | null; action: ReactNode }) {
  return <div className="playground-video-source-choice"><div><strong>{title}</strong><small>{value || '-'}</small></div><div>{action}</div></div>;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readVideoDraft(actorId?: string): VideoDraft {
  if (!actorId) return EMPTY_DRAFT;
  const value = readActorScopedDraft<Partial<VideoDraft>>({
    actorId,
    feature: VIDEO_DRAFT_FEATURE,
    schemaVersion: VIDEO_DRAFT_VERSION,
    fallback: EMPTY_DRAFT
  });
  return { ...EMPTY_DRAFT, ...value };
}
