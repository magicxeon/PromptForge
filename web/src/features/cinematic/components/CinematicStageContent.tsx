import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Clock3, Film, Image as ImageIcon,
  Images, Link2, Play, Plus, RotateCcw, Shirt, Sparkles, Trash2, Upload, UserRound, WandSparkles
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Surface } from '../../../components/ui/Surface';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { VideoMediaPlayer } from '../../../components/media/VideoMediaPlayer';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import type { CinematicStage } from '../cinematicStages';
import {
  BeatDetailsDialog, CharacterPickerDialog, SceneDirectorDialog, SceneDirectionProposalDialog,
  StoryPlanProposalDialog, type CharacterCandidate
} from './CinematicDialogs';
import { CharacterLookDialog, type CharacterLookDialogMode } from '../../profiles/components/CharacterLookDialog';
import { CinematicControlLevel } from './CinematicControlLevel';
import { ContextualOperationDock } from './ContextualOperationDock';
import { StoryboardSequenceBoard, type StoryboardShotSummary } from './StoryboardSequenceBoard';
import { StoryboardShotDialog } from './StoryboardShotDialog';
import { StoryboardGenerateAllDialog } from './StoryboardGenerateAllDialog';
import { resolveStoryboardShotCast, resolveStoryboardShotLooks } from './storyboardGenerationAdapter';
import {
  reorderCinematicSceneShots, saveCinematicStoryPlan,
  saveCinematicTimeline, upsertCinematicCast, removeCinematicCast,
  upsertCinematicWardrobeLook, approveCinematicVideoAttempt, createCinematicVideoAttempt,
  quoteCinematicVideoAttempt, getCinematicVideoCapabilityCatalog, suggestCinematicWardrobe,
  generateCinematicStoryPlan, generateCinematicSceneDirection, getCinematicProject
} from '../api/cinematicApi';
import { ApiError } from '../../../lib/api/apiError';
import { getVideoTask } from '../../generation/api/videoGenerationApi';
import type {
  CinematicProject, CinematicScene, CinematicSceneDirectionProposal, CinematicShot,
  CinematicStoryBeat, CinematicStoryPlanDraft, CinematicStoryPlanProposal
} from '../schemas/cinematicSchemas';
import { listCharacterLooks, retireCharacterLook } from '../../profiles/api/profileApi';
import type { CharacterLook } from '../../profiles/schemas/profileSchemas';

type Props = {
  activeStage: CinematicStage;
  mode?: 'simple' | 'advanced';
  onModeChange?: (mode: 'simple' | 'advanced') => void;
  onPrevious: () => void;
  onNext: () => void;
  project?: CinematicProject;
  onProjectChanged?: (project: CinematicProject) => void;
  onAddCastCharacter?: (input: {
    assignmentId: string;
    characterProfileId: string;
    characterProfileVersionId: string;
    displayName: string;
    storyImportance: 'protagonist' | 'supporting';
    storyRole: string;
    storyRoleSlotId?: string | null;
    objective: string;
    personalityTraits: string[];
    emotionalBaseline: string;
    performanceDirection: string;
  }) => Promise<CinematicProject>;
  onRemoveCastCharacter?: (assignmentId: string) => Promise<CinematicProject>;
  onProjectRefresh?: () => void;
  onOpenStage?: (stage: CinematicStage) => void;
};
const beats = ['arrival', 'recognition', 'choice', 'reveal', 'resolution'] as const;
const shots = ['01A', '01B', '02A', '03A'] as const;
const storyboardShotFixtures = [
  { id: '01A', durationSeconds: 3.5, titleKey: 'arrivalHold', framingKey: 'mediumClose', actionKey: 'arrivalAction', status: 'ready' },
  { id: '01B', durationSeconds: 2.5, titleKey: 'letterInsert', framingKey: 'insertClose', actionKey: 'letterAction', status: 'draft' },
  { id: '01C', durationSeconds: 3, titleKey: 'platformReaction', framingKey: 'profileMedium', actionKey: 'reactionAction', status: 'warning' },
  { id: '01D', durationSeconds: 3.5, titleKey: 'trainReveal', framingKey: 'wideReveal', actionKey: 'revealAction', status: 'draft' }
] as const;

export function CinematicStageContent({ activeStage, mode = 'simple', onModeChange, onPrevious, onNext, project, onProjectChanged, onAddCastCharacter, onRemoveCastCharacter, onProjectRefresh, onOpenStage }: Props) {
  const castBlocked = activeStage === 'cast' && hasIncompleteRequiredCast(project);
  const storyPlanBlockReason = activeStage === 'story-plan' ? storyPlanStageBlockReason(project) : null;
  return <div className="cinematic-stage-content" data-testid={`cinematic-stage-${activeStage}`}>
    {activeStage === 'cast' && <CastStage mode={mode} onModeChange={onModeChange} project={project} onProjectChanged={onProjectChanged} onAddCastCharacter={onAddCastCharacter} onRemoveCastCharacter={onRemoveCastCharacter} />}
    {activeStage === 'story-plan' && <StoryPlanStage project={project} onProjectChanged={onProjectChanged} />}
    {activeStage === 'storyboard' && <StoryboardStage project={project} onProjectRefresh={onProjectRefresh} />}
    {activeStage === 'produce' && <ProduceStage project={project} onEditStoryboard={() => onOpenStage?.('storyboard')} onProjectRefresh={onProjectRefresh} />}
    {activeStage === 'finish' && <FinishStage project={project} onProjectChanged={onProjectChanged} />}
    <StageFooter activeStage={activeStage} onPrevious={onPrevious} onNext={onNext} nextDisabled={castBlocked || Boolean(storyPlanBlockReason)} storyPlanBlockReason={storyPlanBlockReason} />
  </div>;
}

function StageHeading({ stage, action }: { stage: CinematicStage; action?: ReactNode }) {
  const { t } = useTranslation('cinematic');
  return <header className={`cinematic-stage-heading${action ? ' cinematic-stage-heading--with-control' : ''}`}><div><p>{t(`cinematic.stage.${stage}.eyebrow`)}</p><h2>{t(`cinematic.stage.${stage}.title`)}</h2>{stage === 'cast' ? <small>{t('cinematic.stage.cast.description')}</small> : null}</div>{action || (!['cast', 'story-plan'].includes(stage) ? <span className="cinematic-prototype-badge">{t('cinematic.prototype.badge')}</span> : null)}</header>;
}

