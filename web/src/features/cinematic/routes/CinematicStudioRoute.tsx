import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { Surface } from '../../../components/ui/Surface';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { useFeaturePolicy } from '../../../lib/permissions/FeaturePolicyProvider';
import { queryKeys } from '../../../lib/api/queryKeys';
import { CinematicStageRail } from '../components/CinematicStageRail';
import { CinematicWorkspaceNavigation } from '../components/CinematicWorkspaceNavigation';
import { cinematicStages, simpleCinematicStages, visibleCinematicStage } from '../cinematicStages';
import { CinematicStageContent, CinematicProduceRuntime } from '../components/CinematicStageContent';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { CinematicWorkspaceHeader } from '../components/CinematicWorkspaceHeader';
import { SeriesWorkspaceControls } from '../components/SeriesWorkspaceControls';
import { ProjectCostSummary } from '../components/ProjectCostSummary';
import { StoryEnhanceDialog } from '../components/CinematicDialogs';
import { applyStoryEnhancement } from '../state/applyStoryEnhancement';
import { cinematicStageSchema } from '../schemas/cinematicSchemas';
import type { CinematicAuthoringManifest, CinematicSetupDraft } from '../schemas/cinematicSchemas';
import {
  createCinematicSetupDraft,
  readCinematicSetupRecoveryDraft,
  readCinematicSetupDraft,
  removeCinematicSetupRecoveryDraft,
  removeCinematicSetupDraft,
  writeCinematicSetupRecoveryDraft,
  writeCinematicSetupDraft
} from '../state/cinematicDraftStorage';
import {
  createCinematicProject,
  getCinematicAuthoringManifest,
  getCinematicProject,
  listCinematicProjects,
  updateCinematicSetup,
  updateCinematicStage,
  upsertCinematicCast,
  removeCinematicCast
} from '../api/cinematicApi';
import { saveCinematicFullStoryRevision } from '../api/cinematicApi';
import type { StoryFile } from '../components/CinematicStoryFileImport';
import type { CinematicStoryPreparationContext } from '../api/cinematicApi';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { resolveProjectAuthoringOwnerId, updateCinematicStageWithRecovery } from './cinematicStageNavigation';
import { CinematicProjectLibrary } from '../components/CinematicProjectLibrary';
import { CinematicNewProjectComposer } from '../components/CinematicNewProjectComposer';
import { CinematicFullStoryWriter } from '../components/CinematicFullStoryWriter';
import { CinematicChapterWriter } from '../components/CinematicChapterWriter';
import { CinematicSceneOverview } from '../components/CinematicSceneOverview';
import { CinematicShotWriter } from '../components/CinematicShotWriter';
import { CinematicChapterFinal } from '../components/CinematicChapterFinal';
import { SceneEnvironmentControl } from '../components/SceneEnvironmentControl';
import { StoryboardShotDialog } from '../components/StoryboardShotDialog';
import { CinematicProjectNavigation } from '../components/CinematicProjectNavigation';
import { CinematicCharactersWorkspace } from '../components/CinematicCharactersWorkspace';
import { CinematicWritingBillingConsent } from '../components/CinematicWritingBillingConsent';

export function CinematicStudioRoute() {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const { isEnabled, isLoading } = useFeaturePolicy();
  const location = useLocation();
  const { projectId, stage, shotId } = useParams();

  if (isLoading) {
    return <Surface fill centerContent><p>{t('cinematic.status.loading')}</p></Surface>;
  }
  if (!isEnabled('cinematic.enabled')) {
    return (
      <StatusNotice tone="warning" title={t('cinematic.status.unavailable')}>
        {t('cinematic.status.unavailableDescription')}
      </StatusNotice>
    );
  }
  if (!actor) return null;

  const isNew = location.pathname === routePaths.createCinematicNew;
  if (!isNew && !projectId) return <CinematicProjectList actorId={actor.userId} />;
  if (projectId) {
    return <>
      <CinematicWritingBillingConsent key={`${actor.userId}:${location.key}`} actorId={actor.userId} scopeKey={location.key} />
      <ExistingCinematicWorkspace actorId={actor.userId} projectId={projectId} requestedStage={stage} shotId={shotId} />
    </>;
  }

  return (
    <>
    <CinematicWritingBillingConsent key={`${actor.userId}:${location.key}`} actorId={actor.userId} scopeKey={location.key} />
    <CinematicWorkspace
      key={`${actor.userId}:new`}
      actorId={actor.userId}
      requestedStage={stage}
    />
    </>
  );
}

