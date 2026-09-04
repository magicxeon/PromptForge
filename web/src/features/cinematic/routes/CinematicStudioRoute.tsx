import { Clapperboard, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { Surface } from '../../../components/ui/Surface';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { useActor } from '../../../lib/auth/ActorProvider';
import { useFeaturePolicy } from '../../../lib/permissions/FeaturePolicyProvider';
import { CinematicStageRail } from '../components/CinematicStageRail';
import { cinematicStages } from '../cinematicStages';
import { CinematicStageContent } from '../components/CinematicStageContent';
import { CinematicWorkspaceHeader } from '../components/CinematicWorkspaceHeader';
import { CinematicSetupForm } from '../components/CinematicSetupForm';
import { ProjectCostSummary } from '../components/ProjectCostSummary';
import { StoryEnhanceDialog } from '../components/CinematicDialogs';
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
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { updateCinematicStageWithRecovery } from './cinematicStageNavigation';

export function CinematicStudioRoute() {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const { isEnabled, isLoading } = useFeaturePolicy();
  const location = useLocation();
  const { projectId, stage } = useParams();

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
    return <ExistingCinematicWorkspace actorId={actor.userId} projectId={projectId} requestedStage={stage} />;
  }

  return (
    <CinematicWorkspace
      key={`${actor.userId}:new`}
      actorId={actor.userId}
      requestedStage={stage}
    />
  );
}

function CinematicProjectList({ actorId }: { actorId: string }) {
  const { t } = useTranslation('cinematic');
  const projects = useQuery({
    queryKey: ['cinematic-projects', actorId],
    queryFn: listCinematicProjects
  });
  return (
    <main className="grid gap-4" data-testid="cinematic-project-list">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold text-[var(--theme-primary)]">{t('cinematic.eyebrow')}</p>
          <h1 className="m-0 text-2xl">{t('cinematic.title')}</h1>
        </div>
        <Link to={routePaths.createCinematicNew} className="no-underline">
          <Button variant="primary" icon={<Plus className="size-4" />}>{t('cinematic.actions.newProject')}</Button>
        </Link>
      </header>
      {projects.isPending ? <Surface className="min-h-64 p-6" centerContent><p>{t('cinematic.status.loading')}</p></Surface> : null}
      {projects.isError ? <StatusNotice tone="error" title={t('cinematic.status.loadFailed')}>{projects.error.message}</StatusNotice> : null}
      {projects.data?.items.length === 0 ? <Surface className="min-h-64 p-6" centerContent>
          <Clapperboard className="size-10 text-[var(--theme-text-muted)]" aria-hidden="true" />
          <strong>{t('cinematic.empty.title')}</strong>
          <p className="m-0 max-w-md text-center text-sm text-[var(--theme-text-muted)]">{t('cinematic.empty.description')}</p>
        </Surface> : null}
      {projects.data?.items.length ? <div className="cinematic-project-grid">
        {projects.data.items.map(project => <Link key={project.projectId} to={routeBuilders.cinematicProject(project.projectId, project.activeStage)} className="cinematic-project-card">
          <Clapperboard aria-hidden="true" />
          <div><strong title={project.title}>{project.title}</strong><span>{t(`cinematic.stages.${project.activeStage}`)}</span></div>
          <small>{project.durationSeconds}s</small>
        </Link>)}
      </div> : null}
    </main>
  );
}

function ExistingCinematicWorkspace({ actorId, projectId, requestedStage }: { actorId: string; projectId: string; requestedStage?: string }) {
  const { t } = useTranslation('cinematic');
  const project = useQuery({
    queryKey: ['cinematic-project', actorId, projectId],
    queryFn: () => getCinematicProject(projectId)
  });
  const authoringManifest = useQuery({
    queryKey: ['cinematic-authoring-manifest'],
    queryFn: getCinematicAuthoringManifest,
    staleTime: Infinity
  });
  if (project.isPending) return <Surface fill centerContent><p>{t('cinematic.status.loading')}</p></Surface>;
  if (project.isError) return <StatusNotice tone="error" title={t('cinematic.status.loadFailed')}>{project.error.message}</StatusNotice>;
  return <CinematicWorkspace key={`${actorId}:${projectId}`} actorId={actorId} project={project.data} authoringManifest={authoringManifest.data} requestedStage={requestedStage} />;
}