function CastStage({ mode, onModeChange, project, onProjectChanged, onAddCastCharacter, onRemoveCastCharacter }: { mode: 'simple' | 'advanced'; onModeChange?: (mode: 'simple' | 'advanced') => void; project?: CinematicProject; onProjectChanged?: (project: CinematicProject) => void; onAddCastCharacter?: Props['onAddCastCharacter']; onRemoveCastCharacter?: Props['onRemoveCastCharacter'] }) {
  const { t } = useTranslation('cinematic');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [replacementAssignmentId, setReplacementAssignmentId] = useState<string | null>(null);
  const [lookDialogOpen, setLookDialogOpen] = useState(false);
  const [lookDialogMode, setLookDialogMode] = useState<CharacterLookDialogMode>('upload');
  const [lookToPrepare, setLookToPrepare] = useState<CharacterLook | null>(null);
  const [characterLooks, setCharacterLooks] = useState<CharacterLook[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'direction' | 'wardrobe' | 'continuity'>('direction');
  const [dossierSaveState, setDossierSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'failed'>('idle');
  const [removingCharacter, setRemovingCharacter] = useState(false);
  const [retiringLookId, setRetiringLookId] = useState<string | null>(null);
  const [bindingLookId, setBindingLookId] = useState<string | null>(null);
  const [pendingBindLookId, setPendingBindLookId] = useState<string | null>(null);
  const dossierSaveTimer = useRef<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState(project?.castAssignments[0]?.id || 'mira');
  const selectedAssignment = project?.castAssignments.find(item => item.id === selectedCharacter);
  const selectedAssignmentUsage = selectedAssignment && project ? project.scenes.reduce((usage, scene) => {
    if (scene.castAssignmentIds.includes(selectedAssignment.id)) usage.sceneCount += 1;
    const lookIds = new Set(selectedAssignment.looks
      .map(look => stringField(look && typeof look === 'object' ? look as Record<string, unknown> : null, 'id'))
      .filter(Boolean));
    for (const shot of scene.shots) {
      if (shot.castAssignmentIds.includes(selectedAssignment.id)
        || shot.wardrobeLookIds.some(lookId => lookIds.has(lookId))) usage.shotCount += 1;
    }
    return usage;
  }, { sceneCount: 0, shotCount: 0 }) : { sceneCount: 0, shotCount: 0 };
  const selectedAssignmentInUse = selectedAssignmentUsage.sceneCount > 0 || selectedAssignmentUsage.shotCount > 0;
  const selectedCharacterProfileId = selectedAssignment?.characterProfileId;
  const selectedCharacterProfileVersionId = selectedAssignment?.characterProfileVersionId;
  const selectedRole = selectedAssignment?.storyImportance === 'protagonist' ? 'lead' : 'supporting';
  const selectedObjective = selectedAssignment?.objective
    || (selectedCharacter === 'mira' ? t('cinematic.cast.miraObjective') : t('cinematic.cast.noahObjective'));
  const selectedTraits = selectedAssignment?.personalityTraits.join(', ')
    || (selectedCharacter === 'mira' ? t('cinematic.cast.miraTraits') : t('cinematic.cast.noahTraits'));
  const selectedPerformance = selectedAssignment?.performanceDirection
    || (selectedCharacter === 'mira' ? t('cinematic.cast.miraPerformance') : t('cinematic.cast.noahPerformance'));
  const selectedBoundLook = selectedAssignment?.looks.find(isProductionReadyBoundLook);
  const selectedLookName = selectedBoundLook && 'name' in selectedBoundLook
    ? String(selectedBoundLook.name)
    : selectedAssignment ? t('cinematic.cast.characterWardrobe')
      : selectedCharacter === 'mira' ? t('cinematic.cast.lookArrival') : t('cinematic.cast.lookPlatform');
  const hasBoundLook = !project || Boolean(selectedBoundLook);
  const [castError, setCastError] = useState<string | null>(null);
  const roleSlots = project?.setup?.storyRoleSlots || [];
  const assignmentForRole = (role: (typeof roleSlots)[number]) => project?.castAssignments.find(assignment => (
    assignment.storyRoleSlotId === role.id
    || (!assignment.storyRoleSlotId && assignment.storyRole.trim().toLowerCase() === role.label.trim().toLowerCase())
  ));
  const isRoleAssigned = (role: (typeof roleSlots)[number]) => Boolean(assignmentForRole(role));
  const isRoleReady = (role: (typeof roleSlots)[number]) => {
    const assignment = assignmentForRole(role);
    return Boolean(assignment?.identityReady && assignment.looks.some(isProductionReadyBoundLook));
  };
  const nextUnfilledRole = roleSlots.find(role => !isRoleAssigned(role));
  const requiredRoleCount = roleSlots.filter(role => role.importance === 'required').length;
  const assignedRequiredRoleCount = roleSlots.filter(role => (
    role.importance === 'required' && isRoleAssigned(role)
  )).length;
  const preparedRequiredRoleCount = roleSlots.filter(role => (
    role.importance === 'required' && isRoleReady(role)
  )).length;
  const orderedRoleSlots = [...roleSlots].sort((left, right) => {
    const rank = (role: (typeof roleSlots)[number]) => {
      const assigned = Boolean(assignmentForRole(role));
      if (role.importance === 'required') return assigned ? 1 : 0;
      return assigned ? 3 : 2;
    };
    return rank(left) - rank(right);
  });
  const planningSource = project?.setup?.castPlanningMode === 'ai-recommended'
    ? t('cinematic.cast.recommendedRoles')
    : t('cinematic.cast.plannedRoles');
  const requiredCastAssigned = requiredRoleCount === assignedRequiredRoleCount;
  const requiredCastReady = requiredRoleCount === preparedRequiredRoleCount;
  const assignedRolesNeedingPreparation = assignedRequiredRoleCount - preparedRequiredRoleCount;
  useEffect(() => {
    if (!project?.castAssignments.length) return;
    if (!project.castAssignments.some(item => item.id === selectedCharacter)) {
      setSelectedCharacter(project.castAssignments[0]!.id);
    }
  }, [project?.castAssignments, selectedCharacter]);
  useEffect(() => () => {
    if (dossierSaveTimer.current != null) window.clearTimeout(dossierSaveTimer.current);
  }, []);
  useEffect(() => {
    if (!selectedCharacterProfileId || !selectedCharacterProfileVersionId) {
      setCharacterLooks([]);
      return;
    }
    let cancelled = false;
    listCharacterLooks(selectedCharacterProfileId, selectedCharacterProfileVersionId)
      .then(response => { if (!cancelled) setCharacterLooks(response.items); })
      .catch(() => { if (!cancelled) setCharacterLooks([]); });
    return () => { cancelled = true; };
  }, [selectedCharacterProfileId, selectedCharacterProfileVersionId]);
  async function addCharacter(character: CharacterCandidate) {
    if (!project || !character.characterProfileVersionId) {
      throw new Error(t('cinematic.status.saveFailed'));
    }
    setCastError(null);
    const replacementAssignment = replacementAssignmentId
      ? project.castAssignments.find(assignment => assignment.id === replacementAssignmentId)
      : undefined;
    const assignmentId = replacementAssignment?.id || `cinecast_${character.id}`;
    const plannedRole = roleSlots.find(role => role.id === pendingRoleId)
      || roleSlots.find(role => role.id === replacementAssignment?.storyRoleSlotId)
      || nextUnfilledRole;
    const storyImportance = replacementAssignment?.storyImportance
      || (project.castAssignments.length ? 'supporting' : 'protagonist');
    const roleDirection = replacementAssignment ? {
      objective: replacementAssignment.objective,
      personalityTraits: replacementAssignment.personalityTraits,
      emotionalBaseline: replacementAssignment.emotionalBaseline,
      performanceDirection: replacementAssignment.performanceDirection
    } : castDirectionFromRole(plannedRole);
    const input = {
      assignmentId,
      characterProfileId: character.id,
      characterProfileVersionId: character.characterProfileVersionId,
      displayName: character.displayName,
      storyImportance,
      storyRole: replacementAssignment?.storyRole || plannedRole?.label || (storyImportance === 'protagonist' ? 'Lead' : 'Supporting'),
      storyRoleSlotId: replacementAssignment?.storyRoleSlotId || plannedRole?.id || null,
      ...roleDirection
    } as const;
    try {
      const saved = onAddCastCharacter
        ? await onAddCastCharacter(input)
        : await upsertCinematicCast(project.id, assignmentId, { expectedVersion: project.version, ...input });
      setSelectedCharacter(assignmentId);
      setPendingRoleId(null);
      setReplacementAssignmentId(null);
      if (!onAddCastCharacter) onProjectChanged?.(saved);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
      throw error;
    }
  }
  async function removeSelectedCharacter() {
    if (!project || !selectedAssignment) return;
    setCastError(null);
    setRemovingCharacter(true);
    try {
      const saved = onRemoveCastCharacter
        ? await onRemoveCastCharacter(selectedAssignment.id)
        : await removeCinematicCast(project.id, selectedAssignment.id, project.version);
      const nextAssignment = saved.castAssignments.find(item => item.id !== selectedAssignment.id);
      setSelectedCharacter(nextAssignment?.id || '');
      if (!onRemoveCastCharacter) onProjectChanged?.(saved);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setRemovingCharacter(false);
    }
  }
  async function persistDossier(form: HTMLFormElement) {
    if (!project || !selectedAssignment) return;
    const values = new FormData(form);
    setCastError(null);
    setDossierSaveState('saving');
    try {
      const saved = await upsertCinematicCast(project.id, selectedAssignment.id, {
        expectedVersion: project.version,
        characterProfileId: selectedAssignment.characterProfileId,
        characterProfileVersionId: selectedAssignment.characterProfileVersionId,
        displayName: selectedAssignment.displayName,
        storyRoleSlotId: selectedAssignment.storyRoleSlotId,
        storyImportance: values.get('storyImportance') === 'lead' ? 'protagonist' : 'supporting',
        storyRole: selectedAssignment.storyRole,
        objective: String(values.get('objective') || ''),
        motivation: String(values.get('motivation') || ''),
        pressure: String(values.get('pressure') || ''),
        personalityTraits: String(values.get('personalityTraits') || '').split(',').map(value => value.trim()).filter(Boolean),
        emotionalBaseline: String(values.get('emotionalBaseline') || ''),
        dialogueStyle: String(values.get('dialogueStyle') || ''),
        performanceDirection: String(values.get('performanceDirection') || '')
      });
      onProjectChanged?.(saved);
      setDossierSaveState('saved');
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
      setDossierSaveState('failed');
    }
  }
  function saveDossier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dossierSaveTimer.current != null) window.clearTimeout(dossierSaveTimer.current);
    void persistDossier(event.currentTarget);
  }
  function scheduleDossierSave(event: FormEvent<HTMLFormElement>) {
    if (!project || !selectedAssignment) return;
    const form = event.currentTarget;
    setDossierSaveState('dirty');
    if (dossierSaveTimer.current != null) window.clearTimeout(dossierSaveTimer.current);
    dossierSaveTimer.current = window.setTimeout(() => {
      dossierSaveTimer.current = null;
      void persistDossier(form);
    }, 800);
  }
  async function bindCharacterLook(look: CharacterLook) {
    if (!project || !selectedAssignment || !look.approvedVersionId) return;
    const projectId = project.id;
    const assignmentId = selectedAssignment.id;
    setCastError(null);
    setBindingLookId(look.id);
    const bindToProject = (targetProject: CinematicProject) => upsertCinematicWardrobeLook(
      targetProject.id,
      assignmentId,
      `cinelook_${look.id}`,
      {
        expectedVersion: targetProject.version,
        name: look.name,
        mode: 'character_look',
        characterLookId: look.id,
        characterLookVersionId: look.approvedVersionId as string,
        coverage: 'multi_view',
        locked: true
      }
    );
    try {
      let saved;
      try {
        saved = await bindToProject(project);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'cinematic_version_conflict') throw error;
        const latest = await getCinematicProject(projectId);
        const latestAssignment = latest.castAssignments.find(item => item.id === assignmentId);
        if (!latestAssignment
          || latestAssignment.characterProfileId !== look.characterProfileId
          || latestAssignment.characterProfileVersionId !== look.sourceCharacterProfileVersionId) {
          throw new Error(t('cinematic.cast.lookBindContextChanged'));
        }
        onProjectChanged?.(latest);
        saved = await bindToProject(latest);
      }
      onProjectChanged?.(saved);
      setPendingBindLookId(null);
    } catch (error) {
      setPendingBindLookId(look.id);
      setCastError(t('cinematic.cast.lookApprovedBindFailed', {
        message: error instanceof Error ? error.message : t('cinematic.status.saveFailed')
      }));
    } finally {
      setBindingLookId(null);
    }
  }
  async function handleLookSaved(look: CharacterLook) {
    setCharacterLooks(current => [look, ...current.filter(item => item.id !== look.id)]);
    if (look.approvedVersionId) await bindCharacterLook(look);
    setLookToPrepare(null);
  }
  async function removeLookPreparation(look: CharacterLook) {
    if (!selectedAssignment || !canDiscardLookPreparation(look)) return;
    setCastError(null);
    setRetiringLookId(look.id);
    try {
      await retireCharacterLook(selectedAssignment.characterProfileId, look.id);
      setCharacterLooks(current => current.filter(item => item.id !== look.id));
      if (lookToPrepare?.id === look.id) setLookToPrepare(null);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.cast.removeLookFailed'));
    } finally {
      setRetiringLookId(null);
    }
  }
  return <>
    <StageHeading
      stage="cast"
      action={<CinematicControlLevel mode={mode} label={t('cinematic.mode.control')} helpText={t(`cinematic.mode.${mode}Hint`)} onChange={item => onModeChange?.(item)} />}
    />
    {roleSlots.length ? <section className="cinematic-role-readiness" aria-labelledby="cinematic-role-readiness-title">
      <header>
        <div><h3 id="cinematic-role-readiness-title">{planningSource}</h3><p>{t('cinematic.cast.rolePlanSummary', { count: roleSlots.length, source: t(`cinematic.castPlanningMode.${project?.setup?.castPlanningMode || 'manual'}`) })}</p></div>
        <div className="cinematic-role-readiness__progress"><strong>{assignedRequiredRoleCount} {t('cinematic.cast.of')} {requiredRoleCount} {t('cinematic.cast.requiredAssigned')}</strong><span aria-hidden="true"><i style={{ width: `${requiredRoleCount ? (assignedRequiredRoleCount / requiredRoleCount) * 100 : 100}%` }} /></span><b className={requiredCastReady ? 'is-ready' : ''}>{requiredCastReady
          ? t('cinematic.cast.requiredCastReady')
          : requiredCastAssigned
            ? t('cinematic.cast.rolesNeedPreparation', { count: assignedRolesNeedingPreparation })
            : t('cinematic.cast.rolesNeedCharacter', { count: requiredRoleCount - assignedRequiredRoleCount })}</b></div>
      </header>
      <div className="cinematic-role-readiness__list">
        {orderedRoleSlots.map(role => {
          const assignment = assignmentForRole(role);
          const identityReady = Boolean(assignment?.identityReady);
          const lookReady = Boolean(assignment?.looks.some(isProductionReadyBoundLook));
          const assignmentReady = identityReady && lookReady;
          return <article key={role.id} className={assignment ? (assignmentReady ? 'is-assigned' : 'is-needs-preparation') : 'is-unassigned'}>
            <CharacterPortrait portraitUrl={cinematicCastPortraitUrl(assignment)} tone="cyan" />
            <div><span>{role.label} <small>{t(`cinematic.roleImportance.${role.importance}`)}</small></span><strong>{assignment?.displayName || t('cinematic.cast.needsCharacter')}</strong><p>{assignment && !identityReady ? t('cinematic.cast.needsPreparation') : assignment && !lookReady ? t('cinematic.cast.lookPreparationRequired') : (role.storyFunction || t('cinematic.cast.roleFunctionMissing'))}</p></div>
            <Button size="sm" variant={assignment ? 'ghost' : 'primary'} onClick={() => { setPendingRoleId(role.id); setReplacementAssignmentId(assignment?.id || null); setPickerOpen(true); }}>{assignment ? t('cinematic.cast.changeCharacter') : t('cinematic.cast.chooseForRole')}</Button>
          </article>;
        })}
      </div>
    </section> : <p className="cinematic-cast-plan-notice">{t('cinematic.cast.noRolePlan')}</p>}
    <div className="cinematic-character-workspace">
      <section className="cinematic-work-panel cinematic-project-cast-panel">
        <SectionHeading title={t('cinematic.cast.projectCast')} hint={t('cinematic.cast.castSummaryHint')} action={<Button size="sm" icon={<Plus aria-hidden="true" />} disabled={Boolean(roleSlots.length) && !nextUnfilledRole} title={Boolean(roleSlots.length) && !nextUnfilledRole ? t('cinematic.cast.allRolesAssigned') : undefined} onClick={() => { setPendingRoleId(nextUnfilledRole?.id || null); setReplacementAssignmentId(null); setPickerOpen(true); }}>{t('cinematic.cast.addCharacter')}</Button>} />
        <div className="cinematic-project-cast-summary" aria-label={t('cinematic.cast.castSummary')}>
          <span><strong>{project?.castAssignments.length || 0}</strong><small>{t('cinematic.cast.charactersInProject')}</small></span>
          <span><strong>{roleSlots.length}</strong><small>{t('cinematic.cast.plannedRoles')}</small></span>
        </div>
        <div className="cinematic-character-dossier-list">
          {orderedRoleSlots.map(role => {
            const assignment = assignmentForRole(role);
            return assignment
              ? <CastCard key={role.id} active={selectedCharacter === assignment.id} onSelect={() => setSelectedCharacter(assignment.id)} role={role.label} required={role.importance === 'required'} name={assignment.displayName} portraitUrl={cinematicCastPortraitUrl(assignment)} identityReady={assignment.identityReady} lookReady={assignment.looks.some(isProductionReadyBoundLook)} personality={assignment.personalityTraits.join(' / ') || assignment.objective || t('cinematic.cast.identityReady')} look={assignment.looks.length ? String((assignment.looks[0] as { name?: string })?.name || t('cinematic.cast.characterWardrobe')) : t('cinematic.cast.characterWardrobe')} scenes={project?.scenes.length ? String(project.scenes.length) : null} tone="cyan" />
              : <button key={role.id} type="button" className="cinematic-unassigned-cast-card" onClick={() => { setPendingRoleId(role.id); setReplacementAssignmentId(null); setPickerOpen(true); }}><CharacterPortrait tone="cyan" /><span><strong>{role.label}</strong><small>{t(`cinematic.roleImportance.${role.importance}`)}</small><b>{t('cinematic.cast.noCharacterAssigned')}</b><em>{role.storyFunction}</em></span></button>;
          })}
          {!roleSlots.length && project?.castAssignments.map(assignment => <CastCard key={assignment.id} active={selectedCharacter === assignment.id} onSelect={() => setSelectedCharacter(assignment.id)} role={assignment.storyRole} required={assignment.storyImportance === 'protagonist'} name={assignment.displayName} portraitUrl={cinematicCastPortraitUrl(assignment)} identityReady={assignment.identityReady} lookReady={assignment.looks.some(isProductionReadyBoundLook)} personality={assignment.personalityTraits.join(' / ') || assignment.objective || t('cinematic.cast.identityReady')} look={assignment.looks.length ? t('cinematic.cast.lookArrival') : t('cinematic.cast.characterWardrobe')} scenes={project?.scenes.length ? String(project.scenes.length) : null} tone="cyan" />)}
          {!project ? <><CastCard active={selectedCharacter === 'mira'} onSelect={() => setSelectedCharacter('mira')} role={t('cinematic.cast.lead')} name="Mira Chen" personality={t('cinematic.cast.miraTraits')} look={t('cinematic.cast.lookArrival')} scenes="3" tone="cyan" /><CastCard active={selectedCharacter === 'noah'} onSelect={() => setSelectedCharacter('noah')} role={t('cinematic.cast.supporting')} name="Noah Lin" personality={t('cinematic.cast.noahTraits')} look={t('cinematic.cast.lookPlatform')} scenes="2" tone="amber" /></> : null}
        </div>
      </section>
      {(!project || selectedAssignment) ? <aside key={selectedCharacter} className="cinematic-character-dossier">
        <header className="cinematic-dossier-header"><div className="cinematic-dossier-header__selection"><Link2 aria-hidden="true" /><span>{t('cinematic.cast.selectedFromProjectCast')}</span></div><div><span>{selectedAssignment?.storyRole || t('cinematic.cast.selectedCharacter')}</span><h3>{selectedAssignment?.displayName || (selectedCharacter === 'mira' ? 'Mira Chen' : 'Noah Lin')}</h3><p className={selectedAssignment && !selectedAssignment.identityReady ? 'is-needs-preparation' : ''}>{selectedAssignment && !selectedAssignment.identityReady ? <Clock3 aria-hidden="true" /> : <Check aria-hidden="true" />}{t(selectedAssignment && !selectedAssignment.identityReady ? 'cinematic.cast.needsPreparation' : 'cinematic.cast.identityReady')}</p><small>{selectedAssignment?.characterProfileVersionId ? t('cinematic.cast.profileVersionPinned') : t('cinematic.cast.projectOnlyChanges')}</small></div><div className="cinematic-dossier-header__status"><strong className={`is-${dossierSaveState}`}>{t(`cinematic.save.${dossierSaveState}`)}</strong><small>{t('cinematic.cast.projectOnlyChanges')}</small>{selectedAssignment ? <><Button size="sm" variant="secondary" onClick={() => { setPendingRoleId(selectedAssignment.storyRoleSlotId || null); setReplacementAssignmentId(selectedAssignment.id); setPickerOpen(true); }}>{t('cinematic.cast.changeCharacter')}</Button>{selectedAssignmentInUse ? <><Button size="sm" variant="ghost" icon={<Trash2 aria-hidden="true" />} disabled title={t('cinematic.cast.assignmentInUse', selectedAssignmentUsage)}>{t('cinematic.cast.removeAssignment')}</Button><small className="is-warning">{t('cinematic.cast.assignmentInUse', selectedAssignmentUsage)}</small></> : <ConfirmDialog trigger={<Button size="sm" variant="ghost" icon={<Trash2 aria-hidden="true" />} disabled={removingCharacter}>{t('cinematic.cast.removeAssignment')}</Button>} title={t('cinematic.cast.removeTitle')} description={t('cinematic.cast.removeDescription', { name: selectedAssignment.displayName })} confirmLabel={t('cinematic.cast.removeConfirm')} destructive pending={removingCharacter} onConfirm={() => void removeSelectedCharacter()} />}</> : null}</div></header>
        <div className="cinematic-character-tabs" role="tablist" aria-label={t('cinematic.cast.characterDetails')}>
          {(['direction', 'wardrobe', 'continuity'] as const).map(tab => <button key={tab} type="button" role="tab" aria-selected={activeDetailTab === tab} className={activeDetailTab === tab ? 'is-active' : ''} onClick={() => setActiveDetailTab(tab)}>{t(`cinematic.cast.tab.${tab}`)}</button>)}
        </div>
        {activeDetailTab === 'direction' ? <form onSubmit={saveDossier} onChange={scheduleDossierSave}>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.rolePersonality')} hint={t('cinematic.cast.rolePersonalityHint')} /><div className="cinematic-dossier-fields"><label><span>{t('cinematic.cast.storyRole')}</span><input readOnly value={selectedAssignment?.storyRole || (selectedRole === 'lead' ? t('cinematic.cast.lead') : t('cinematic.cast.supporting'))} /><input type="hidden" name="storyImportance" value={selectedRole} /></label><label><span>{t('cinematic.cast.emotionalBaseline')}</span><select name="emotionalBaseline" defaultValue={selectedAssignment?.emotionalBaseline || 'guarded'}><option value="guarded">{t('cinematic.cast.guarded')}</option><option value="open">{t('cinematic.cast.open')}</option></select></label><label className="is-wide"><span>{t('cinematic.cast.objective')}</span><textarea name="objective" rows={2} defaultValue={selectedObjective} /></label><label className="is-wide"><span>{t('cinematic.cast.personality')}</span><input name="personalityTraits" defaultValue={selectedTraits} /></label>{mode === 'advanced' && <><label className="is-wide"><span>{t('cinematic.cast.motivation')}</span><textarea name="motivation" rows={2} defaultValue={selectedAssignment?.motivation || ''} /></label><label className="is-wide"><span>{t('cinematic.cast.pressure')}</span><textarea name="pressure" rows={2} defaultValue={selectedAssignment?.pressure || t('cinematic.cast.pressureValue')} /></label><label className="is-wide"><span>{t('cinematic.cast.dialogueStyle')}</span><input name="dialogueStyle" defaultValue={selectedAssignment?.dialogueStyle || t('cinematic.cast.dialogueStyleValue')} /></label></>}</div></section>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.performanceDirection')} hint={t('cinematic.cast.performanceDirectionHint')} /><textarea name="performanceDirection" rows={3} defaultValue={selectedPerformance} />{dossierSaveState === 'failed' ? <Button type="submit" size="sm" disabled={!selectedAssignment}>{t('cinematic.cast.saveDossier')}</Button> : null}</section>
        </form> : null}
        {activeDetailTab === 'wardrobe' ? <section className="cinematic-dossier-section">
          <SectionHeading title={t('cinematic.cast.wardrobeLooks')} hint={t('cinematic.cast.wardrobeOwnedHint')} />
          <ol className="cinematic-look-readiness" aria-label={t('cinematic.cast.lookReadiness')}>
            <li className={characterLooks.length || hasBoundLook ? 'is-complete' : 'is-current'}><span>1</span><div><strong>{t('cinematic.cast.lookStepSource')}</strong><small>{t('cinematic.cast.lookStepSourceHint')}</small></div></li>
            <li className={hasBoundLook ? 'is-complete' : characterLooks.length ? 'is-current' : ''}><span>2</span><div><strong>{t('cinematic.cast.lookStepPrepare')}</strong><small>{t('cinematic.cast.lookStepPrepareHint')}</small></div></li>
            <li className={hasBoundLook ? 'is-complete' : ''}><span>3</span><div><strong>{t('cinematic.cast.lookStepReview')}</strong><small>{t('cinematic.cast.lookStepReviewHint')}</small></div></li>
            <li className={hasBoundLook ? 'is-complete' : ''}><span>4</span><div><strong>{t('cinematic.cast.lookStepBind')}</strong><small>{t('cinematic.cast.lookStepBindHint')}</small></div></li>
          </ol>
          <fieldset className="cinematic-look-source-actions">
            <legend><span>{t('cinematic.cast.startNewLook')}</span><strong>{t('cinematic.cast.chooseLookSource')}</strong><small>{t('cinematic.cast.chooseLookSourceHint')}</small></legend>
            <div>
              <button type="button" disabled={!selectedAssignment} onClick={() => { setLookToPrepare(null); setLookDialogMode('upload'); setLookDialogOpen(true); }}><span><Upload aria-hidden="true" /></span><span><strong>{t('cinematic.cast.uploadWardrobe')}</strong><small>{t('cinematic.cast.uploadForCharacter')}</small></span><ArrowRight aria-hidden="true" /></button>
              <button type="button" disabled={!selectedAssignment} onClick={() => { setLookToPrepare(null); setLookDialogMode('ai'); setLookDialogOpen(true); }}><span><Sparkles aria-hidden="true" /></span><span><strong>{t('cinematic.cast.aiWardrobe')}</strong><small>{t('cinematic.cast.aiWardrobeHint')}</small></span><ArrowRight aria-hidden="true" /></button>
            </div>
          </fieldset>
          <div className="cinematic-look-library" aria-label={t('cinematic.cast.currentLooks')}>
            <header><div><span>{t('cinematic.cast.currentLooks')}</span><strong>{t('cinematic.cast.currentLooksHint')}</strong></div></header>
            {characterLooks.length ? characterLooks.map(look => {
              const version = activeCharacterLookVersion(look);
              const bound = selectedAssignment?.looks.some(item => isBoundCharacterLook(item, look)) || false;
              const approvedUnbound = Boolean(look.approvedVersionId && !bound);
              const bindFailed = pendingBindLookId === look.id;
              return <article className={`cinematic-look-card${bindFailed ? ' is-bind-pending' : ''}`} key={look.id}>
                <div className="cinematic-look-card__preview"><AuthenticatedMediaImage src={version?.reviewMediaUrl} alt={t('cinematic.lookDraft.reviewPreviewAlt', { name: look.name })} fallback={<Shirt aria-hidden="true" />} /></div>
                <div><span>{t('cinematic.cast.characterLook')}</span><h4>{look.name}</h4><p>{approvedUnbound ? t('cinematic.cast.approvedNotBound') : t(`cinematic.lookStatus.${look.lifecycleStatus}`)}</p></div>
                <div className="cinematic-look-card__actions"><Button size="sm" variant={look.approvedVersionId ? (approvedUnbound ? 'primary' : 'secondary') : 'primary'} disabled={bindingLookId === look.id} onClick={() => look.approvedVersionId ? void bindCharacterLook(look) : (setLookToPrepare(look), setLookDialogOpen(true))}>{bindingLookId === look.id ? t('cinematic.cast.bindingLook') : look.approvedVersionId ? t(bindFailed ? 'cinematic.cast.retryUseLook' : 'cinematic.cast.useLook') : t('cinematic.cast.prepareLook')}</Button>{canDiscardLookPreparation(look) ? <ConfirmDialog trigger={<Button size="sm" variant="ghost" icon={<Trash2 aria-hidden="true" />} disabled={retiringLookId === look.id}>{t('cinematic.cast.removeLookPreparation')}</Button>} title={t('cinematic.cast.removeLookTitle')} description={t('cinematic.cast.removeLookDescription', { name: look.name })} confirmLabel={t('cinematic.cast.removeLookConfirm')} destructive pending={retiringLookId === look.id} onConfirm={() => void removeLookPreparation(look)} /> : null}</div>
              </article>;
            }) : <p className="cinematic-look-library__empty">{t('cinematic.cast.noLookCandidates')}</p>}
          </div>
          <div className="cinematic-look-bound" aria-label={t('cinematic.cast.lookUsedInFilm')}>
            <header><span>{t('cinematic.cast.lookUsedInFilm')}</span><strong>{t('cinematic.cast.lookUsedInFilmHint')}</strong></header>
            <article className="cinematic-look-card"><div className="cinematic-look-card__preview"><Shirt aria-hidden="true" /></div><div><span>{t('cinematic.cast.boundLook')}</span><h4>{hasBoundLook ? selectedLookName : t('cinematic.cast.noPrimaryLook')}</h4><p>{hasBoundLook ? t('cinematic.cast.sceneScope') : t('cinematic.cast.chooseLookHint')}</p></div><span className={`cinematic-status-pill${hasBoundLook ? ' is-ready' : ''}`}>{hasBoundLook ? t('cinematic.cast.locked') : t('cinematic.cast.lookNotReady')}</span></article>
          </div>
        </section> : null}
        {activeDetailTab === 'continuity' ? <section className="cinematic-dossier-section cinematic-continuity-panel"><SectionHeading title={t('cinematic.cast.continuity')} hint={t('cinematic.cast.continuityHint')} /><ul><li className="is-ready"><Check aria-hidden="true" />{t('cinematic.cast.identityVersionReady')}</li><li className="is-ready"><Check aria-hidden="true" />{t('cinematic.cast.faceAuthorityReady')}</li><li className="is-ready"><Check aria-hidden="true" />{t('cinematic.cast.reuseRightsReady')}</li><li className={hasBoundLook ? 'is-ready' : ''}>{hasBoundLook ? <Check aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{t(hasBoundLook ? 'cinematic.cast.lookBound' : 'cinematic.cast.lookPreparationRequired')}</li><li><Clock3 aria-hidden="true" />{project?.scenes.length ? t('cinematic.cast.sceneContinuityReady') : t('cinematic.cast.scenesNotPlanned')}</li></ul><label className="cinematic-check-row"><input type="checkbox" defaultChecked />{t('cinematic.cast.lockWardrobe')}</label>{mode === 'advanced' && <label className="cinematic-check-row"><input type="checkbox" disabled={!project?.scenes.length} />{t('cinematic.cast.allowSceneChanges')}</label>}</section> : null}
      </aside> : <aside className="cinematic-character-dossier cinematic-character-dossier--empty"><UserRound aria-hidden="true" /><h3>{t('cinematic.cast.addCharacter')}</h3><p>{t('cinematic.cast.charactersHint')}</p></aside>}
    </div>
    {castError ? <p role="alert" className="text-sm text-red-400">{castError}</p> : null}
    <CharacterPickerDialog open={pickerOpen} onOpenChange={open => { setPickerOpen(open); if (!open) { setPendingRoleId(null); setReplacementAssignmentId(null); } }} onSelect={addCharacter} />
    {selectedAssignment ? <CharacterLookDialog open={lookDialogOpen} onOpenChange={open => { setLookDialogOpen(open); if (!open) setLookToPrepare(null); }} initialMode={lookDialogMode} lookToPrepare={lookToPrepare} characterProfileId={selectedAssignment.characterProfileId} characterProfileVersionId={selectedAssignment.characterProfileVersionId} characterDisplayName={selectedAssignment.displayName} requestAiSuggestion={project ? () => suggestCinematicWardrobe(project.id, selectedAssignment.id) : undefined} onSaved={look => void handleLookSaved(look)} /> : null}
  </>;
}