function CinematicProjectList({ actorId }: { actorId: string }) {
  const projects = useQuery({
    queryKey: queryKeys.cinematicProjects(actorId),
    queryFn: listCinematicProjects,
    staleTime: 20_000,
    gcTime: 60_000,
    retry: false
  });
  return (
    <CinematicProjectLibrary
      projects={projects.data?.items || []}
      loading={projects.isPending}
      error={projects.isError}
      onRetry={() => void projects.refetch()}
    />
  );
}

function ExistingCinematicWorkspace({ actorId, projectId, requestedStage, shotId }: { actorId: string; projectId: string; requestedStage?: string; shotId?: string }) {
  const { t } = useTranslation('cinematic');
  const project = useQuery({
    queryKey: queryKeys.cinematicProject(actorId, projectId),
    queryFn: () => getCinematicProject(projectId)
  });
  const authoringManifest = useQuery({
    queryKey: ['cinematic-authoring-manifest'],
    queryFn: getCinematicAuthoringManifest,
    staleTime: Infinity
  });
  if (project.isPending) return <Surface fill centerContent><p>{t('cinematic.status.loading')}</p></Surface>;
  if (project.isError) return <StatusNotice tone="error" title={t('cinematic.status.loadFailed')}>{project.error.message}</StatusNotice>;
  const authoringOwnerId = shotId ? projectId : resolveProjectAuthoringOwnerId(project.data, requestedStage);
  if (authoringOwnerId !== projectId) {
    return <Navigate replace to={routeBuilders.cinematicProject(authoringOwnerId, requestedStage === 'cast' ? 'cast' : 'setup')} />;
  }
  return <CinematicProjectNavigation actorId={actorId} project={project.data}>
    {requestedStage === 'characters' ? <CinematicCharactersWorkspace key={`${actorId}:${projectId}`} actorId={actorId} project={project.data} />
      : <CinematicWorkspace key={`${actorId}:${projectId}`} actorId={actorId} project={project.data} authoringManifest={authoringManifest.data} requestedStage={requestedStage} shotId={shotId} />}
  </CinematicProjectNavigation>;
}