function CinematicWorkspace({
  actorId,
  requestedStage,
  project,
  authoringManifest
}: {
  actorId: string;
  requestedStage?: string;
  project?: CinematicProject;
  authoringManifest?: CinematicAuthoringManifest;
}) {
  const { t } = useTranslation('cinematic');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialDraft = useMemo(() => resolveInitialDraft(actorId, project), [actorId, project]);
  const [draft, setDraft] = useState<CinematicSetupDraft>(initialDraft);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'offline' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [enhancePurpose, setEnhancePurpose] = useState<'story' | 'roles'>('story');
  const projectVersionRef = useRef(project?.version ?? 0);
  const mutationChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastSavedSetupRef = useRef(project ? serializeSetup(projectToDraft(project)) : '');
  const requestedStageResult = cinematicStageSchema.safeParse(requestedStage);
  const activeStage = requestedStageResult.success ? requestedStageResult.data : draft.activeStage;

  const createProject = useMutation({
    mutationFn: createCinematicProject,
    onSuccess: created => {
      removeCinematicSetupDraft(actorId);
      queryClient.invalidateQueries({ queryKey: ['cinematic-projects', actorId] });
      navigate(routeBuilders.cinematicProject(created.id, 'cast'));
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
  }, [project?.version]);

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
    if (!project) return;
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
        queryClient.setQueryData(['cinematic-project', actorId, project.id], saved);
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
  }, [actorId, draft, online, project, queryClient, t]);

  function enqueueProjectMutation(operation: () => Promise<CinematicProject>) {
    const result = mutationChainRef.current.then(operation, operation);
    mutationChainRef.current = result.then(() => undefined, () => undefined);
    return result;
  }

  function update<K extends keyof CinematicSetupDraft>(key: K, value: CinematicSetupDraft[K]) {
    setDraft(current => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }

  function changeCastPlanningMode(mode: CinematicSetupDraft['castPlanningMode']) {
    const roles = mode === 'solo'
      ? [createRoleSlot('lead', t('cinematic.cast.lead'))]
      : mode === 'duo'
        ? [createRoleSlot('lead', t('cinematic.cast.lead')), createRoleSlot('second', t('cinematic.setup.secondCharacter'))]
        : mode === 'manual' ? (draft.storyRoleSlots.length ? draft.storyRoleSlots : [createRoleSlot('manual-1', t('cinematic.cast.lead'))]) : [];
    setDraft(current => ({ ...current, castPlanningMode: mode, storyRoleSlots: roles, updatedAt: new Date().toISOString() }));
    if (mode === 'ai-recommended' && draft.storyBrief.trim()) {
      setEnhancePurpose('roles');
      setEnhanceOpen(true);
    }
  }

  function setManualRoleCount(count: number) {
    const boundedCount = Math.max(1, Math.min(4, count));
    setDraft(current => {
      const roles = current.storyRoleSlots.slice(0, boundedCount);
      while (roles.length < boundedCount) {
        const number = roles.length + 1;
        roles.push(createRoleSlot(`manual-${number}`, number === 1 ? t('cinematic.cast.lead') : `${t('cinematic.setup.role')} ${number}`));
      }
      return { ...current, castPlanningMode: 'manual', storyRoleSlots: roles, updatedAt: new Date().toISOString() };
    });
  }

  function addRoleSlot() {
    setDraft(current => ({
      ...current,
      storyRoleSlots: [...current.storyRoleSlots, createRoleSlot(`custom-${current.storyRoleSlots.length + 1}`, `${t('cinematic.setup.role')} ${current.storyRoleSlots.length + 1}`)],
      updatedAt: new Date().toISOString()
    }));
  }

  function updateRoleSlot(index: number, patch: Partial<CinematicSetupDraft['storyRoleSlots'][number]>) {
    setDraft(current => ({
      ...current,
      storyRoleSlots: current.storyRoleSlots.map((role, roleIndex) => roleIndex === index ? { ...role, ...patch } : role),
      updatedAt: new Date().toISOString()
    }));
  }

  function removeRoleSlot(index: number) {
    setDraft(current => ({
      ...current,
      storyRoleSlots: current.storyRoleSlots.filter((_, roleIndex) => roleIndex !== index),
      updatedAt: new Date().toISOString()
    }));
  }

  async function setActiveStage(nextStage: CinematicSetupDraft['activeStage']) {
    if (!project) return;
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
          return updateCinematicStage(project.id, nextStage, projectVersionRef.current);
        }
        return updateCinematicStageWithRecovery(project.id, nextStage, projectVersionRef.current);
      });
      projectVersionRef.current = saved.version;
      queryClient.setQueryData(['cinematic-project', actorId, project.id], saved);
      setDraft(current => ({ ...current, activeStage: nextStage, updatedAt: saved.updatedAt }));
      setSaveState('saved');
      navigate(routeBuilders.cinematicProject(project.id, nextStage));
    } catch (reason) {
      setSaveState('failed');
      setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
    }
  }

  function moveStage(offset: -1 | 1) {
    const currentIndex = cinematicStages.indexOf(activeStage);
    const nextStage = cinematicStages[currentIndex + offset];
    if (nextStage) void setActiveStage(nextStage);
  }

  function continueFromSetup() {
    if (project) void setActiveStage('cast');
    else createProject.mutate(draft);
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
          queryClient.setQueryData(['cinematic-project', actorId, project.id], saved);
          removeCinematicSetupRecoveryDraft(actorId, project.id);
        }
      }
      setSaveState('saved');
    } catch (reason) {
      setSaveState('failed');
      setSaveError(reason instanceof Error ? reason : new Error(t('cinematic.status.saveFailed')));
    }
  }

  return (
    <main className="grid gap-4" data-testid="cinematic-workspace">
      <CinematicWorkspaceHeader
        projectTitle={draft.projectName || t('cinematic.setup.untitled')}
        saveState={saveState}
      />
      <Surface className="cinematic-workspace-surface p-4">
        <CinematicStageRail activeStage={activeStage} onStageChange={setActiveStage} />
        <div className="cinematic-workspace-layout">
          <div className="min-w-0">
          {activeStage === 'setup' ? (
          <CinematicSetupForm
            draft={draft}
            saveState={saveState}
            saveError={saveError || (createProject.isError ? createProject.error : null)}
            pending={createProject.isPending}
            onUpdate={update}
            onPlanningModeChange={changeCastPlanningMode}
            onAddRole={addRoleSlot}
            onUpdateRole={updateRoleSlot}
            onRemoveRole={removeRoleSlot}
            onEnhance={() => { setEnhancePurpose('story'); setEnhanceOpen(true); }}
            onAnalyzeRoles={() => { setEnhancePurpose('roles'); setEnhanceOpen(true); }}
            onManualRoleCountChange={setManualRoleCount}
            onSave={() => void saveDraftNow()}
            onContinue={continueFromSetup}
          />
          ) : (
            <CinematicStageContent
              activeStage={activeStage}
              mode={draft.mode}
              project={project}
              authoringManifest={authoringManifest}
              onModeChange={mode => update('mode', mode)}
              onPrevious={() => moveStage(-1)}
              onNext={() => moveStage(1)}
              onOpenStage={stage => void setActiveStage(stage)}
              onProjectChanged={saved => {
                projectVersionRef.current = saved.version;
                queryClient.setQueryData(['cinematic-project', actorId, saved.id], saved);
              }}
              onAddCastCharacter={input => enqueueProjectMutation(async () => {
                if (!project) throw new Error(t('cinematic.status.saveFailed'));
                const saved = await upsertCinematicCast(project.id, input.assignmentId, {
                  expectedVersion: projectVersionRef.current,
                  characterProfileId: input.characterProfileId,
                  characterProfileVersionId: input.characterProfileVersionId,
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
                queryClient.setQueryData(['cinematic-project', actorId, saved.id], saved);
                return saved;
              })}
              onRemoveCastCharacter={assignmentId => enqueueProjectMutation(async () => {
                if (!project) throw new Error(t('cinematic.status.saveFailed'));
                const saved = await removeCinematicCast(project.id, assignmentId, projectVersionRef.current);
                projectVersionRef.current = saved.version;
                queryClient.setQueryData(['cinematic-project', actorId, saved.id], saved);
                return saved;
              })}
              onProjectRefresh={() => {
                if (project) void queryClient.invalidateQueries({ queryKey: ['cinematic-project', actorId, project.id] });
              }}
            />
          )}
          </div>
        </div>
        <ProjectCostSummary />
      </Surface>
      <StoryEnhanceDialog open={enhanceOpen} onOpenChange={setEnhanceOpen} draft={draft} purpose={enhancePurpose} onApply={enhancement => {
        setDraft(current => ({
          ...current,
          storyBrief: enhancePurpose === 'story' ? enhancement.enhancedStoryBrief : current.storyBrief,
          creativeDirection: enhancePurpose === 'story' ? (enhancement.creativeDirection || current.creativeDirection) : current.creativeDirection,
          castPlanningMode: 'ai-recommended',
          storyRoleSlots: enhancement.recommendedRoles,
          updatedAt: new Date().toISOString()
        }));
      }} />
    </main>
  );
}

function createRoleSlot(suffix: string, label: string): CinematicSetupDraft['storyRoleSlots'][number] {
  return {
    id: `role_${suffix}_${Date.now().toString(36)}`,
    label,
    importance: 'required',
    storyFunction: '',
    relationshipHint: '',
    objective: '',
    emotionalArc: '',
    personalityTraits: [],
    performanceDirection: ''
  };
}

function projectToDraft(project: CinematicProject): CinematicSetupDraft {
  const fallback = createCinematicSetupDraft(new Date(project.updatedAt));
  return {
    ...fallback,
    projectName: project.title,
    platform: project.setup.platform,
    durationSeconds: project.setup.durationSeconds,
    storyBrief: project.setup.storyBrief,
    creativeDirection: project.setup.creativeDirection,
    genre: project.setup.genre,
    audienceFeeling: project.setup.audienceFeeling,
    pacing: project.setup.pacing,
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
    platform: draft.platform,
    durationSeconds: draft.durationSeconds,
    storyBrief: draft.storyBrief,
    creativeDirection: draft.creativeDirection,
    genre: draft.genre,
    audienceFeeling: draft.audienceFeeling,
    pacing: draft.pacing,
    endingIntent: draft.endingIntent,
    mode: draft.mode,
    castPlanningMode: draft.castPlanningMode,
    storyRoleSlots: draft.storyRoleSlots
  });
}