function canDiscardLookPreparation(look: CharacterLook) {
  return !look.approvedVersionId
    && !look.versions.some(version => ['approved', 'superseded'].includes(version.status));
}

export function castDirectionFromRole(role?: CinematicProject['setup']['storyRoleSlots'][number]) {
  return {
    objective: role?.objective || '',
    personalityTraits: role?.personalityTraits || [],
    emotionalBaseline: role?.emotionalArc || '',
    performanceDirection: role?.performanceDirection || ''
  };
}

function CastCard({ role, required = false, name, portraitUrl, identityReady = true, lookReady = true, personality, look, scenes, tone, active, onSelect }: { role: string; required?: boolean; name: string; portraitUrl?: string | null; identityReady?: boolean; lookReady?: boolean; personality: string; look: string; scenes: string | null; tone: 'cyan' | 'amber'; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('cinematic');
  const ready = identityReady && lookReady;
  const statusKey = !identityReady ? 'cinematic.cast.needsPreparation' : !lookReady ? 'cinematic.cast.lookPreparationRequired' : 'cinematic.cast.identityReady';
  return <button type="button" className={`cinematic-cast-card${active ? ' is-active' : ''}${ready ? '' : ' is-needs-preparation'}`} onClick={onSelect}><CharacterPortrait portraitUrl={portraitUrl} tone={tone} /><div className="cinematic-cast-card__body"><span>{role}{required ? <b>{t('cinematic.roleImportance.required')}</b> : null}</span><h4>{name}</h4><small>{personality}</small><p>{ready ? <Check aria-hidden="true" /> : <Clock3 aria-hidden="true" />} {t(statusKey)}</p><div className="cinematic-card-facts"><span>{look}</span><span>{scenes ? `${scenes} ${t('cinematic.cast.scenes')}` : t('cinematic.cast.scenesNotPlanned')}</span></div></div></button>;
}

function CharacterPortrait({ portraitUrl, tone }: { portraitUrl?: string | null; tone: 'cyan' | 'amber' }) {
  const fallback = <span className="cinematic-cast-card__portrait-fallback"><UserRound aria-hidden="true" /></span>;
  return <span className={`cinematic-cast-card__portrait is-${tone}`}>{portraitUrl ? <AuthenticatedMediaImage src={portraitUrl} alt="" fallback={fallback} /> : fallback}</span>;
}

export function cinematicCastPortraitUrl(assignment: Pick<CinematicProject['castAssignments'][number], 'characterProfileId' | 'portraitUrl'> | null | undefined) {
  if (!assignment) return null;
  const profileId = String(assignment.characterProfileId || '').trim();
  return profileId
    ? `/api/community/character-profiles/${encodeURIComponent(profileId)}/featured-image`
    : assignment.portraitUrl || null;
}

function StoryPlanStage({ project, onProjectChanged }: { project?: CinematicProject; onProjectChanged?: (project: CinematicProject) => void }) {
  const { t } = useTranslation('cinematic');
  const [beatOpen, setBeatOpen] = useState(false);
  const [directorOpen, setDirectorOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [sceneProposalOpen, setSceneProposalOpen] = useState(false);
  const [proposal, setProposal] = useState<CinematicStoryPlanProposal | null>(null);
  const [sceneProposal, setSceneProposal] = useState<CinematicSceneDirectionProposal | null>(null);
  const [selectedBeatId, setSelectedBeatId] = useState('');
  const [selectedSceneId, setSelectedSceneId] = useState(project?.scenes[0]?.id || '');
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const [generating, setGenerating] = useState(false);
  const [applyingProposal, setApplyingProposal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latestVersion = project?.storyPlanVersions.at(-1);
  const activeVersion = latestVersion?.status === 'draft'
    ? latestVersion
    : project?.storyPlanVersions.find(version => version.id === project.activeStoryPlanVersionId) || latestVersion;
  const legacyRecoveryRequired = useMemo(
    () => needsStoryPlanRecovery(project, activeVersion),
    [activeVersion?.id, project?.id, project?.version]
  );
  const initialPlan = useMemo(() => createStoryPlanDraft(project, activeVersion, t), [activeVersion?.id, project?.id, project?.version, t]);
  const [draft, setDraft] = useState<CinematicStoryPlanDraft>(initialPlan);
  useEffect(() => {
    setDraft(initialPlan);
    setSelectedBeatId(current => initialPlan.beats.some(beat => beat.id === current) ? current : initialPlan.beats[0]?.id || '');
    setSelectedSceneId(current => initialPlan.scenes.some(scene => scene.id === current) ? current : initialPlan.scenes[0]?.id || '');
    setSaveState(legacyRecoveryRequired ? 'dirty' : 'idle');
  }, [initialPlan, legacyRecoveryRequired]);
  const selectedBeat = draft.beats.find(beat => beat.id === selectedBeatId) || draft.beats[0] || null;
  const selectedScene = draft.scenes.find(scene => scene.id === selectedSceneId) || draft.scenes[0] || null;
  const sceneCount = draft.scenes.length;
  const shotCount = draft.scenes.reduce((total, scene) => total + scene.shots.length, 0);
  const runtimeSeconds = draft.scenes.reduce((total, scene) => total + scene.durationMs, 0) / 1000;
  const scriptPreview = useMemo(() => buildDraftFilmScriptPreview(draft), [draft]);
  const requiredRoles = project?.setup.storyRoleSlots.filter(role => role.importance === 'required') || [];
  const assignedRoleIds = new Set(project?.castAssignments.filter(item => item.active !== false).map(item => item.storyRoleSlotId).filter(Boolean));
  const missingRequiredRoles = requiredRoles.filter(role => !assignedRoleIds.has(role.id));
  const sourceStale = Boolean(project && activeVersion && (
    activeVersion.status === 'source_changed'
    || activeVersion.storySourceVersionId !== project.activeStorySourceVersionId
  ));
  const emptyBeats = draft.beats.filter(beat => !draft.scenes.some(scene => scene.beatId === beat.id));
  const emptyScenes = draft.scenes.filter(scene => !scene.shots.length);
  const incompleteBeats = draft.beats.filter(beat => !beat.title.trim() || !beat.purpose.trim() || !beat.storyChange.trim());
  const incompleteScenes = draft.scenes.filter(scene => !scene.title.trim() || !scene.purpose.trim() || !scene.storyChange.trim());
  const incompleteShots = draft.scenes.flatMap(scene => scene.shots.filter(shot => !shot.title.trim() || !shot.purpose.trim()));
  const filmContractRequired = Boolean(activeVersion && activeVersion.contractVersion !== 'story-plan-v3' && draft.directorOperation !== 'manual');
  const missingFilmBeats = draft.directorOperation === 'manual' || activeVersion?.contractVersion === 'story-plan-v3'
    ? draft.beats.filter(beat => !beat.cause?.trim() || !beat.consequence?.trim())
    : [];
  const missingFilmScenes = draft.directorOperation === 'manual' || activeVersion?.contractVersion === 'story-plan-v3'
    ? draft.scenes.filter(scene => !scene.entryState?.trim() || !scene.exitState?.trim())
    : [];
  const missingFilmShots = draft.directorOperation === 'manual' || activeVersion?.contractVersion === 'story-plan-v3'
    ? draft.scenes.flatMap(scene => scene.shots.filter(shot => (
      !shot.visibleMoment?.trim() || !shot.subjectAction?.trim() || !shot.emotionalTarget?.trim()
      || !shot.continuityEntry?.trim() || !shot.continuityExit?.trim()
    )))
    : [];
  const openScene = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setDirectorOpen(true);
  };
  const validationIssues: Array<{ id: string; label: string; onAction?: () => void }> = [
    ...(legacyRecoveryRequired ? [{ id: 'legacy-recovery', label: t('cinematic.story.legacyRecoveryRequired'), onAction: () => openBeat(emptyBeats[0]?.id || draft.beats[0]?.id || '') }] : []),
    ...(sourceStale ? [{ id: 'source-stale', label: t('cinematic.story.sourceStale') }] : []),
    ...(missingRequiredRoles.length ? [{ id: 'cast-incomplete', label: t('cinematic.story.castIncomplete', { count: missingRequiredRoles.length }) }] : []),
    ...(filmContractRequired ? [{ id: 'film-contract', label: t('cinematic.story.filmReviewRequired'), onAction: () => void generatePlan('review_current') }] : []),
    ...(!draft.beats.length ? [{ id: 'beats-required', label: t('cinematic.story.beatsRequired'), onAction: startManualPlan }] : []),
    ...(!draft.scenes.length ? [{ id: 'scenes-required', label: t('cinematic.story.scenesRequired'), onAction: () => openBeat(draft.beats[0]?.id || '') }] : []),
    ...emptyBeats.map(beat => ({ id: `beat-scene-${beat.id}`, label: t('cinematic.story.beatSceneRequired', { name: beat.title }), onAction: () => openBeat(beat.id) })),
    ...emptyScenes.map(scene => ({ id: `scene-shot-${scene.id}`, label: t('cinematic.story.sceneShotRequired', { name: scene.title }), onAction: () => openScene(scene.id) })),
    ...incompleteBeats.map(beat => ({ id: `beat-details-${beat.id}`, label: t('cinematic.story.beatDetailsIncomplete', { name: beat.title }), onAction: () => openBeat(beat.id) })),
    ...incompleteScenes.map(scene => ({ id: `scene-details-${scene.id}`, label: t('cinematic.story.sceneDetailsIncomplete', { name: scene.title }), onAction: () => openScene(scene.id) })),
    ...incompleteShots.map(shot => {
      const scene = draft.scenes.find(item => item.shots.some(candidate => candidate.id === shot.id));
      return { id: `shot-details-${shot.id}`, label: t('cinematic.story.shotDetailsIncomplete', { name: shot.title }), onAction: scene ? () => openScene(scene.id) : undefined };
    }),
    ...missingFilmBeats.map(beat => ({ id: `film-beat-${beat.id}`, label: t('cinematic.story.filmBeatIncomplete', { name: beat.title }), onAction: () => openBeat(beat.id) })),
    ...missingFilmScenes.map(scene => ({ id: `film-scene-${scene.id}`, label: t('cinematic.story.filmSceneIncomplete', { name: scene.title }), onAction: () => openScene(scene.id) })),
    ...missingFilmShots.map(shot => {
      const scene = draft.scenes.find(item => item.shots.some(candidate => candidate.id === shot.id));
      return { id: `film-shot-${shot.id}`, label: t('cinematic.story.filmShotIncomplete', { name: shot.title }), onAction: scene ? () => openScene(scene.id) : undefined };
    }),
    ...(Math.abs(runtimeSeconds - (project?.durationTargetMs || runtimeSeconds * 1000) / 1000) > 1 ? [{ id: 'duration-mismatch', label: t('cinematic.story.durationMismatch'), onAction: selectedScene ? () => openScene(selectedScene.id) : undefined }] : [])
  ];
  async function persistPlan(nextDraft: CinematicStoryPlanDraft, approved: boolean) {
    if (!project || !nextDraft.scenes.length) return null;
    setSaveState('saving');
    setSaveError(null);
    try {
      const saved = await saveCinematicStoryPlan(project.id, {
        contractVersion: 'story-plan-v3', expectedVersion: project.version,
        parentVersionId: latestVersion?.id || project.activeStoryPlanVersionId,
        ...nextDraft, approved, warningsAcknowledged: approved, source: nextDraft.source
      });
      onProjectChanged?.(saved);
      setSaveState('saved');
      return saved;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
      setSaveState('dirty');
      return null;
    }
  }
  async function savePlan(approved: boolean) {
    await persistPlan(draft, approved);
  }
  async function generatePlan(mode: 'generate' | 'review_current' = 'generate', sourceResolution: 'story_brief' | 'creative_direction' | null = null) {
    if (!project) return;
    setProposal(null);
    setProposalOpen(true);
    setGenerating(true);
    setSaveError(null);
    try {
      const next = await generateCinematicStoryPlan(project.id, { mode, sourceResolution });
      setProposal(next);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('cinematic.story.generateFailed'));
    } finally {
      setGenerating(false);
    }
  }
  async function generateScene(sceneId: string, direction: string) {
    if (!project) return;
    setGenerating(true);
    setSaveError(null);
    try {
      const next = await generateCinematicSceneDirection(project.id, sceneId, { expectedVersion: project.version, direction });
      setSceneProposal(next);
      setSceneProposalOpen(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('cinematic.director.generateFailed'));
    } finally {
      setGenerating(false);
    }
  }
  async function applyPlanProposal(next: CinematicStoryPlanProposal) {
    if (!next.plan) return;
    setApplyingProposal(true);
    const saved = await persistPlan(next.plan, false);
    if (saved) {
      const savedDraft = createStoryPlanDraft(saved, saved.storyPlanVersions.at(-1), t);
      setDraft(savedDraft);
      setSelectedBeatId(savedDraft.beats[0]?.id || '');
      setSelectedSceneId(savedDraft.scenes[0]?.id || '');
      setProposalOpen(false);
    }
    setApplyingProposal(false);
  }
  async function applySceneProposal(next: CinematicSceneDirectionProposal) {
    const nextDraft = reconcileDraftLinks({
      ...draft,
      source: 'generated',
      warnings: [...new Set([...draft.warnings, ...next.warnings])],
      scenes: draft.scenes.map(scene => scene.id === next.sceneId ? next.scene : scene)
    });
    setApplyingProposal(true);
    const saved = await persistPlan(nextDraft, false);
    if (saved) {
      const savedDraft = createStoryPlanDraft(saved, saved.storyPlanVersions.at(-1), t);
      setDraft(savedDraft);
      setSelectedSceneId(next.sceneId);
      setSceneProposalOpen(false);
      setDirectorOpen(false);
    }
    setApplyingProposal(false);
  }
  function updateScene(next: CinematicScene) {
    setDraft(current => reconcileDraftLinks({ ...current, scenes: current.scenes.map(scene => scene.id === next.id ? next : scene) }));
    setSaveState('dirty');
    setDirectorOpen(false);
  }
  function openBeat(beatId: string) {
    setSelectedBeatId(beatId);
    setBeatOpen(true);
  }
  function updateBeat(next: CinematicStoryBeat) {
    setDraft(current => reconcileDraftLinks({
      ...current,
      scenes: current.scenes,
      beats: current.beats.map(beat => beat.id === next.id ? { ...next, sceneIds: beat.sceneIds, targetDurationMs: beat.targetDurationMs } : beat)
    }));
    setSaveState('dirty');
    setBeatOpen(false);
  }
  function addBeat() {
    const id = createDraftId('manual-beat');
    const nextBeat: CinematicStoryBeat = {
      id, orderKey: draft.beats.length + 1, type: 'development',
      title: t('cinematic.story.newBeatTitle', { count: draft.beats.length + 1 }),
      purpose: '', storyChange: '', cause: '', consequence: '', emotionalStart: '', emotionalTurn: '',
      emotionalEnd: '', requiredElements: [], targetDurationMs: 0, sceneIds: []
    };
    setDraft(current => ({ ...current, beats: [...current.beats, nextBeat] }));
    setSelectedBeatId(id);
    setSaveState('dirty');
    setBeatOpen(true);
  }
  function moveBeat(beatId: string, direction: 'earlier' | 'later') {
    setDraft(current => reconcileDraftLinks({
      ...current,
      beats: moveRecord(current.beats, beatId, direction).map((beat, index) => ({ ...beat, orderKey: index + 1 }))
    }));
    setSaveState('dirty');
  }
  function removeBeat(beatId: string) {
    setDraft(current => ({ ...current, beats: current.beats.filter(beat => beat.id !== beatId).map((beat, index) => ({ ...beat, orderKey: index + 1 })) }));
    setSelectedBeatId(current => current === beatId ? '' : current);
    setSaveState('dirty');
  }
  function addScene(beatId: string) {
    const activeCastIds = project?.castAssignments.filter(item => item.active !== false).map(item => item.id) || [];
    const plannedMs = draft.scenes.reduce((total, scene) => total + scene.durationMs, 0);
    const remainingMs = Math.max(500, Math.min(60_000, (project?.durationTargetMs || 1000) - plannedMs));
    const sceneId = createDraftId('manual-scene');
    const shotId = createDraftId('manual-shot');
    const nextScene = createManualScene({
      id: sceneId, beatId, shotId, durationMs: remainingMs,
      title: t('cinematic.story.newSceneTitle', { count: draft.scenes.length + 1 }),
      shotTitle: t('cinematic.story.newShotTitle', { count: 1 }), castAssignmentIds: activeCastIds
    });
    setDraft(current => reconcileDraftLinks({ ...current, scenes: [...current.scenes, nextScene] }));
    setSelectedSceneId(sceneId);
    setSaveState('dirty');
  }
  function moveScene(sceneId: string, direction: 'earlier' | 'later') {
    setDraft(current => {
      const scene = current.scenes.find(item => item.id === sceneId);
      if (!scene) return current;
      const groupIndices = current.scenes.map((item, index) => item.beatId === scene.beatId ? index : -1).filter(index => index >= 0);
      const groupPosition = groupIndices.findIndex(index => current.scenes[index]?.id === sceneId);
      const targetPosition = direction === 'earlier' ? groupPosition - 1 : groupPosition + 1;
      if (groupPosition < 0 || targetPosition < 0 || targetPosition >= groupIndices.length) return current;
      const next = [...current.scenes];
      const fromIndex = groupIndices[groupPosition]!;
      const toIndex = groupIndices[targetPosition]!;
      [next[fromIndex], next[toIndex]] = [next[toIndex]!, next[fromIndex]!];
      return reconcileDraftLinks({ ...current, scenes: next });
    });
    setSaveState('dirty');
  }
  function removeScene(sceneId: string) {
    setDraft(current => reconcileDraftLinks({ ...current, scenes: current.scenes.filter(scene => scene.id !== sceneId).map((scene, index) => ({ ...scene, orderKey: index + 1 })) }));
    setSelectedSceneId(current => current === sceneId ? '' : current);
    setSaveState('dirty');
  }
  function editSceneFromBeat(sceneId: string) {
    setSelectedSceneId(sceneId);
    setBeatOpen(false);
    setDirectorOpen(true);
  }
  function startManualPlan() {
    if (!project) return;
    const next = createManualStoryPlan(project, t);
    setDraft(next);
    setSelectedSceneId(next.scenes[0]?.id || '');
    setSaveState('dirty');
  }
  return <>
    <StageHeading stage="story-plan" />
    <section className="cinematic-plan-readiness" aria-label={t('cinematic.story.readiness')}>
      <div><strong>{activeVersion?.status === 'approved' && !legacyRecoveryRequired ? t('cinematic.story.approved') : t('cinematic.story.draft')}</strong><span>{t('cinematic.story.sourceVersion', { version: project?.activeStorySourceVersionId || '-' })}</span></div>
      <div><strong>{project?.castAssignments.length || 0}</strong><span>{t('cinematic.story.castMembers')}</span></div>
      <div><strong>{project ? `${project.durationTargetMs / 1000}s` : `${runtimeSeconds}s`}</strong><span>{t('cinematic.story.targetDuration')}</span></div>
      <div className={validationIssues.length ? 'is-warning' : 'is-ready'}><strong>{validationIssues.length}</strong><span>{t('cinematic.story.issues')}</span></div>
    </section>
    {legacyRecoveryRequired ? <section className="cinematic-story-recovery" role="status"><div><strong>{t('cinematic.story.legacyRecoveryTitle')}</strong><span>{t('cinematic.story.legacyRecoveryDescription')}</span></div><Button size="sm" onClick={() => openBeat(draft.beats.find(beat => !beat.sceneIds.length)?.id || draft.beats[0]?.id || '')}>{t('cinematic.story.reviewRecovery')}</Button></section> : null}
    <div className="cinematic-story-layout">
      <section className="cinematic-work-panel">
        <div className="cinematic-story-board-heading"><SectionHeading title={t('cinematic.story.beats')} hint={t('cinematic.story.beatsHint')} />{draft.beats.length ? <Button size="sm" icon={<Plus aria-hidden="true" />} onClick={addBeat}>{t('cinematic.story.addBeat')}</Button> : null}</div>
        {draft.beats.length ? <ol className="cinematic-beat-list">{draft.beats.map((beat, index) => {
          const linkedScenes = draft.scenes.filter(scene => scene.beatId === beat.id);
          const isIncomplete = linkedScenes.length === 0;
          return <li key={beat.id} className={`cinematic-beat-card${selectedBeat?.id === beat.id ? ' is-selected' : ''}${isIncomplete ? ' is-warning' : ''}`}>
            <span>{index + 1}</span>
            <div className="cinematic-beat-card__body">
              <button type="button" className="cinematic-beat-card__summary" onClick={() => openBeat(beat.id)} aria-label={t('cinematic.story.openBeat', { name: beat.title })}>
                <header><div><small>{t(`cinematic.beatType.${beat.type}`, { defaultValue: beat.type })}</small><h4>{beat.title}</h4></div><strong className={isIncomplete ? 'is-required' : ''}><Clock3 aria-hidden="true" />{isIncomplete ? t('cinematic.story.durationRequired') : `${(beat.targetDurationMs / 1000).toFixed(1)}s`}</strong></header>
                <p>{beat.storyChange || beat.purpose || t('cinematic.story.beatDetailsRequired')}</p>
              </button>
              <div className="cinematic-beat-card__actions">
                <Button size="icon" variant="ghost" icon={<ArrowUp aria-hidden="true" />} aria-label={t('cinematic.story.moveBeatEarlier', { name: beat.title })} disabled={index === 0} onClick={() => moveBeat(beat.id, 'earlier')} />
                <Button size="icon" variant="ghost" icon={<ArrowDown aria-hidden="true" />} aria-label={t('cinematic.story.moveBeatLater', { name: beat.title })} disabled={index === draft.beats.length - 1} onClick={() => moveBeat(beat.id, 'later')} />
                <ConfirmDialog trigger={<Button size="icon" variant="ghost" icon={<Trash2 aria-hidden="true" />} aria-label={t('cinematic.story.removeBeat', { name: beat.title })} disabled={draft.beats.length <= 1 || linkedScenes.length > 0} />} title={t('cinematic.story.removeBeatTitle')} description={t('cinematic.story.removeBeatDescription', { name: beat.title })} confirmLabel={t('cinematic.story.removeBeatConfirm')} destructive onConfirm={() => removeBeat(beat.id)} />
              </div>
              <div className="cinematic-beat-scenes">{linkedScenes.map(scene => <button key={scene.id} type="button" className={selectedScene?.id === scene.id ? 'is-active' : ''} onClick={() => { setSelectedSceneId(scene.id); setDirectorOpen(true); }}><span>{scene.title}</span><small>{scene.shots.length} {t('cinematic.storyboard.shots')} · {(scene.durationMs / 1000).toFixed(1)}s</small></button>)}{isIncomplete ? <button type="button" className="is-required" onClick={() => openBeat(beat.id)}><span>{t('cinematic.beatDialog.sceneRequired')}</span><small>{t('cinematic.beatDialog.addScene')}</small></button> : null}</div>
            </div>
          </li>;
        })}</ol> : <div className="cinematic-story-empty"><Film aria-hidden="true" /><h3>{t('cinematic.story.emptyTitle')}</h3><p>{t('cinematic.story.emptyDescription')}</p>{project ? <Button icon={<Plus aria-hidden="true" />} onClick={startManualPlan}>{t('cinematic.story.createManually')}</Button> : null}</div>}
      </section>
      <aside className="cinematic-inspector cinematic-story-inspector"><h3>{t('cinematic.story.arc')}</h3>{draft.emotionalArc ? <p>{draft.emotionalArc}</p> : <p>{t('cinematic.story.arcPending')}</p>}<LabeledValue icon={<Film />} label={t('cinematic.story.scenes')} value={String(sceneCount)} /><LabeledValue icon={<ImageIcon />} label={t('cinematic.story.estimatedShots')} value={String(shotCount)} /><LabeledValue icon={<Clock3 />} label={t('cinematic.story.runtime')} value={`${runtimeSeconds.toFixed(1)}s`} />
        {validationIssues.length ? <div className="cinematic-plan-validation" role="status"><strong>{t('cinematic.story.reviewIssues')}</strong>{validationIssues.map(issue => issue.onAction ? <button type="button" key={issue.id} onClick={issue.onAction}>{issue.label}<ArrowRight aria-hidden="true" /></button> : <span key={issue.id}>{issue.label}</span>)}</div> : <div className="cinematic-plan-validation is-ready"><Check aria-hidden="true" /><span>{t('cinematic.story.readyForApproval')}</span></div>}
        {scriptPreview.length ? <details className="cinematic-film-script cinematic-film-script--compact"><summary>{t('cinematic.story.filmScriptPreview')}</summary><ol>{scriptPreview.map(entry => <li key={entry.shotId}><header><time>{formatDraftTime(entry.startMs)}-{formatDraftTime(entry.endMs)}</time><strong>{entry.sceneTitle} / {entry.shotTitle}</strong></header>{entry.visual ? <p><b>{t('cinematic.story.scriptVisual')}</b>{entry.visual}</p> : null}{entry.action ? <p><b>{t('cinematic.story.scriptAction')}</b>{entry.action}</p> : null}{entry.performance ? <p><b>{t('cinematic.story.scriptPerformance')}</b>{entry.performance}</p> : null}{entry.dialogue.map((cue, index) => <p key={`dialogue-${index}`}><b>{t('cinematic.story.scriptDialogue')}</b>{cue.text}</p>)}{entry.audio.map((cue, index) => <p key={`audio-${index}`}><b>{t('cinematic.story.scriptAudio')}</b>{cue.description || cue.source}</p>)}{entry.cut ? <p><b>{t('cinematic.story.scriptCut')}</b>{entry.cut}</p> : null}</li>)}</ol></details> : null}
        <div className="cinematic-story-ai-action"><span>{t('cinematic.story.operation')}</span><h3>{t('cinematic.story.operationTitle')}</h3><p>{t('cinematic.story.operationDescription')}</p><small className="cinematic-operation-status">{t('cinematic.story.qualificationNotice')}</small><div className="cinematic-story-ai-action__buttons"><Button className="w-full" variant="primary" icon={<WandSparkles aria-hidden="true" />} disabled={!project || generating || missingRequiredRoles.length > 0} onClick={() => void generatePlan('generate')}>{generating ? t('cinematic.story.generating') : t('cinematic.story.generate')}</Button>{draft.scenes.length ? <Button className="w-full" icon={<Film aria-hidden="true" />} disabled={!project || generating || missingRequiredRoles.length > 0} onClick={() => void generatePlan('review_current')}>{t('cinematic.story.reviewWithDirector')}</Button> : null}</div></div>
        <div className="cinematic-story-save-actions"><Button disabled={!project || saveState === 'saving' || !draft.scenes.length} onClick={() => void savePlan(false)}>{saveState === 'saving' ? t('cinematic.save.saving') : t('cinematic.story.saveDraft')}</Button><ConfirmDialog trigger={<Button variant="primary" disabled={!project || validationIssues.length > 0 || saveState === 'saving'}>{t('cinematic.story.approvePlan')}</Button>} title={t('cinematic.story.approveTitle')} description={t('cinematic.story.approveDescription', { beats: draft.beats.length, scenes: sceneCount, shots: shotCount, seconds: runtimeSeconds.toFixed(1) })} confirmLabel={t('cinematic.story.approveConfirm')} pending={saveState === 'saving'} onConfirm={() => void savePlan(true)} /></div>
        <small className="cinematic-story-save-state">{saveState === 'dirty' ? t('cinematic.story.unsavedChanges') : saveState === 'saved' ? t('cinematic.save.saved') : ''}</small>
      </aside>
    </div>
    {saveError ? <p role="alert" className="text-sm text-red-400">{saveError}</p> : null}
    <BeatDetailsDialog open={beatOpen} onOpenChange={setBeatOpen} beat={selectedBeat} scenes={selectedBeat ? draft.scenes.filter(scene => scene.beatId === selectedBeat.id) : []} onSave={updateBeat} onAddScene={addScene} onEditScene={editSceneFromBeat} onMoveScene={moveScene} onRemoveScene={removeScene} canRemoveScene={draft.scenes.length > 1} />
    <SceneDirectorDialog open={directorOpen} onOpenChange={setDirectorOpen} scene={selectedScene} castAssignments={project?.castAssignments} onSave={updateScene} onGenerate={(sceneId, direction) => void generateScene(sceneId, direction)} generating={generating} />
    <StoryPlanProposalDialog open={proposalOpen} onOpenChange={setProposalOpen} proposal={proposal} onApply={applyPlanProposal} onResolveSource={resolution => generatePlan(proposal?.mode || 'generate', resolution)} generating={generating && proposalOpen && !sceneProposalOpen} applying={applyingProposal} error={proposalOpen ? saveError : null} />
    <SceneDirectionProposalDialog open={sceneProposalOpen} onOpenChange={setSceneProposalOpen} proposal={sceneProposal} onApply={applySceneProposal} applying={applyingProposal} error={sceneProposalOpen ? saveError : null} />
  </>;
}

function StoryboardStage({ project, onProjectRefresh }: { project?: CinematicProject; onProjectRefresh?: () => void }) {
  const { t } = useTranslation('cinematic');
  const sourceScenes = project?.scenes.length ? project.scenes : [];
  const [selected, setSelected] = useState<{ sceneId: string; shotId: string } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [shotOrders, setShotOrders] = useState<Record<string, string[]>>(() => Object.fromEntries(sourceScenes.map(scene => [scene.id, scene.shotOrder])));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setShotOrders(Object.fromEntries((project?.scenes || []).map(scene => [scene.id, scene.shotOrder])));
  }, [project?.scenes, project?.version]);
  const selectedScene = selected ? sourceScenes.find(scene => scene.id === selected.sceneId) : null;
  const selectedShot = selectedScene?.shots.find(shot => shot.id === selected?.shotId) || null;
  async function moveShot(scene: CinematicScene, shotId: string, direction: 'earlier' | 'later') {
    const current = shotOrders[scene.id] || scene.shotOrder;
    const next = moveItem(current, shotId, direction);
    if (next === current) return;
    setShotOrders(orders => ({ ...orders, [scene.id]: next }));
    if (!project) return;
    setError(null);
    try {
      await reorderCinematicSceneShots(project.id, scene.id, { expectedVersion: project.version, shotIds: next });
      onProjectRefresh?.();
    } catch (cause) {
      setShotOrders(orders => ({ ...orders, [scene.id]: scene.shotOrder }));
      setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed'));
    }
  }
  return <>
    <StageHeading stage="storyboard" />
    <section className="cinematic-storyboard-toolbar">
      <div><h3>{t('cinematic.storyboard.projectBoard')}</h3><p>{t('cinematic.storyboard.projectBoardHint')}</p></div>
      <Button
        variant="primary"
        icon={<Images aria-hidden="true" />}
        disabled={!project || !project.scenes.some(scene => scene.shots.some(shot => !shot.approvedStoryboardSource))}
        onClick={() => setBatchOpen(true)}
      >{t('cinematic.storyboard.generateSet')}</Button>
    </section>
    {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
    <div className="cinematic-storyboard-project-board">
      {sourceScenes.map((scene, sceneIndex) => {
        const order = shotOrders[scene.id] || scene.shotOrder;
        const ordered = order.flatMap(id => {
          const shot = scene.shots.find(item => item.id === id);
          return shot ? [shot] : [];
        });
        const summaries = ordered.map((shot, shotIndex) => ({
          ...(() => {
            const attempt = latestStoryboardAttempt(project, shot.id);
            return { generationJobId: stringField(attempt, 'generationJobId') };
          })(),
          id: shot.id,
          sequenceLabel: `${t('cinematic.storyboard.scene')} ${sceneIndex + 1} · ${t('cinematic.storyboard.shot')} ${shotIndex + 1}`,
          durationSeconds: shot.durationMs / 1000,
          title: shot.title,
          framing: shot.framing,
          action: shot.blocking || shot.purpose,
          status: shot.approvedStoryboardSource ? 'ready' : shot.storyboardStatus === 'warning' ? 'warning' : 'draft',
          imageUrl: shot.approvedStoryboardSource?.thumbnailUrl || shot.approvedStoryboardSource?.imageUrl || null,
          castNames: shotCastNames(project, scene, shot),
          lookNames: shotLookNames(project, scene, shot)
        } satisfies StoryboardShotSummary));
        return <StoryboardSequenceBoard
          key={scene.id}
          sceneId={scene.id}
          sceneTitle={`${t('cinematic.storyboard.scene')} ${sceneIndex + 1}: ${scene.title}`}
          sceneDurationSeconds={scene.durationMs / 1000}
          shots={summaries}
          selectedShotId={selected?.shotId || ''}
          onSelectShot={shotId => setSelected({ sceneId: scene.id, shotId })}
          onMoveShot={(shotId, direction) => void moveShot(scene, shotId, direction)}
        />;
      })}
      {!sourceScenes.length ? <StoryboardSequenceBoard sceneTitle={t('cinematic.storyboard.sceneOne')} sceneDurationSeconds={12.5} shots={storyboardShotFixtures.map(shot => ({ id: shot.id, durationSeconds: shot.durationSeconds, title: t(`cinematic.storyboard.fixture.${shot.titleKey}`), framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`), action: t(`cinematic.storyboard.fixture.${shot.actionKey}`), status: shot.status }))} selectedShotId="" onSelectShot={() => undefined} onMoveShot={() => undefined} /> : null}
    </div>
    {project && selectedScene && selectedShot ? <StoryboardShotDialog open onOpenChange={open => {
      if (open) return;
      const shotId = selectedShot.id;
      setSelected(null);
      window.requestAnimationFrame(() => {
        document.getElementById(`storyboard-shot-${shotId}`)
          ?.querySelector<HTMLElement>('.cinematic-storyboard-card__media')?.focus();
      });
    }} project={project} scene={selectedScene} shot={selectedShot}
    resumeJobId={stringField(latestStoryboardAttempt(project, selectedShot.id), 'generationJobId')}
    onProjectRefresh={onProjectRefresh} /> : null}
    {project && batchOpen ? <StoryboardGenerateAllDialog
      open
      onOpenChange={setBatchOpen}
      project={project}
      onProjectRefresh={onProjectRefresh}
    /> : null}
  </>;
}

function latestStoryboardAttempt(project: CinematicProject | undefined, shotId: string) {
  if (!project) return null;
  return [...(Array.isArray(project.generationAttempts) ? project.generationAttempts : [])]
    .reverse()
    .find(value => {
      if (!value || typeof value !== 'object') return false;
      const attempt = value as Record<string, unknown>;
      return attempt.operation === 'cinematic_storyboard_still'
        && attempt.shotId === shotId
        && attempt.downstreamSourceStatus !== 'source_changed';
    }) as Record<string, unknown> | null || null;
}

function shotCastNames(project: CinematicProject | undefined, scene: CinematicScene, shot: CinematicShot) {
  if (!project) return [];
  return resolveStoryboardShotCast(project, scene, shot).map(assignment => assignment.displayName);
}

function shotLookNames(project: CinematicProject | undefined, scene: CinematicScene, shot: CinematicShot) {
  if (!project) return [];
  const cast = resolveStoryboardShotCast(project, scene, shot);
  return resolveStoryboardShotLooks(cast, scene, shot).map(look => look.name);
}

function ProduceStage({ project, onEditStoryboard, onProjectRefresh }: { project?: CinematicProject; onEditStoryboard?: () => void; onProjectRefresh?: () => void }) {
  const { t } = useTranslation('cinematic');
  const [selectedShot, setSelectedShot] = useState('01A');
  const [scope, setScope] = useState<'shot' | 'set'>('shot');
  const [prompt, setPrompt] = useState(t('cinematic.produce.promptFixture'));
  if (project) return <CinematicProduceRuntime project={project} onEditStoryboard={onEditStoryboard} onProjectRefresh={onProjectRefresh} />;
  const activeScene = undefined;
  const orderedShots = storyboardShotFixtures.map(shot => ({ id: shot.id, durationSeconds: shot.durationSeconds, title: t(`cinematic.storyboard.fixture.${shot.titleKey}`), framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`), action: t(`cinematic.storyboard.fixture.${shot.actionKey}`), status: shot.status } satisfies StoryboardShotSummary));
  return <>
    <StageHeading stage="produce" />
    <div className="cinematic-shot-workspace">
      <SceneNavigator scenes={undefined} activeSceneId={activeScene} onSelectScene={() => undefined} />
      <section className="cinematic-shot-editor">
        <StoryboardSequenceBoard sceneTitle={t('cinematic.produce.sequenceTitle')} sceneDurationSeconds={12.5} shots={orderedShots} selectedShotId={selectedShot} onSelectShot={setSelectedShot} onMoveShot={() => undefined} />
        <section className="cinematic-focused-shot" aria-label={`${t('cinematic.produce.editShot')} ${selectedShot}`}>
          <header><div><span>{t('cinematic.produce.selectedShot')}</span><h3>{t('cinematic.storyboard.shot')} {selectedShot}</h3></div><strong><Clock3 aria-hidden="true" />{orderedShots.find(shot => shot.id === selectedShot)?.durationSeconds ?? 0}s</strong></header>
          <CinematicResultPlaceholder type="video" />
          <div className="cinematic-shot-editor__form"><label><span>{t('cinematic.produce.prompt')}</span><textarea rows={6} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><Button size="sm" icon={<RotateCcw aria-hidden="true" />} onClick={() => setPrompt(t('cinematic.produce.promptFixture'))}>{t('cinematic.produce.reset')}</Button></div>
          <AttemptHistory type="video" />
        </section>
      </section>
      <aside className="cinematic-sticky-generation-panel"><ContextualOperationDock media title={t('cinematic.produce.operationTitle')} description={t('cinematic.produce.operationDescription')} operation={`${t('cinematic.storyboard.shot')} ${selectedShot}`} credits={scope === 'set' ? 126 : 42} actionLabel={scope === 'set' ? t('cinematic.produce.generateSet') : t('cinematic.produce.generate')}><GenerationScopeControl scope={scope} onScopeChange={setScope} eligible={scope === 'set' ? 3 : 1} blocked={scope === 'set' ? 1 : undefined} unitCredits={42} /><div className="cinematic-sticky-engine-fields"><label><span>{t('cinematic.engine.provider')}</span><select defaultValue="veo"><option value="veo">Google Veo</option><option value="seedance">Seedance</option></select></label><label><span>{t('cinematic.engine.model')}</span><select defaultValue="veo-fast"><option value="veo-fast">Veo 3.1 Fast</option><option value="seedance-lite">Seedance Lite</option></select></label><label><span>{t('cinematic.engine.duration')}</span><select defaultValue="4"><option value="4">4s</option><option value="6">6s</option></select></label><label><span>{t('cinematic.engine.resolution')}</span><select defaultValue="720"><option value="720">720p</option><option value="1080">1080p</option></select></label></div></ContextualOperationDock></aside>
    </div>
  </>;
}

function CinematicProduceRuntime({ project, onEditStoryboard, onProjectRefresh }: { project: CinematicProject; onEditStoryboard?: () => void; onProjectRefresh?: () => void }) {
  const { t } = useTranslation('cinematic');
  const activeScene = project?.scenes[0];
  const [selectedShot, setSelectedShot] = useState(activeScene?.shots[0]?.id || '01A');
  const [selectedSceneId, setSelectedSceneId] = useState(activeScene?.id || '');
  const selectedScene = project.scenes.find(scene => scene.id === selectedSceneId) || activeScene;
  const selectedShotRecord = selectedScene?.shots.find(shot => shot.id === selectedShot) || selectedScene?.shots[0];
  const latestAttempt = useMemo(() => findLatestVideoAttempt(project, selectedShotRecord?.id), [project, selectedShotRecord?.id]);
  const [prompt, setPrompt] = useState(selectedShotRecord?.prompt || t('cinematic.produce.promptFixture'));
  const [modelKey, setModelKey] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [durationSeconds, setDurationSeconds] = useState(Math.max(1, Math.round((selectedShotRecord?.durationMs || 4000) / 1000)));
  const [audioMode, setAudioMode] = useState<'none' | 'generated'>('none');
  const [taskId, setTaskId] = useState<string | null>(() => stringField(latestAttempt, 'generationJobId'));
  const [attemptId, setAttemptId] = useState<string | null>(() => stringField(latestAttempt, 'id'));
  const catalog = useQuery({ queryKey: ['video-capabilities', 'cinematic'], queryFn: getCinematicVideoCapabilityCatalog });
  const models = useMemo(() => (catalog.data?.models || []).filter(model => model.operations.includes('image_to_video')), [catalog.data]);
  const selectedModel = models.find(model => `${model.providerId}:${model.modelId}` === modelKey) || models[0];
  useEffect(() => { if (selectedModel && !modelKey) setModelKey(`${selectedModel.providerId}:${selectedModel.modelId}`); }, [modelKey, selectedModel]);
  useEffect(() => {
    if (!selectedModel) return;
    if (!selectedModel.resolutions.includes(resolution)) setResolution(selectedModel.resolutions[0] || '720p');
    const plannedDurationSeconds = Math.max(0.001, Number(selectedShotRecord?.durationMs || 0) / 1000);
    const selectedDurationCoversShot = selectedModel.durations.includes(durationSeconds)
      && durationSeconds >= plannedDurationSeconds;
    if (!selectedDurationCoversShot) {
      const coveringDuration = selectedModel.durations.find(value => value >= plannedDurationSeconds)
        || selectedModel.durations.at(-1)
        || 4;
      setDurationSeconds(coveringDuration);
    }
    if (!selectedModel.audioModes.includes(audioMode)) setAudioMode((selectedModel.audioModes[0] || 'none') as 'none' | 'generated');
  }, [audioMode, durationSeconds, resolution, selectedModel, selectedShotRecord?.durationMs]);
  useEffect(() => {
    setPrompt(selectedShotRecord?.prompt || t('cinematic.produce.promptFixture'));
    setDurationSeconds(Math.max(1, Math.round((selectedShotRecord?.durationMs || 4000) / 1000)));
    setTaskId(stringField(latestAttempt, 'generationJobId'));
    setAttemptId(stringField(latestAttempt, 'id'));
  }, [latestAttempt, selectedShotRecord?.id, selectedShotRecord?.prompt, selectedShotRecord?.durationMs, t]);
  const source = selectedShotRecord?.approvedStoryboardSource;
  const quoteInput = selectedModel && selectedShotRecord && source ? {
    expectedVersion: project.version,
    expectedShotVersion: selectedShotRecord.version,
    sourceFingerprint: source.sourceFingerprint,
    providerId: selectedModel.providerId,
    modelId: selectedModel.modelId,
    prompt,
    aspectRatio: selectedModel.aspectRatios.includes(project.aspectRatio) ? project.aspectRatio : selectedModel.aspectRatios[0] || project.aspectRatio,
    resolution,
    durationSeconds,
    audioMode
  } : null;
  const quote = useQuery({
    queryKey: ['cinematic-video-quote', project.id, selectedScene?.id, selectedShotRecord?.id, quoteInput],
    queryFn: () => quoteCinematicVideoAttempt(project.id, selectedScene!.id, selectedShotRecord!.id, quoteInput!),
    enabled: Boolean(quoteInput && prompt.trim()),
    staleTime: 20_000,
    retry: false
  });
  const submit = useMutation({
    mutationFn: () => createCinematicVideoAttempt(project.id, selectedScene!.id, selectedShotRecord!.id, {
      ...quoteInput!, estimateId: quote.data!.estimate.estimateId,
      idempotencyKey: `cinematic:${project.id}:${selectedShotRecord!.id}:${crypto.randomUUID()}`
    }),
    onSuccess: response => {
      setAttemptId(response.attemptId);
      setTaskId(response.task.id);
      onProjectRefresh?.();
    }
  });
  const task = useQuery({
    queryKey: ['video-task', taskId],
    queryFn: () => getVideoTask(taskId!),
    enabled: Boolean(taskId),
    refetchInterval: query => ['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required'].includes(query.state.data?.status || '') ? false : 5_000
  });
  const approve = useMutation({
    mutationFn: () => approveCinematicVideoAttempt(project.id, selectedScene!.id, selectedShotRecord!.id, attemptId!, project.version),
    onSuccess: () => onProjectRefresh?.()
  });
  const orderedShots = selectedScene ? selectedScene.shots.map(shot => ({ id: shot.id, durationSeconds: shot.durationMs / 1000, title: shot.title, framing: shot.framing, action: shot.blocking || shot.purpose, status: shot.approvedStoryboardSource ? 'ready' : 'warning' } satisfies StoryboardShotSummary)) : [];
  const isRunning = Boolean(taskId && !['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required'].includes(task.data?.status || ''));
  const operationError = submit.error || quote.error || task.error || approve.error;
  const attemptHistory = project.generationAttempts
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && 'shotId' in item && item.shotId === selectedShot)
    .map(item => item.id === attemptId && task.data ? { ...item, status: task.data.status, outputAsset: task.data.outputAsset } : item);
  return <>
    <StageHeading stage="produce" />
    <div className="cinematic-shot-workspace">
      <SceneNavigator scenes={project.scenes} activeSceneId={selectedScene?.id} onSelectScene={sceneId => { const scene = project.scenes.find(item => item.id === sceneId); setSelectedSceneId(sceneId); if (scene?.shots[0]) setSelectedShot(scene.shots[0].id); }} />
      <section className="cinematic-shot-editor">
        <StoryboardSequenceBoard sceneId={selectedScene?.id} sceneTitle={selectedScene?.title || t('cinematic.produce.sequenceTitle')} sceneDurationSeconds={(selectedScene?.durationMs || 0) / 1000} shots={orderedShots} selectedShotId={selectedShot} onSelectShot={setSelectedShot} onMoveShot={() => undefined} />
        <section className="cinematic-focused-shot" aria-label={`${t('cinematic.produce.editShot')} ${selectedShot}`}>
          <header><div><span>{t('cinematic.produce.selectedShot')}</span><h3>{t('cinematic.storyboard.shot')} {selectedShot}</h3></div><strong><Clock3 aria-hidden="true" />{orderedShots.find(shot => shot.id === selectedShot)?.durationSeconds ?? 0}s</strong></header>
          {task.data?.outputAsset?.publicUrl ? <section className="cinematic-generation-result" aria-label={t('cinematic.results.videoLabel')}><VideoMediaPlayer videoUrl={task.data.outputAsset.publicUrl} posterUrl={task.data.outputAsset.posterUrl} title={`${t('cinematic.storyboard.shot')} ${selectedShot}`} /></section> : isRunning ? <section className="cinematic-generation-result" aria-label={t('cinematic.results.videoLabel')}><GenerationStageState loading title={t('cinematic.produce.generating')} description={task.data?.status || t('cinematic.produce.queued')} /></section> : selectedShotRecord?.approvedStoryboardSource ? <section className="cinematic-produce-source"><img src={selectedShotRecord.approvedStoryboardSource.imageUrl} alt="" /><div><strong>{t('cinematic.produce.approvedSource')}</strong><Button size="sm" variant="ghost" onClick={onEditStoryboard}>{t('cinematic.produce.editStoryboardSource')}</Button></div></section> : <CinematicResultPlaceholder type="video" />}
          <div className="cinematic-shot-editor__form"><label><span>{t('cinematic.produce.prompt')}</span><textarea rows={6} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><Button size="sm" icon={<RotateCcw aria-hidden="true" />} onClick={() => setPrompt(t('cinematic.produce.promptFixture'))}>{t('cinematic.produce.reset')}</Button></div>
          {task.data?.status === 'completed' && task.data.billingStatus === 'captured' && attemptId ? <Button variant="primary" disabled={approve.isPending} onClick={() => approve.mutate()}>{t('cinematic.produce.approveAttempt')}</Button> : null}
          {operationError ? <p role="alert" className="text-sm text-red-400">{operationError.message}</p> : null}
          <AttemptHistory type="video" attempts={attemptHistory} />
        </section>
      </section>
      <aside className="cinematic-sticky-generation-panel"><ContextualOperationDock media title={t('cinematic.produce.operationTitle')} description={t('cinematic.produce.operationDescription')} operation={`${t('cinematic.storyboard.shot')} ${selectedShot}`} credits={quote.data?.estimate.estimatedCredits} actionLabel={t('cinematic.produce.generate')} disabled={!quote.data?.account.canAfford || !source || submit.isPending || isRunning} loading={quote.isFetching || submit.isPending} notice={!source ? t('cinematic.produce.sourceRequired') : quote.error?.message || t('cinematic.produce.lockedEstimate')} onAction={() => submit.mutate()}><DurationReconciliationSummary value={quote.data?.durationReconciliation} /><div className="cinematic-sticky-engine-fields"><label><span>{t('cinematic.engine.provider')}</span><select value={selectedModel?.providerId || ''} onChange={event => { const model = models.find(item => item.providerId === event.target.value); if (model) setModelKey(`${model.providerId}:${model.modelId}`); }}>{[...new Set(models.map(model => model.providerId))].map(provider => <option key={provider} value={provider}>{provider}</option>)}</select></label><label><span>{t('cinematic.engine.model')}</span><select value={modelKey} onChange={event => setModelKey(event.target.value)}>{models.filter(model => model.providerId === selectedModel?.providerId).map(model => <option key={`${model.providerId}:${model.modelId}`} value={`${model.providerId}:${model.modelId}`}>{model.displayName}</option>)}</select></label><label><span>{t('cinematic.engine.duration')}</span><select value={durationSeconds} onChange={event => setDurationSeconds(Number(event.target.value))}>{selectedModel?.durations.map(value => <option key={value} value={value}>{value}s</option>)}</select></label><label><span>{t('cinematic.engine.resolution')}</span><select value={resolution} onChange={event => setResolution(event.target.value)}>{selectedModel?.resolutions.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div></ContextualOperationDock></aside>
    </div>
  </>;
}

function DurationReconciliationSummary({ value }: {
  value?: {
    plannedDurationSeconds: number;
    renderDurationSeconds: number;
    trimDurationSeconds: number;
    durationControlMode: 'exact' | 'prompted';
  };
}) {
  const { t } = useTranslation('cinematic');
  if (!value) return null;
  const renderLabel = value.durationControlMode === 'prompted'
    ? t('cinematic.produce.generateTarget')
    : t('cinematic.produce.renderDuration');
  return <dl className="cinematic-duration-reconciliation">
    <div><dt>{t('cinematic.produce.plannedDuration')}</dt><dd>{value.plannedDurationSeconds}s</dd></div>
    <div><dt>{renderLabel}</dt><dd>{value.renderDurationSeconds}s</dd></div>
    {value.trimDurationSeconds > 0 ? <div><dt>{t('cinematic.produce.trimAfterGeneration')}</dt><dd>{value.trimDurationSeconds}s</dd></div> : null}
    {value.durationControlMode === 'prompted' ? <div className="cinematic-duration-reconciliation__hint"><p>{t('cinematic.produce.promptedDurationHint')}</p></div> : null}
  </dl>;
}

function SceneNavigator({ scenes: projectScenes, activeSceneId, onSelectScene }: { scenes?: CinematicScene[]; activeSceneId?: string; onSelectScene: (sceneId: string) => void }) {
  const { t } = useTranslation('cinematic');
  const fixtures = [
    { id: 'one', duration: '12.5s', shots: 4 },
    { id: 'two', duration: '9s', shots: 2 },
    { id: 'three', duration: '8.5s', shots: 2 }
  ] as const;
  const scenes = projectScenes?.map(scene => ({ id: scene.id, title: scene.title, duration: `${(scene.durationMs / 1000).toFixed(1)}s`, shots: scene.shots.length })) || fixtures.map(scene => ({ ...scene, title: t(`cinematic.storyboard.scene${scene.id[0]!.toUpperCase()}${scene.id.slice(1)}`) }));
  const total = scenes.reduce((sum, scene) => sum + Number.parseFloat(scene.duration), 0);
  return <aside className="cinematic-scene-navigator" aria-label={t('cinematic.storyboard.sceneNavigator')}><header><strong>{t('cinematic.storyboard.scenes')}</strong><small>{total.toFixed(1)}s {t('cinematic.storyboard.projectTotal')}</small></header>{scenes.map(scene => <button key={scene.id} type="button" className={activeSceneId === scene.id ? 'is-active' : ''} onClick={() => onSelectScene(scene.id)}><span>{scene.title}</span><strong><Clock3 aria-hidden="true" />{scene.duration}</strong><small>{scene.shots} {t('cinematic.storyboard.shots')}</small></button>)}</aside>;
}

function createStoryPlanDraft(
  project: CinematicProject | undefined,
  version: CinematicProject['storyPlanVersions'][number] | undefined,
  t: (key: string) => string
): CinematicStoryPlanDraft {
  if (project) {
    const draft: CinematicStoryPlanDraft = {
      objective: version?.objective || project.setup.storyBrief,
      logline: version?.logline || project.setup.storyBrief,
      emotionalArc: version?.emotionalArc || '',
      centralDramaticQuestion: version?.centralDramaticQuestion || '',
      storyPromise: version?.storyPromise || '',
      finalPayoff: version?.finalPayoff || '',
      spokenLanguage: version?.spokenLanguage || '',
      onScreenTextPolicy: version?.onScreenTextPolicy || '',
      dialoguePolicy: version?.dialoguePolicy || 'sparse',
      characterAliases: structuredClone(version?.characterAliases || []),
      directorOperation: version?.directorOperation || 'manual',
      directorSummary: version?.directorSummary || '',
      directorFindings: structuredClone(version?.directorFindings || []),
      sourceResolution: version?.sourceResolution || null,
      warningsAcknowledged: version?.warningsAcknowledged || false,
      filmReadiness: version?.filmReadiness,
      scriptPreview: structuredClone(version?.scriptPreview || []),
      beats: structuredClone(version?.beats || []),
      scenes: structuredClone(project.scenes),
      warnings: version?.warnings || [],
      source: version?.source || 'manual',
      approved: version?.status === 'approved' && !needsStoryPlanRecovery(project, version)
    };
    if (!draft.beats.length && draft.scenes.length) {
      draft.beats = [{
        id: createDraftId('recovered-beat'), orderKey: 1, type: 'development',
        title: t('cinematic.story.recoveredBeatTitle'), purpose: '', storyChange: '',
        cause: '', consequence: '', emotionalTurn: '', requiredElements: [],
        emotionalStart: '', emotionalEnd: '', targetDurationMs: 0, sceneIds: []
      }];
    }
    const beatIds = new Set(draft.beats.map(beat => beat.id));
    draft.scenes = draft.scenes.map((scene, index) => ({
      ...scene,
      beatId: beatIds.has(scene.beatId) ? scene.beatId : draft.beats[Math.min(index, Math.max(0, draft.beats.length - 1))]?.id || ''
    }));
    return reconcileDraftLinks(draft);
  }
  const durationPerBeat = 6000;
  const previewBeats: CinematicStoryBeat[] = beats.map((beat, index) => ({
    id: `preview-beat-${index + 1}`, orderKey: index + 1, type: beat,
    title: t(`cinematic.story.${beat}`), purpose: t(`cinematic.story.${beat}Description`),
    storyChange: t(`cinematic.story.${beat}Description`), cause: '', consequence: '',
    emotionalStart: '', emotionalTurn: '', emotionalEnd: '', requiredElements: [],
    targetDurationMs: durationPerBeat, sceneIds: [`preview-scene-${index + 1}`]
  }));
  return {
    objective: t('cinematic.story.beatsHint'), logline: '', emotionalArc: '',
    centralDramaticQuestion: '', storyPromise: '', finalPayoff: '', spokenLanguage: '',
    onScreenTextPolicy: '', dialoguePolicy: 'sparse', characterAliases: [], directorOperation: 'manual',
    directorSummary: '', directorFindings: [], sourceResolution: null, warningsAcknowledged: false,
    beats: previewBeats,
    scenes: previewBeats.map((beat, index) => ({
      id: beat.sceneIds[0]!, version: 1, orderKey: index + 1, beatId: beat.id,
      title: beat.title, purpose: beat.purpose, storyChange: beat.storyChange,
      entryState: '', exitState: '', objective: beat.purpose, pressure: '',
      location: '', time: '', emotionalStart: '', emotionalEnd: '', transitionIntent: 'cut',
      castAssignmentIds: [], wardrobeLookIds: [], blocking: beat.purpose,
      lighting: '', performance: '', audioIntent: '', propContinuity: '', screenDirection: '', continuityNotes: [],
      shots: [{
        id: `preview-shot-${index + 1}`, version: 1, orderKey: 1, title: beat.title,
        purpose: beat.purpose, visibleMoment: '', subjectAction: '', emotionalTarget: '', performanceCue: '',
        durationMs: durationPerBeat, framing: 'medium shot',
        cameraAngle: 'eye level', cameraMovement: 'locked camera', lensIntent: '',
        blocking: beat.purpose, performance: '', gaze: '', lighting: '', environment: '',
        audioIntent: '', prompt: '', castAssignmentIds: [], wardrobeLookIds: [],
        continuityEntry: '', continuityExit: '', transitionToNext: '',
        estimatedActionDurationMs: durationPerBeat, dialogueCues: [], audioCues: [],
        continuityNotes: [], storyboardStatus: 'draft'
      }],
      shotOrder: [`preview-shot-${index + 1}`], durationMs: durationPerBeat
    })),
    warnings: [], source: 'manual', approved: false
  };
}

function buildDraftFilmScriptPreview(draft: CinematicStoryPlanDraft): NonNullable<CinematicStoryPlanDraft['scriptPreview']> {
  let cursorMs = 0;
  return [...draft.scenes]
    .sort((left, right) => left.orderKey - right.orderKey)
    .flatMap(scene => [...scene.shots]
      .sort((left, right) => left.orderKey - right.orderKey)
      .map(shot => {
        const startMs = cursorMs;
        cursorMs += shot.durationMs;
        return {
          sceneId: scene.id,
          sceneTitle: scene.title,
          shotId: shot.id,
          shotTitle: shot.title,
          startMs,
          endMs: cursorMs,
          visual: [shot.visibleMoment, shot.framing, shot.environment].filter(Boolean).join(' / '),
          action: [shot.subjectAction, shot.blocking].filter(Boolean).join(' / '),
          performance: [shot.emotionalTarget, shot.performanceCue || shot.performance].filter(Boolean).join(' / '),
          dialogue: shot.dialogueCues || [],
          audio: shot.audioCues || [],
          cut: [shot.continuityExit, shot.transitionToNext || scene.transitionIntent].filter(Boolean).join(' / ')
        };
      }));
}

function formatDraftTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

export function needsStoryPlanRecovery(
  project: CinematicProject | undefined,
  version: CinematicProject['storyPlanVersions'][number] | undefined
) {
  if (!project || !version) return false;
  const beats = version.beats || [];
  const beatIds = new Set(beats.map(beat => beat.id));
  if (!beats.length && project.scenes.length) return true;
  if (project.scenes.some(scene => !scene.beatId || !beatIds.has(scene.beatId))) return true;
  return beats.some(beat => {
    const linked = project.scenes.filter(scene => scene.beatId === beat.id);
    const linkedIds = linked.map(scene => scene.id);
    const durationMs = linked.reduce((total, scene) => total + scene.durationMs, 0);
    return beat.sceneIds.length !== linkedIds.length
      || beat.sceneIds.some(id => !linkedIds.includes(id))
      || beat.targetDurationMs !== durationMs;
  });
}

export function hasUsableApprovedStoryPlan(project: CinematicProject) {
  const version = project.storyPlanVersions.find(item => item.id === project.activeStoryPlanVersionId);
  if (!version || version.status !== 'approved' || version.storySourceVersionId !== project.activeStorySourceVersionId) return false;
  if (needsStoryPlanRecovery(project, version)) return false;
  const beatIds = new Set(version.beats.map(beat => beat.id));
  return version.beats.length > 0
    && project.scenes.length > 0
    && version.beats.every(beat => beat.sceneIds.length > 0 && Boolean(beat.title && beat.purpose && beat.storyChange))
    && project.scenes.every(scene => (
      beatIds.has(scene.beatId) && scene.shots.length > 0
      && Boolean(scene.title && scene.purpose && scene.storyChange)
      && scene.shots.every(shot => Boolean(shot.title && shot.purpose))
    ))
    && Math.abs(project.scenes.reduce((total, scene) => total + scene.durationMs, 0) - project.durationTargetMs) <= 1000;
}

type StoryPlanStageBlockReason = 'approval_required' | 'review_required' | null;

function storyPlanStageBlockReason(project?: CinematicProject): StoryPlanStageBlockReason {
  if (!project) return null;
  const latestVersion = project.storyPlanVersions.at(-1);
  const activeVersion = project.storyPlanVersions.find(item => item.id === project.activeStoryPlanVersionId);
  if (latestVersion?.status === 'draft' || (activeVersion && needsStoryPlanRecovery(project, activeVersion))) {
    return 'approval_required';
  }
  return hasUsableApprovedStoryPlan(project) ? null : 'review_required';
}

function reconcileDraftLinks(draft: CinematicStoryPlanDraft): CinematicStoryPlanDraft {
  const beatOrder = new Map(draft.beats.map((beat, index) => [beat.id, index]));
  const scenes = draft.scenes
    .map((scene, originalIndex) => ({ scene, originalIndex }))
    .sort((left, right) => (
      (beatOrder.get(left.scene.beatId) ?? Number.MAX_SAFE_INTEGER) - (beatOrder.get(right.scene.beatId) ?? Number.MAX_SAFE_INTEGER)
      || left.originalIndex - right.originalIndex
    ))
    .map(({ scene }, sceneIndex) => {
    const shots = scene.shots.map((shot, shotIndex) => ({ ...shot, orderKey: shotIndex + 1 }));
    return {
      ...scene,
      orderKey: sceneIndex + 1,
      shots,
      shotOrder: shots.map(shot => shot.id),
      durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0)
    };
    });
  return {
    ...draft,
    scenes,
    beats: draft.beats.map((beat, beatIndex) => {
      const linked = scenes.filter(scene => scene.beatId === beat.id);
      return {
        ...beat,
        orderKey: beatIndex + 1,
        sceneIds: linked.map(scene => scene.id),
        targetDurationMs: linked.reduce((total, scene) => total + scene.durationMs, 0)
      };
    })
  };
}