function CinematicWorkspace({
  actorId,
  requestedStage,
  project,
  authoringManifest,
  shotId
}: {
  actorId: string;
  requestedStage?: string;
  project?: CinematicProject;
  authoringManifest?: CinematicAuthoringManifest;
  shotId?: string;
}) {
  const { t } = useTranslation('cinematic');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const configuration = useQuery({ queryKey: ['cinematic-authoring-manifest'], queryFn: getCinematicAuthoringManifest,
    staleTime: Infinity, enabled: !authoringManifest });
  const resolvedManifest = authoringManifest || configuration.data;
  const initialDraft = useMemo(() => resolveInitialDraft(actorId, project), [actorId, project]);
  const [draft, setDraft] = useState<CinematicSetupDraft>(initialDraft);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [seriesBusy, setSeriesBusy] = useState(false);
  const [manualDirty, setManualDirty] = useState(false);
  const [firstFrameShotId, setFirstFrameShotId] = useState<string | null>(null);
  const writerLocation = useLocation();
  const prepareAfterEnhanceRef = useRef(false);
  const [enhancePurpose, setEnhancePurpose] = useState<'story' | 'roles'>('story');
  const projectVersionRef = useRef(project?.version ?? 0);
  const mutationChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastSavedSetupRef = useRef(project ? serializeSetup(projectToDraft(project)) : '');
  const requestedStageResult = cinematicStageSchema.safeParse(requestedStage);
  const activeStage = visibleCinematicStage(requestedStageResult.success ? requestedStageResult.data : draft.activeStage, draft.mode);

  const createProject = useMutation({
    mutationFn: ({ draft: input, creationIntent, storyPreparation, storyImport }: {
      draft: CinematicSetupDraft;
      creationIntent: 'draft' | 'prepare-story';
      storyPreparation?: CinematicStoryPreparationContext;
      storyImport?: StoryFile;
    }) => createCinematicProject(input, creationIntent, storyPreparation, storyImport),
    onSuccess: created => {
      if (getActiveActorId() !== actorId) return;
      removeCinematicSetupDraft(actorId);
      queryClient.invalidateQueries({ queryKey: queryKeys.cinematicProjects(actorId) });
      queryClient.setQueryData(queryKeys.cinematicProject(actorId, created.id), created);
      navigate(routeBuilders.cinematicProject(created.id, created.activeFullStoryVersionId ? 'cast' : 'setup'));
    }
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (project) projectVersionRef.current = Math.max(projectVersionRef.current, project.version);
  }, [project]);

  useEffect(() => {
    if (project) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      try {
        writeCinematicSetupDraft(actorId, draft);
        setSaveError(null);
        setSaveState(online ? 'saved' : 'offline');
      } catch (reason) {
        setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
        setSaveState('failed');
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [actorId, draft, online, project, t]);

  useEffect(() => {
    if (!project || seriesBusy) return;
    const serialized = serializeSetup(draft);
    if (serialized === lastSavedSetupRef.current) return;
    if (!online) {
      try {
        writeCinematicSetupRecoveryDraft(actorId, project.id, draft);
        setSaveError(null);
        setSaveState('offline');
      } catch (reason) {
        setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
        setSaveState('failed');
      }
      return;
    }
    setSaveState('saving');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await enqueueProjectMutation(() =>
          updateCinematicSetup(project.id, draft, projectVersionRef.current)
        );
        projectVersionRef.current = saved.version;
        lastSavedSetupRef.current = serialized;
        publishSavedSetup(saved);
        removeCinematicSetupRecoveryDraft(actorId, project.id);
        setSaveError(null);
        setSaveState('saved');
      } catch (reason) {
        writeCinematicSetupRecoveryDraft(actorId, project.id, draft);
        setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
        setSaveState('failed');
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [actorId, draft, online, project, queryClient, seriesBusy, t]);

  function publishSavedSetup(saved: CinematicProject) {
    if (getActiveActorId() !== actorId) return;
    queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
    void queryClient.invalidateQueries({ queryKey: queryKeys.cinematicProjects(actorId) });
    void queryClient.invalidateQueries({ queryKey: ['cinematic-series', actorId] });
  }

  function enqueueProjectMutation(operation: () => Promise<CinematicProject>) {
    const result = mutationChainRef.current.then(operation, operation);
    mutationChainRef.current = result.then(() => undefined, () => undefined);
    return result;
  }

  function update<K extends keyof CinematicSetupDraft>(key: K, value: CinematicSetupDraft[K]) {
    setDraft(current => ({ ...current, [key]: value,
      ...(key === 'storyBrief' && current.storyBriefImport && value !== current.storyBrief
        ? { storyBriefImport: { ...current.storyBriefImport, edited: true } } : {}),
      updatedAt: new Date().toISOString() }));
  }

  function draftWithDisplayTitle(value: CinematicSetupDraft) {
    return value.projectName.trim()
      ? value
      : { ...value, projectName: t('cinematic.newProject.untitled'), updatedAt: new Date().toISOString() };
  }

  function createManualDraft() {
    if (createProject.isPending) return;
    const prepared = draftWithDisplayTitle(draft);
    setDraft(prepared);
    writeCinematicSetupDraft(actorId, prepared);
    createProject.mutate({ draft: prepared, creationIntent: 'draft' });
  }

  function prepareStory() {
    if (!draft.storyBrief.trim() || createProject.isPending) return;
    prepareAfterEnhanceRef.current = true;
    setEnhancePurpose('story');
    setEnhanceOpen(true);
  }

  function changeEnhanceOpen(open: boolean) {
    setEnhanceOpen(open);
    if (!open) prepareAfterEnhanceRef.current = false;
  }

  function applyEnhancement(enhancement: Parameters<typeof applyStoryEnhancement>[1]) {
    const prepared = applyStoryEnhancement(draft, enhancement, enhancePurpose);
    if (prepared.storyBriefImport && prepared.storyBrief !== draft.storyBrief) {
      prepared.storyBriefImport = { ...prepared.storyBriefImport, edited: true };
    }
    const shouldCreate = !project && prepareAfterEnhanceRef.current && enhancePurpose === 'story';
    prepareAfterEnhanceRef.current = false;
    setDraft(prepared);
    if (shouldCreate) {
      const titled = draftWithDisplayTitle(prepared);
      setDraft(titled);
      writeCinematicSetupDraft(actorId, titled);
      createProject.mutate({
        draft: titled,
        creationIntent: 'prepare-story',
        storyPreparation: {
          enhancementId: enhancement.enhancementId,
          provenance: enhancement.provenance,
          billingStatus: enhancement.billingStatus
        }
      });
    }
  }

  async function setActiveStage(nextStage: CinematicSetupDraft['activeStage']) {
    if (!project || seriesBusy || manualDirty) return;
    nextStage = visibleCinematicStage(nextStage, draft.mode);
    setSaveState('saving');
    setSaveError(null);
    try {
      const saved = await enqueueProjectMutation(async () => {
        const serialized = serializeSetup(draft);
        const hasSetupChanges = serialized !== lastSavedSetupRef.current;
        if (hasSetupChanges) {
          const setupSaved = await updateCinematicSetup(project.id, draft, projectVersionRef.current);
          projectVersionRef.current = setupSaved.version;
          lastSavedSetupRef.current = serialized;
          publishSavedSetup(setupSaved);
          return updateCinematicStage(project.id, nextStage, projectVersionRef.current);
        }
        return updateCinematicStageWithRecovery(project.id, nextStage, projectVersionRef.current);
      });
      projectVersionRef.current = saved.version;
      queryClient.setQueryData(queryKeys.cinematicProject(actorId, project.id), saved);
      setDraft(current => ({ ...current, activeStage: nextStage, updatedAt: saved.updatedAt }));
      setSaveState('saved');
      navigate(routeBuilders.cinematicProject(project.id, nextStage));
    } catch (reason) {
      setSaveState('failed');
      setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
    }
  }

  function moveStage(offset: -1 | 1) {
    const stages = draft.mode === 'simple' ? simpleCinematicStages : cinematicStages;
    const currentIndex = stages.indexOf(activeStage);
    const nextStage = stages[currentIndex + offset];
    if (nextStage) void setActiveStage(nextStage);
  }

  async function saveDraftNow() {
    setSaveState('saving');
    setSaveError(null);
    try {
      if (!project) {
        writeCinematicSetupDraft(actorId, draft);
        setSaveState(online ? 'saved' : 'offline');
        return;
      } else {
        if (!online) {
          writeCinematicSetupRecoveryDraft(actorId, project.id, draft);
          setSaveState('offline');
          return;
        }
        const serialized = serializeSetup(draft);
        if (serialized !== lastSavedSetupRef.current) {
          const saved = await enqueueProjectMutation(() => updateCinematicSetup(project.id, draft, projectVersionRef.current));
          projectVersionRef.current = saved.version;
          lastSavedSetupRef.current = serialized;
          publishSavedSetup(saved);
          removeCinematicSetupRecoveryDraft(actorId, project.id);
        }
      }
      setSaveState('saved');
    } catch (reason) {
      setSaveState('failed');
      setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
    }
  }

  async function prepareSeriesChange() {
    if (manualDirty) throw new Error(t('cinematic.manual.saveBeforeLeave'));
    if (!project || !online) throw new Error(t('cinematic.series.saveBeforeSwitch'));
    return enqueueProjectMutation(async () => {
      const serialized = serializeSetup(draft);
      if (serialized === lastSavedSetupRef.current) return {
        ...(queryClient.getQueryData<CinematicProject>(queryKeys.cinematicProject(actorId, project.id)) || project), version: projectVersionRef.current
      };
      const saved = await updateCinematicSetup(project.id, draft, projectVersionRef.current);
      projectVersionRef.current = saved.version;
      lastSavedSetupRef.current = serialized;
      publishSavedSetup(saved);
      removeCinematicSetupRecoveryDraft(actorId, project.id);
      setSaveState('saved'); setSaveError(null);
      return saved;
    });
  }

  async function importFullStory(file: StoryFile) {
    if (!online || createProject.isPending || seriesBusy) return;
    if (!project) {
      const prepared = draftWithDisplayTitle({ ...draft, projectName: draft.projectName.trim() || file.fileName.replace(/\.(md|txt)$/i, '').slice(0, 120) });
      await createProject.mutateAsync({ draft: prepared, creationIntent: 'draft', storyImport: file });
      return;
    }
    setSeriesBusy(true);
    try {
      await prepareSeriesChange();
      const saved = await enqueueProjectMutation(() => saveCinematicFullStoryRevision(project.id, {
        expectedVersion: projectVersionRef.current, content: file.content, source: 'manual', importFileName: file.fileName
      }));
      if (getActiveActorId() !== actorId) return;
      projectVersionRef.current = saved.version;
      queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
      setDraft(current => ({ ...current, activeStage: 'cast' }));
      navigate(routeBuilders.cinematicProject(saved.id, 'cast'));
    } finally { setSeriesBusy(false); }
  }

  if (!project) {
    return (
      <>
        <CinematicNewProjectComposer
          draft={draft}
          storyAuthoring={resolvedManifest?.storyAuthoring}
          creationPolicy={resolvedManifest?.rewamp?.workflow.projectCreation}
          saveState={saveState}
          saveError={saveError || (createProject.isError ? createProject.error : null)}
          pending={createProject.isPending}
          online={online}
          onUpdate={update}
          onCreateDraft={createManualDraft}
          onPrepareStory={prepareStory}
          importPolicy={resolvedManifest?.rewamp?.workflow.storyImport}
          maximumStoryCharacters={resolvedManifest?.rewamp?.workflow.authoring.fullStoryMaximumCharacters}
          maximumVideoDirectionCharacters={resolvedManifest?.rewamp?.workflow.authoring.projectVideoDirectionMaximumCharacters}
          onImportFullStory={importFullStory}
        />
        <StoryEnhanceDialog
          open={enhanceOpen}
          onOpenChange={changeEnhanceOpen}
          draft={draft}
          purpose="story"
          onApply={applyEnhancement}
        />
      </>
    );
  }

  if (shotId && project) {
    const scene = project.scenes.find(item => item.shots.some(shot => shot.id === shotId));
    const shot = scene?.shots.find(item => item.id === shotId);
    const previewTake = new URLSearchParams(writerLocation.search).get('take') || undefined;
    const takeSearch = previewTake ? `take=${encodeURIComponent(previewTake)}` : '';
    if (scene && shot && new URLSearchParams(writerLocation.search).get('render') === 'video') {
      const returnToWriter = () => navigate(`${routeBuilders.cinematicShot(project.id, shotId)}${takeSearch ? `?${takeSearch}` : ''}`);
      return <main className="cinematic-shot-writer">
        <Button icon={<ArrowLeft />} onClick={returnToWriter}>{t('cinematic.shotWorkspace.backToShot')}</Button>
        <CinematicProduceRuntime key={`${actorId}:${project.id}`} project={project} sceneId={scene.id} shotId={shotId} mode="simple"
          previewAttemptId={previewTake}
          onSelectionChange={(_sceneId, nextShot, nextTake) => navigate(`${routeBuilders.cinematicShot(project.id, nextShot)}?render=video${nextTake ? `&take=${encodeURIComponent(nextTake)}` : ''}`, { replace: true })}
          onEditStory={returnToWriter} onEditStoryboard={() => { returnToWriter(); setFirstFrameShotId(shotId); }}
          onProjectRefresh={() => { void queryClient.invalidateQueries({ queryKey: queryKeys.cinematicProject(actorId, project.id) }); }} />
      </main>;
    }
    const attempt = [...project.generationAttempts].reverse().filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .find(item => item.operation === 'cinematic_storyboard_still' && item.shotId === shotId);
    return <><CinematicShotWriter
      actorId={actorId}
      project={project}
      shotId={shotId}
      online={online}
      maximumDocumentCharacters={resolvedManifest?.rewamp?.workflow.authoring.shotDocumentMaximumCharacters}
      onBackToScenes={() => navigate(`${routeBuilders.cinematicProject(project.id, 'scenes')}?scene=${encodeURIComponent(scene?.id || '')}`)}
      onOpenFirstFrame={() => setFirstFrameShotId(shotId)}
      onOpenVideo={() => navigate(`${routeBuilders.cinematicShot(project.id, shotId)}?render=video${takeSearch ? `&${takeSearch}` : ''}`)}
      onOpenCharacters={() => navigate(routeBuilders.cinematicCharacters(project.id), { state: { cinematicStoryReturn: { actorId, projectId: project.id, path: `${writerLocation.pathname}${writerLocation.search}` } } })}
      onOpenFinal={() => navigate(routeBuilders.cinematicProject(project.id, 'finish'))}
      onOpenShot={nextShotId => navigate(routeBuilders.cinematicShot(project.id, nextShotId))}
      onProjectChanged={saved => {
        projectVersionRef.current = saved.version;
        queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
      }}
    />{firstFrameShotId === shotId && scene && shot ? <StoryboardShotDialog
      key={`${project.id}:${shotId}`} open project={project} scene={scene} shot={shot}
      onOpenChange={open => {
        if (!open) {
          setFirstFrameShotId(null);
          requestAnimationFrame(() => document.getElementById('cinematic-shot-first-frame')?.focus());
        }
      }}
      onEditDocument={() => {
        setFirstFrameShotId(null);
        requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.cinematic-shot-writer__editor textarea')?.focus());
      }}
      resumeJobId={typeof attempt?.generationJobId === 'string' ? attempt.generationJobId : null}
      onProjectRefresh={() => { void queryClient.invalidateQueries({ queryKey: queryKeys.cinematicProject(actorId, project.id) }); }}
    /> : null}</>;
  }

  if (requestedStage === 'chapters') {
    const fullStoryOwnerId = project.chapterOrigin?.projectId || project.id;
    return (
      <CinematicChapterWriter
        actorId={actorId}
        project={project}
        online={online}
        onBackToFullStory={() => navigate(routeBuilders.cinematicProject(fullStoryOwnerId, 'cast'))}
        onOpenSetup={storyProjectId => navigate(routeBuilders.cinematicProject(storyProjectId, 'setup'))}
        onNavigateChapter={projectId => navigate(routeBuilders.cinematicProject(projectId, 'chapters'))}
        onOpenScenes={() => navigate(routeBuilders.cinematicProject(project.id, 'scenes'))}
        onOpenCharacters={() => navigate(routeBuilders.cinematicCharacters(project.id), { state: { cinematicStoryReturn: { actorId, projectId: project.id, path: `${writerLocation.pathname}${writerLocation.search}` } } })}
        onProjectChanged={saved => {
          projectVersionRef.current = saved.version;
          queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
        }}
      />
    );
  }

  if (requestedStage === 'scenes') {
    return (
      <CinematicSceneOverview
        actorId={actorId}
        project={project}
        online={online}
        initialSceneId={new URLSearchParams(writerLocation.search).get('scene') || undefined}
        renderEnvironment={(scene, disabled) => <SceneEnvironmentControl key={scene.id} project={project} scene={scene} compact disabled={disabled}
          onProjectRefresh={() => { void queryClient.invalidateQueries({ queryKey: queryKeys.cinematicProject(actorId, project.id) }); }} />}
        onBackToChapter={() => navigate(routeBuilders.cinematicProject(project.id, 'chapters'))}
        onOpenShot={shotId => navigate(routeBuilders.cinematicShot(project.id, shotId))}
        onOpenFinal={() => navigate(routeBuilders.cinematicProject(project.id, 'finish'))}
        onProjectChanged={saved => {
          projectVersionRef.current = saved.version;
          queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
        }}
      />
    );
  }

  if (activeStage === 'finish' && new URLSearchParams(writerLocation.search).get('editor') !== 'timeline') {
    return <CinematicChapterFinal actorId={actorId} project={project}
      onBackToScenes={() => navigate(routeBuilders.cinematicProject(project.id, 'scenes'))}
      onOpenShot={id => navigate(routeBuilders.cinematicShot(project.id, id))}
      onOpenTimeline={() => navigate(`${routeBuilders.cinematicProject(project.id, 'finish')}?editor=timeline`)} />;
  }

  if (activeStage === 'setup') {
    return (
      <CinematicNewProjectComposer
        variant="edit"
        importedFullStory={project.fullStoryVersions.find(item => item.id === project.activeFullStoryVersionId)}
        draft={draft}
        storyAuthoring={resolvedManifest?.storyAuthoring}
        creationPolicy={resolvedManifest?.rewamp?.workflow.projectCreation}
        saveState={saveState}
        saveError={saveError}
        pending={seriesBusy}
        online={online}
        onUpdate={update}
        onCreateDraft={() => undefined}
        onPrepareStory={() => undefined}
        importPolicy={resolvedManifest?.rewamp?.workflow.storyImport}
        maximumStoryCharacters={resolvedManifest?.rewamp?.workflow.authoring.fullStoryMaximumCharacters}
        maximumVideoDirectionCharacters={resolvedManifest?.rewamp?.workflow.authoring.projectVideoDirectionMaximumCharacters}
        onImportFullStory={importFullStory}
        onSave={() => void saveDraftNow()}
        onContinueFullStory={() => void (async () => {
          await saveDraftNow();
          await setActiveStage('cast');
        })()}
      />
    );
  }

  if (activeStage === 'cast') {
    return (
      <CinematicFullStoryWriter
        actorId={actorId}
        project={project}
        online={online}
        onBackToBrief={() => void setActiveStage('setup')}
        onOpenChapters={() => navigate(routeBuilders.cinematicProject(project.id, 'chapters'))}
        onOpenCharacters={() => navigate(routeBuilders.cinematicCharacters(project.id), { state: { cinematicStoryReturn: { actorId, projectId: project.id, path: `${writerLocation.pathname}${writerLocation.search}` } } })}
        onProjectChanged={saved => {
          projectVersionRef.current = saved.version;
          queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
        }}
      />
    );
  }

  return (
    <main className="grid gap-4" data-testid="cinematic-workspace">
      <CinematicWorkspaceHeader
        projectTitle={draft.projectName || t('cinematic.setup.untitled')}
        saveState={saveState}
      />
      {project ? <SeriesWorkspaceControls actorId={actorId} project={project} isSetup={false}
        rewampEnabled={resolvedManifest?.rewamp?.enabled}
        onPrepare={prepareSeriesChange} onBusyChange={setSeriesBusy}
        onProjectChanged={saved => { projectVersionRef.current = saved.version; queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved); }}
        onNavigate={(id, nextStage) => navigate(routeBuilders.cinematicProject(id, cinematicStageSchema.parse(nextStage)))} /> : null}
      <Surface className={`cinematic-workspace-surface p-4${activeStage === 'produce' ? ' cinematic-workspace-surface--produce' : ''}`}>
        {resolvedManifest?.rewamp?.enabled
          ? <CinematicWorkspaceNavigation mode={draft.mode} activeStage={activeStage} onStageChange={manualDirty ? undefined : setActiveStage} />
          : <CinematicStageRail mode={draft.mode} activeStage={activeStage} onStageChange={manualDirty ? undefined : setActiveStage} />}
        <div className="cinematic-workspace-layout" inert={seriesBusy || undefined}>
          <div className="min-w-0">
            <CinematicStageContent
              activeStage={activeStage}
              mode={draft.mode}
              project={project}
              authoringManifest={resolvedManifest}
              onModeChange={mode => update('mode', mode)}
              onDirtyChange={setManualDirty}
              onPrevious={() => moveStage(-1)}
              onNext={() => moveStage(1)}
              onOpenStage={stage => void setActiveStage(stage)}
              onProjectChanged={saved => {
                projectVersionRef.current = saved.version;
                queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
              }}
              onAddCastCharacter={input => enqueueProjectMutation(async () => {
                if (!project) throw new Error(t('cinematic.status.saveFailed'));
                const saved = await upsertCinematicCast(project.id, input.assignmentId, {
                  expectedVersion: projectVersionRef.current,
                  characterProfileId: input.characterProfileId,
                  characterProfileVersionId: input.characterProfileVersionId,
                  sourceType: input.sourceType,
                  generationId: input.generationId,
                  sheetConfirmed: input.sheetConfirmed,
                  displayName: input.displayName,
                  storyImportance: input.storyImportance,
                  storyRole: input.storyRole,
                  storyRoleSlotId: input.storyRoleSlotId,
                  objective: input.objective,
                  personalityTraits: input.personalityTraits,
                  emotionalBaseline: input.emotionalBaseline,
                  performanceDirection: input.performanceDirection
                });
                projectVersionRef.current = saved.version;
                queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
                return saved;
              })}
              onRemoveCastCharacter={assignmentId => enqueueProjectMutation(async () => {
                if (!project) throw new Error(t('cinematic.status.saveFailed'));
                const saved = await removeCinematicCast(project.id, assignmentId, projectVersionRef.current);
                projectVersionRef.current = saved.version;
                queryClient.setQueryData(queryKeys.cinematicProject(actorId, saved.id), saved);
                return saved;
              })}
              onProjectRefresh={() => {
                if (project) void queryClient.invalidateQueries({ queryKey: queryKeys.cinematicProject(actorId, project.id) });
              }}
            />
          </div>
        </div>
        <ProjectCostSummary />
      </Surface>
      <StoryEnhanceDialog open={enhanceOpen} onOpenChange={changeEnhanceOpen} draft={draft} purpose={enhancePurpose} onApply={applyEnhancement} />
    </main>
  );
}

function projectToDraft(project: CinematicProject): CinematicSetupDraft {
  const fallback = createCinematicSetupDraft(new Date(project.updatedAt));
  return {
    ...fallback,
    projectName: project.title,
    format: project.setup.format,
    aspectRatio: project.setup.aspectRatio || project.aspectRatio as CinematicSetupDraft['aspectRatio'],
    platform: project.setup.platform,
    durationSeconds: project.setup.durationSeconds,
    seasonEnabled: project.setup.seasonEnabled,
    seasonCount: project.setup.seasonCount,
    chapterCount: project.setup.chapterCount,
    chaptersPerSeason: project.setup.chaptersPerSeason,
    storyBrief: project.setup.storyBrief,
    storyBriefImport: project.setup.storyBriefImport,
    creativeDirection: project.setup.creativeDirection,
    videoDirection: project.setup.videoDirection || '',
    genre: project.setup.genre,
    audienceFeeling: project.setup.audienceFeeling,
    pacing: project.setup.pacing,
    genres: project.setup.genres,
    audienceFeelings: project.setup.audienceFeelings,
    pacingTraits: project.setup.pacingTraits,
    storyCountryStyle: project.setup.storyCountryStyle ?? 'none',
    storyPeriod: project.setup.storyPeriod ?? 'contemporary',
    endingIntent: project.setup.endingIntent,
    mode: project.setup.mode,
    castPlanningMode: project.setup.castPlanningMode,
    storyRoleSlots: project.setup.storyRoleSlots,
    activeStage: project.activeStage,
    updatedAt: project.updatedAt
  };
}

function resolveInitialDraft(actorId: string, project?: CinematicProject) {
  if (!project) return readCinematicSetupDraft(actorId);
  const serverDraft = projectToDraft(project);
  const recoveryDraft = readCinematicSetupRecoveryDraft(actorId, project.id);
  return recoveryDraft && Date.parse(recoveryDraft.updatedAt) > Date.parse(project.updatedAt)
    ? recoveryDraft
    : serverDraft;
}

function serializeSetup(draft: CinematicSetupDraft) {
  return JSON.stringify({
    projectName: draft.projectName,
    format: draft.format,
    aspectRatio: draft.aspectRatio,
    platform: draft.platform,
    durationSeconds: draft.durationSeconds,
    seasonEnabled: draft.seasonEnabled,
    seasonCount: draft.seasonCount,
    chapterCount: draft.chapterCount,
    chaptersPerSeason: draft.chaptersPerSeason,
    storyBrief: draft.storyBrief,
    storyBriefImport: draft.storyBriefImport,
    creativeDirection: draft.creativeDirection,
    videoDirection: draft.videoDirection || '',
    genre: draft.genre,
    audienceFeeling: draft.audienceFeeling,
    pacing: draft.pacing,
    genres: draft.genres,
    audienceFeelings: draft.audienceFeelings,
    pacingTraits: draft.pacingTraits,
    storyCountryStyle: draft.storyCountryStyle ?? 'none',
    storyPeriod: draft.storyPeriod,
    endingIntent: draft.endingIntent,
    mode: draft.mode,
    castPlanningMode: draft.castPlanningMode,
    storyRoleSlots: draft.storyRoleSlots
  });
}