function createManualScene({
  id, beatId, shotId, durationMs, title, shotTitle, castAssignmentIds
}: {
  id: string; beatId: string; shotId: string; durationMs: number;
  title: string; shotTitle: string; castAssignmentIds: string[];
}): CinematicScene {
  return {
    id, version: 1, orderKey: 1, beatId, title, purpose: '', storyChange: '', location: '', time: '',
    entryState: '', exitState: '', objective: '', pressure: '',
    emotionalStart: '', emotionalEnd: '', transitionIntent: 'cut', castAssignmentIds,
    wardrobeLookIds: [], blocking: '', lighting: '', performance: '', audioIntent: '',
    propContinuity: '', screenDirection: '', continuityNotes: [],
    shots: [{
      id: shotId, version: 1, orderKey: 1, title: shotTitle, purpose: '', durationMs,
      visibleMoment: '', subjectAction: '', emotionalTarget: '', performanceCue: '',
      framing: 'medium shot', cameraAngle: 'eye level', cameraMovement: 'locked camera', lensIntent: '',
      blocking: '', performance: '', gaze: '', lighting: '', environment: '', audioIntent: '', prompt: '',
      continuityEntry: '', continuityExit: '', transitionToNext: '', estimatedActionDurationMs: durationMs,
      dialogueCues: [], audioCues: [], castAssignmentIds, wardrobeLookIds: [], continuityNotes: [], storyboardStatus: 'draft'
    }],
    shotOrder: [shotId], durationMs
  };
}

function createDraftId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function moveRecord<T extends { id: string }>(items: T[], itemId: string, direction: 'earlier' | 'later') {
  const currentIds = items.map(item => item.id);
  const ids = moveItem(currentIds, itemId, direction);
  if (ids === currentIds) return items;
  const byId = new Map(items.map(item => [item.id, item]));
  return ids.map(id => byId.get(id)!);
}

function createManualStoryPlan(project: CinematicProject, t: (key: string) => string): CinematicStoryPlanDraft {
  const suffix = Date.now().toString(36);
  const beatId = `manual-beat-${suffix}`;
  const sceneId = `manual-scene-${suffix}`;
  const shotId = `manual-shot-${suffix}`;
  const durationMs = project.durationTargetMs;
  const purpose = project.setup.storyBrief || t('cinematic.story.manualPurpose');
  return {
    objective: purpose,
    logline: purpose,
    emotionalArc: '',
    centralDramaticQuestion: '', storyPromise: '', finalPayoff: '', spokenLanguage: '',
    onScreenTextPolicy: '', dialoguePolicy: 'sparse', characterAliases: [], directorOperation: 'manual',
    directorSummary: '', directorFindings: [], sourceResolution: null, warningsAcknowledged: false,
    beats: [{
      id: beatId, orderKey: 1, type: 'setup', title: t('cinematic.story.manualBeatTitle'),
      purpose, storyChange: '', cause: purpose, consequence: '', emotionalStart: '', emotionalTurn: '',
      emotionalEnd: '', requiredElements: [], targetDurationMs: durationMs,
      sceneIds: [sceneId]
    }],
    scenes: [{
      id: sceneId, version: 1, orderKey: 1, beatId,
      title: t('cinematic.story.manualSceneTitle'), purpose, storyChange: '', location: '', time: '',
      entryState: '', exitState: '', objective: purpose, pressure: '',
      emotionalStart: '', emotionalEnd: '', transitionIntent: 'cut',
      castAssignmentIds: project.castAssignments.filter(item => item.active !== false).map(item => item.id),
      wardrobeLookIds: [], blocking: '', lighting: '', performance: '', audioIntent: '',
      propContinuity: '', screenDirection: '', continuityNotes: [],
      shots: [{
        id: shotId, version: 1, orderKey: 1, title: t('cinematic.story.manualShotTitle'), purpose,
        visibleMoment: '', subjectAction: '', emotionalTarget: '', performanceCue: '',
        durationMs, framing: 'medium shot', cameraAngle: 'eye level', cameraMovement: 'locked camera',
        lensIntent: '', blocking: '', performance: '', gaze: '', lighting: '', environment: '', audioIntent: '',
        prompt: '', castAssignmentIds: project.castAssignments.filter(item => item.active !== false).map(item => item.id),
        wardrobeLookIds: [], continuityEntry: '', continuityExit: '', transitionToNext: '',
        estimatedActionDurationMs: durationMs, dialogueCues: [], audioCues: [], continuityNotes: [], storyboardStatus: 'draft'
      }],
      shotOrder: [shotId], durationMs
    }],
    warnings: [], source: 'manual', approved: false
  };
}

function GenerationScopeControl({ scope, onScopeChange, eligible, blocked, unitCredits }: { scope: 'shot' | 'set'; onScopeChange: (scope: 'shot' | 'set') => void; eligible: number; blocked?: number; unitCredits: number }) {
  const { t } = useTranslation('cinematic');
  return <fieldset className="cinematic-generation-scope"><legend>{t('cinematic.generation.scope')}</legend><div><button type="button" className={scope === 'shot' ? 'is-active' : ''} onClick={() => onScopeChange('shot')}>{t('cinematic.generation.selectedShot')}</button><button type="button" className={scope === 'set' ? 'is-active' : ''} onClick={() => onScopeChange('set')}>{t('cinematic.generation.eligibleSet')}</button></div><p>{t('cinematic.generation.eligibleSummary', { eligible, blocked: blocked ?? 0 })}</p>{scope === 'set' && <strong>{t('cinematic.generation.batchCalculation', { eligible, unitCredits, total: eligible * unitCredits })}</strong>}</fieldset>;
}

function CinematicResultPlaceholder({ type }: { type: 'image' | 'video' }) {
  const { t } = useTranslation('cinematic');
  return <section className="cinematic-generation-result" id={`cinematic-${type}-results`} tabIndex={-1} aria-label={t(`cinematic.results.${type}Label`)}><GenerationStageState title={t(`cinematic.results.${type}Empty`)} description={t('cinematic.results.emptyHint')} /></section>;
}

function moveItem(items: string[], itemId: string, direction: 'earlier' | 'later') {
  const from = items.indexOf(itemId);
  const to = direction === 'earlier' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

function findLatestVideoAttempt(project: CinematicProject, shotId?: string) {
  if (!shotId) return null;
  return [...project.generationAttempts].reverse().find((item): item is Record<string, unknown> => (
    typeof item === 'object' && item !== null
    && 'shotId' in item && item.shotId === shotId
    && 'operation' in item && item.operation === 'cinematic_draft_clip'
  )) || null;
}

function stringField(record: Record<string, unknown> | null, field: string) {
  const value = record?.[field];
  return typeof value === 'string' && value ? value : null;
}

function FinishStage({ project, onProjectChanged }: { project?: CinematicProject; onProjectChanged?: (project: CinematicProject) => void }) {
  const { t } = useTranslation('cinematic');
  const [saveState, setSaveState] = useState<'idle' | 'saving'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const projectShots = project?.scenes.flatMap(scene => scene.shots) || [];
  const visibleShots = project ? projectShots : shots.map((id, index) => ({ id, durationMs: index === 3 ? 5000 : 3500 }));
  async function saveTimeline() {
    if (!project || !projectShots.length) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      const saved = await saveCinematicTimeline(project.id, {
        expectedVersion: project.version,
        entries: projectShots.map(shot => ({
          shotId: shot.id,
          trimInMs: 0,
          trimOutMs: shot.durationMs,
          transition: 'cut'
        }))
      });
      onProjectChanged?.(saved);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setSaveState('idle');
    }
  }
  return <>
    <StageHeading stage="finish" />
    <div className="cinematic-finish-layout">
      <section className="cinematic-finish-monitor"><div className="cinematic-monitor cinematic-monitor--large"><Play aria-hidden="true" /><span>00:18 / 00:30</span></div></section>
      <section className="cinematic-timeline-panel"><SectionHeading title={t('cinematic.finish.timeline')} hint={t('cinematic.finish.timelineHint')} action={<Button size="sm" disabled={!project || !projectShots.length || saveState === 'saving'} onClick={() => void saveTimeline()}>{t('cinematic.story.savePlan')}</Button>} /><div className="cinematic-timeline">{visibleShots.map(shot => <div key={shot.id}><span>{shot.id}</span><small>{(shot.durationMs / 1000).toFixed(1)}s</small></div>)}</div><div className="cinematic-trim-controls"><label><span>{t('cinematic.finish.trimIn')}</span><input defaultValue="00:00.0" /></label><label><span>{t('cinematic.finish.trimOut')}</span><input defaultValue="00:03.5" /></label><label><span>{t('cinematic.finish.transition')}</span><select defaultValue="cut"><option value="cut">{t('cinematic.finish.straightCut')}</option><option value="dissolve">{t('cinematic.finish.dissolve')}</option></select></label></div>{saveError ? <p role="alert">{saveError}</p> : null}</section>
      <aside className="cinematic-shot-operations"><ContextualOperationDock title={t('cinematic.finish.operationTitle')} description={t('cinematic.finish.operationDescription')} operation={t('cinematic.finish.export')} credits={2} actionLabel={t('cinematic.finish.export')} /><Button variant="primary" disabled>{t('cinematic.finish.complete')}</Button><Button disabled>{t('cinematic.finish.continueSeries')}</Button></aside>
    </div>
  </>;
}

function AttemptHistory({ type, attempts }: { type: 'image' | 'video'; attempts?: Record<string, unknown>[] }) {
  const { t } = useTranslation('cinematic');
  const items = attempts?.length ? attempts : null;
  return <section className="cinematic-attempt-history"><h3>{t('cinematic.attempts.title')}</h3>{items ? items.map((attempt, index) => <article key={String(attempt.id || index)}><span>{type === 'image' ? <ImageIcon /> : <Film />}</span><div><strong>{String(attempt.modelId || attempt.id || t('cinematic.attempts.first'))}</strong><small>{String(attempt.generationJobId || attempt.providerTaskId || '')}</small></div><span className={`cinematic-status-pill${attempt.status === 'approved' || attempt.status === 'completed' ? ' is-ready' : ''}`}>{String(attempt.status || 'pending')}</span></article>) : <article><span>{type === 'image' ? <ImageIcon /> : <Film />}</span><div><strong>{t('cinematic.attempts.first')}</strong><small>{t('cinematic.attempts.fixture')}</small></div><span className="cinematic-status-pill is-ready">{t('cinematic.attempts.approved')}</span></article>}</section>;
}

function SectionHeading({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) { return <div className="cinematic-section-heading"><div><h3>{title}</h3><p>{hint}</p></div>{action}</div>; }
function LabeledValue({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) { return <div className="cinematic-labeled-value">{icon && <span>{icon}</span>}<div><small>{label}</small><strong>{value}</strong></div></div>; }
function StageFooter({ activeStage, onPrevious, onNext, nextDisabled = false, storyPlanBlockReason = null }: Pick<Props, 'activeStage' | 'onPrevious' | 'onNext'> & { nextDisabled?: boolean; storyPlanBlockReason?: StoryPlanStageBlockReason }) {
  const { t } = useTranslation('cinematic');
  const castStage = activeStage === 'cast';
  const storyPlanStage = activeStage === 'story-plan';
  const titleKey = castStage
    ? (nextDisabled ? 'cinematic.cast.castIncomplete' : 'cinematic.cast.requiredCastReady')
    : storyPlanStage
      ? (storyPlanBlockReason === 'approval_required' ? 'cinematic.story.currentDraftNeedsApprovalTitle' : storyPlanBlockReason === 'review_required' ? 'cinematic.story.currentPlanNeedsReviewTitle' : 'cinematic.story.currentPlanReadyTitle')
      : 'cinematic.prototype.title';
  const descriptionKey = castStage
    ? (nextDisabled ? 'cinematic.cast.requiredRolesBlocking' : 'cinematic.cast.readyToContinue')
    : storyPlanStage
      ? (storyPlanBlockReason === 'approval_required' ? 'cinematic.story.currentDraftNeedsApprovalDescription' : storyPlanBlockReason === 'review_required' ? 'cinematic.story.currentPlanNeedsReviewDescription' : 'cinematic.story.currentPlanReadyDescription')
      : 'cinematic.prototype.description';
  return <Surface className="cinematic-stage-footer"><div><strong>{t(titleKey)}</strong><p>{t(descriptionKey)}</p></div><div><Button icon={<ArrowLeft />} onClick={onPrevious}>{castStage ? t('cinematic.cast.backToSetup') : t('cinematic.actions.back')}</Button><Button variant="primary" icon={<ArrowRight />} onClick={onNext} disabled={activeStage === 'finish' || nextDisabled}>{castStage ? t('cinematic.cast.continueToStoryPlan') : t('cinematic.actions.next')}</Button></div></Surface>;
}

function hasIncompleteRequiredCast(project?: CinematicProject) {
  if (!project?.setup?.storyRoleSlots?.length) return false;
  return project.setup.storyRoleSlots.some(role => (
    role.importance === 'required'
    && !project.castAssignments.some(assignment => assignment.identityReady
      && assignment.looks.some(isProductionReadyBoundLook) && (
      assignment.storyRoleSlotId === role.id
      || (!assignment.storyRoleSlotId && assignment.storyRole.trim().toLowerCase() === role.label.trim().toLowerCase())
    ))
  ));
}

function activeCharacterLookVersion(look: CharacterLook) {
  return look.versions.find(version => version.id === look.activeVersionId) || null;
}

function isBoundCharacterLook(value: unknown, look: CharacterLook) {
  if (!isProductionReadyBoundLook(value)) return false;
  return value.characterLookId === look.id
    && value.characterLookVersionId === look.approvedVersionId;
}

function isProductionReadyBoundLook(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const look = value as Record<string, unknown>;
  return look.mode === 'character_look'
    && typeof look.characterLookId === 'string'
    && typeof look.characterLookVersionId === 'string'
    && look.coverage === 'multi_view'
    && look.locked === true
    && Array.isArray(look.assetIds)
    && look.assetIds.length > 0;
}
