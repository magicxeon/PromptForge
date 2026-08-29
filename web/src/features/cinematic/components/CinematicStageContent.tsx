import {
  ArrowLeft, ArrowRight, Check, Clock3, Film, Image as ImageIcon,
  Play, Plus, RotateCcw, Shirt, Sparkles, Trash2, Upload, UserRound, WandSparkles
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
import { CharacterPickerDialog, SceneDirectorDialog, type CharacterCandidate } from './CinematicDialogs';
import { CharacterLookDialog, type CharacterLookDialogMode } from '../../profiles/components/CharacterLookDialog';
import { CinematicControlLevel } from './CinematicControlLevel';
import { ContextualOperationDock } from './ContextualOperationDock';
import { StoryboardSequenceBoard, type StoryboardShotSummary } from './StoryboardSequenceBoard';
import {
  approveCinematicStoryboardSource, reorderCinematicSceneShots, saveCinematicStoryPlan,
  saveCinematicTimeline, updateCinematicShotDirection, upsertCinematicCast, removeCinematicCast,
  upsertCinematicWardrobeLook, approveCinematicVideoAttempt, createCinematicVideoAttempt,
  quoteCinematicVideoAttempt, getCinematicVideoCapabilityCatalog
} from '../api/cinematicApi';
import { getVideoTask } from '../../generation/api/videoGenerationApi';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';
import { listCharacterLooks } from '../../profiles/api/profileApi';
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
  const castBlocked = activeStage === 'cast' && hasUnassignedRequiredRoles(project);
  return <div className="cinematic-stage-content" data-testid={`cinematic-stage-${activeStage}`}>
    {activeStage === 'cast' && <CastStage mode={mode} onModeChange={onModeChange} project={project} onProjectChanged={onProjectChanged} onAddCastCharacter={onAddCastCharacter} onRemoveCastCharacter={onRemoveCastCharacter} />}
    {activeStage === 'story-plan' && <StoryPlanStage project={project} onProjectChanged={onProjectChanged} />}
    {activeStage === 'storyboard' && <StoryboardStage project={project} onProjectRefresh={onProjectRefresh} />}
    {activeStage === 'produce' && <ProduceStage project={project} onEditStoryboard={() => onOpenStage?.('storyboard')} onProjectRefresh={onProjectRefresh} />}
    {activeStage === 'finish' && <FinishStage project={project} onProjectChanged={onProjectChanged} />}
    <StageFooter activeStage={activeStage} onPrevious={onPrevious} onNext={onNext} nextDisabled={castBlocked} />
  </div>;
}

function StageHeading({ stage, action }: { stage: CinematicStage; action?: ReactNode }) {
  const { t } = useTranslation('cinematic');
  return <header className={`cinematic-stage-heading${action ? ' cinematic-stage-heading--with-control' : ''}`}><div><p>{t(`cinematic.stage.${stage}.eyebrow`)}</p><h2>{t(`cinematic.stage.${stage}.title`)}</h2>{stage === 'cast' ? <small>{t('cinematic.stage.cast.description')}</small> : null}</div>{action || (stage !== 'cast' ? <span className="cinematic-prototype-badge">{t('cinematic.prototype.badge')}</span> : null)}</header>;
}

function CastStage({ mode, onModeChange, project, onProjectChanged, onAddCastCharacter, onRemoveCastCharacter }: { mode: 'simple' | 'advanced'; onModeChange?: (mode: 'simple' | 'advanced') => void; project?: CinematicProject; onProjectChanged?: (project: CinematicProject) => void; onAddCastCharacter?: Props['onAddCastCharacter']; onRemoveCastCharacter?: Props['onRemoveCastCharacter'] }) {
  const { t } = useTranslation('cinematic');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [lookDialogOpen, setLookDialogOpen] = useState(false);
  const [lookDialogMode, setLookDialogMode] = useState<CharacterLookDialogMode>('upload');
  const [characterLooks, setCharacterLooks] = useState<CharacterLook[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'direction' | 'wardrobe' | 'continuity'>('direction');
  const [dossierSaveState, setDossierSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'failed'>('idle');
  const [removingCharacter, setRemovingCharacter] = useState(false);
  const dossierSaveTimer = useRef<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState(project?.castAssignments[0]?.id || 'mira');
  const selectedAssignment = project?.castAssignments.find(item => item.id === selectedCharacter);
  const selectedCharacterProfileId = selectedAssignment?.characterProfileId;
  const selectedCharacterProfileVersionId = selectedAssignment?.characterProfileVersionId;
  const selectedRole = selectedAssignment?.storyImportance === 'protagonist' ? 'lead' : 'supporting';
  const selectedObjective = selectedAssignment?.objective
    || (selectedCharacter === 'mira' ? t('cinematic.cast.miraObjective') : t('cinematic.cast.noahObjective'));
  const selectedTraits = selectedAssignment?.personalityTraits.join(', ')
    || (selectedCharacter === 'mira' ? t('cinematic.cast.miraTraits') : t('cinematic.cast.noahTraits'));
  const selectedPerformance = selectedAssignment?.performanceDirection
    || (selectedCharacter === 'mira' ? t('cinematic.cast.miraPerformance') : t('cinematic.cast.noahPerformance'));
  const selectedLookName = selectedAssignment?.looks[0] && typeof selectedAssignment.looks[0] === 'object'
    && 'name' in selectedAssignment.looks[0]
    ? String(selectedAssignment.looks[0].name)
    : selectedAssignment ? t('cinematic.cast.characterWardrobe')
      : selectedCharacter === 'mira' ? t('cinematic.cast.lookArrival') : t('cinematic.cast.lookPlatform');
  const hasBoundLook = !project || Boolean(selectedAssignment?.looks.length);
  const [castError, setCastError] = useState<string | null>(null);
  const roleSlots = project?.setup?.storyRoleSlots || [];
  const assignmentForRole = (role: (typeof roleSlots)[number]) => project?.castAssignments.find(assignment => (
    assignment.storyRoleSlotId === role.id
    || (!assignment.storyRoleSlotId && assignment.storyRole.trim().toLowerCase() === role.label.trim().toLowerCase())
  ));
  const isRoleAssigned = (role: (typeof roleSlots)[number]) => Boolean(assignmentForRole(role));
  const isRoleReady = (role: (typeof roleSlots)[number]) => Boolean(assignmentForRole(role)?.identityReady);
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
    const assignmentId = `cinecast_${character.id}`;
    const plannedRole = roleSlots.find(role => role.id === pendingRoleId) || nextUnfilledRole;
    const storyImportance = project.castAssignments.length ? 'supporting' : 'protagonist';
    const roleDirection = castDirectionFromRole(plannedRole);
    const input = {
      assignmentId,
      characterProfileId: character.id,
      characterProfileVersionId: character.characterProfileVersionId,
      displayName: character.displayName,
      storyImportance,
      storyRole: plannedRole?.label || (storyImportance === 'protagonist' ? 'Lead' : 'Supporting'),
      storyRoleSlotId: plannedRole?.id || null,
      ...roleDirection
    } as const;
    try {
      const saved = onAddCastCharacter
        ? await onAddCastCharacter(input)
        : await upsertCinematicCast(project.id, assignmentId, { expectedVersion: project.version, ...input });
      setSelectedCharacter(assignmentId);
      setPendingRoleId(null);
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
  async function addCharacterWardrobeLook() {
    if (!project || !selectedAssignment) return;
    setCastError(null);
    try {
      const saved = await upsertCinematicWardrobeLook(
        project.id,
        selectedAssignment.id,
        `cinelook_default_${selectedAssignment.id}`,
        {
          expectedVersion: project.version,
          name: t('cinematic.cast.characterWardrobe'),
          mode: 'character_default',
          locked: true
        }
      );
      onProjectChanged?.(saved);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    }
  }
  async function bindCharacterLook(look: CharacterLook) {
    if (!project || !selectedAssignment || !look.approvedVersionId) return;
    setCastError(null);
    try {
      const saved = await upsertCinematicWardrobeLook(
        project.id,
        selectedAssignment.id,
        `cinelook_${look.id}`,
        {
          expectedVersion: project.version,
          name: look.name,
          mode: 'character_look',
          characterLookId: look.id,
          characterLookVersionId: look.approvedVersionId,
          coverage: 'multi_view',
          locked: true
        }
      );
      onProjectChanged?.(saved);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
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
          const assignmentReady = Boolean(assignment?.identityReady);
          return <article key={role.id} className={assignment ? (assignmentReady ? 'is-assigned' : 'is-needs-preparation') : 'is-unassigned'}>
            <CharacterPortrait portraitUrl={cinematicCastPortraitUrl(assignment)} tone="cyan" />
            <div><span>{role.label} <small>{t(`cinematic.roleImportance.${role.importance}`)}</small></span><strong>{assignment?.displayName || t('cinematic.cast.needsCharacter')}</strong><p>{assignment && !assignmentReady ? t('cinematic.cast.needsPreparation') : (role.storyFunction || t('cinematic.cast.roleFunctionMissing'))}</p></div>
            <Button size="sm" variant={assignment ? 'ghost' : 'primary'} onClick={() => { setPendingRoleId(role.id); setPickerOpen(true); }}>{assignment ? t('cinematic.cast.changeCharacter') : t('cinematic.cast.chooseForRole')}</Button>
          </article>;
        })}
      </div>
    </section> : <p className="cinematic-cast-plan-notice">{t('cinematic.cast.noRolePlan')}</p>}
    <div className="cinematic-character-workspace">
      <section className="cinematic-work-panel cinematic-project-cast-panel">
        <SectionHeading title={t('cinematic.cast.projectCast')} hint={t('cinematic.cast.castSummaryHint')} action={<Button size="sm" icon={<Plus aria-hidden="true" />} disabled={Boolean(roleSlots.length) && !nextUnfilledRole} title={Boolean(roleSlots.length) && !nextUnfilledRole ? t('cinematic.cast.allRolesAssigned') : undefined} onClick={() => { setPendingRoleId(nextUnfilledRole?.id || null); setPickerOpen(true); }}>{t('cinematic.cast.addCharacter')}</Button>} />
        <div className="cinematic-project-cast-summary" aria-label={t('cinematic.cast.castSummary')}>
          <span><strong>{project?.castAssignments.length || 0}</strong><small>{t('cinematic.cast.charactersInProject')}</small></span>
          <span><strong>{roleSlots.length}</strong><small>{t('cinematic.cast.plannedRoles')}</small></span>
        </div>
        <div className="cinematic-character-dossier-list">
          {orderedRoleSlots.map(role => {
            const assignment = assignmentForRole(role);
            return assignment
              ? <CastCard key={role.id} active={selectedCharacter === assignment.id} onSelect={() => setSelectedCharacter(assignment.id)} role={role.label} required={role.importance === 'required'} name={assignment.displayName} portraitUrl={cinematicCastPortraitUrl(assignment)} identityReady={assignment.identityReady} personality={assignment.personalityTraits.join(' / ') || assignment.objective || t('cinematic.cast.identityReady')} look={assignment.looks.length ? String((assignment.looks[0] as { name?: string })?.name || t('cinematic.cast.characterWardrobe')) : t('cinematic.cast.characterWardrobe')} scenes={project?.scenes.length ? String(project.scenes.length) : null} tone="cyan" />
              : <button key={role.id} type="button" className="cinematic-unassigned-cast-card" onClick={() => { setPendingRoleId(role.id); setPickerOpen(true); }}><CharacterPortrait tone="cyan" /><span><strong>{role.label}</strong><small>{t(`cinematic.roleImportance.${role.importance}`)}</small><b>{t('cinematic.cast.noCharacterAssigned')}</b><em>{role.storyFunction}</em></span></button>;
          })}
          {!roleSlots.length && project?.castAssignments.map(assignment => <CastCard key={assignment.id} active={selectedCharacter === assignment.id} onSelect={() => setSelectedCharacter(assignment.id)} role={assignment.storyRole} required={assignment.storyImportance === 'protagonist'} name={assignment.displayName} portraitUrl={cinematicCastPortraitUrl(assignment)} identityReady={assignment.identityReady} personality={assignment.personalityTraits.join(' / ') || assignment.objective || t('cinematic.cast.identityReady')} look={assignment.looks.length ? t('cinematic.cast.lookArrival') : t('cinematic.cast.characterWardrobe')} scenes={project?.scenes.length ? String(project.scenes.length) : null} tone="cyan" />)}
          {!project ? <><CastCard active={selectedCharacter === 'mira'} onSelect={() => setSelectedCharacter('mira')} role={t('cinematic.cast.lead')} name="Mira Chen" personality={t('cinematic.cast.miraTraits')} look={t('cinematic.cast.lookArrival')} scenes="3" tone="cyan" /><CastCard active={selectedCharacter === 'noah'} onSelect={() => setSelectedCharacter('noah')} role={t('cinematic.cast.supporting')} name="Noah Lin" personality={t('cinematic.cast.noahTraits')} look={t('cinematic.cast.lookPlatform')} scenes="2" tone="amber" /></> : null}
        </div>
      </section>
      {(!project || selectedAssignment) ? <aside key={selectedCharacter} className="cinematic-character-dossier">
        <header className="cinematic-dossier-header"><CharacterPortrait portraitUrl={cinematicCastPortraitUrl(selectedAssignment)} tone={selectedCharacter === 'noah' ? 'amber' : 'cyan'} /><div><span>{selectedAssignment?.storyRole || t('cinematic.cast.selectedCharacter')}</span><h3>{selectedAssignment?.displayName || (selectedCharacter === 'mira' ? 'Mira Chen' : 'Noah Lin')}</h3><p className={selectedAssignment && !selectedAssignment.identityReady ? 'is-needs-preparation' : ''}>{selectedAssignment && !selectedAssignment.identityReady ? <Clock3 aria-hidden="true" /> : <Check aria-hidden="true" />}{t(selectedAssignment && !selectedAssignment.identityReady ? 'cinematic.cast.needsPreparation' : 'cinematic.cast.identityReady')}</p><small>{selectedAssignment?.characterProfileVersionId ? t('cinematic.cast.profileVersionPinned') : t('cinematic.cast.projectOnlyChanges')}</small></div><div className="cinematic-dossier-header__status"><strong className={`is-${dossierSaveState}`}>{t(`cinematic.save.${dossierSaveState}`)}</strong><small>{t('cinematic.cast.projectOnlyChanges')}</small>{selectedAssignment ? <ConfirmDialog trigger={<Button size="sm" variant="ghost" icon={<Trash2 aria-hidden="true" />} disabled={removingCharacter}>{t('cinematic.cast.removeAssignment')}</Button>} title={t('cinematic.cast.removeTitle')} description={t('cinematic.cast.removeDescription', { name: selectedAssignment.displayName })} confirmLabel={t('cinematic.cast.removeConfirm')} destructive pending={removingCharacter} onConfirm={() => void removeSelectedCharacter()} /> : null}</div></header>
        <div className="cinematic-character-tabs" role="tablist" aria-label={t('cinematic.cast.characterDetails')}>
          {(['direction', 'wardrobe', 'continuity'] as const).map(tab => <button key={tab} type="button" role="tab" aria-selected={activeDetailTab === tab} className={activeDetailTab === tab ? 'is-active' : ''} onClick={() => setActiveDetailTab(tab)}>{t(`cinematic.cast.tab.${tab}`)}</button>)}
        </div>
        {activeDetailTab === 'direction' ? <form onSubmit={saveDossier} onChange={scheduleDossierSave}>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.rolePersonality')} hint={t('cinematic.cast.rolePersonalityHint')} /><div className="cinematic-dossier-fields"><label><span>{t('cinematic.cast.storyRole')}</span><input readOnly value={selectedAssignment?.storyRole || (selectedRole === 'lead' ? t('cinematic.cast.lead') : t('cinematic.cast.supporting'))} /><input type="hidden" name="storyImportance" value={selectedRole} /></label><label><span>{t('cinematic.cast.emotionalBaseline')}</span><select name="emotionalBaseline" defaultValue={selectedAssignment?.emotionalBaseline || 'guarded'}><option value="guarded">{t('cinematic.cast.guarded')}</option><option value="open">{t('cinematic.cast.open')}</option></select></label><label className="is-wide"><span>{t('cinematic.cast.objective')}</span><textarea name="objective" rows={2} defaultValue={selectedObjective} /></label><label className="is-wide"><span>{t('cinematic.cast.personality')}</span><input name="personalityTraits" defaultValue={selectedTraits} /></label>{mode === 'advanced' && <><label className="is-wide"><span>{t('cinematic.cast.motivation')}</span><textarea name="motivation" rows={2} defaultValue={selectedAssignment?.motivation || ''} /></label><label className="is-wide"><span>{t('cinematic.cast.pressure')}</span><textarea name="pressure" rows={2} defaultValue={selectedAssignment?.pressure || t('cinematic.cast.pressureValue')} /></label><label className="is-wide"><span>{t('cinematic.cast.dialogueStyle')}</span><input name="dialogueStyle" defaultValue={selectedAssignment?.dialogueStyle || t('cinematic.cast.dialogueStyleValue')} /></label></>}</div></section>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.performanceDirection')} hint={t('cinematic.cast.performanceDirectionHint')} /><textarea name="performanceDirection" rows={3} defaultValue={selectedPerformance} />{dossierSaveState === 'failed' ? <Button type="submit" size="sm" disabled={!selectedAssignment}>{t('cinematic.cast.saveDossier')}</Button> : null}</section>
        </form> : null}
        {activeDetailTab === 'wardrobe' ? <section className="cinematic-dossier-section">
          <SectionHeading title={t('cinematic.cast.wardrobeLooks')} hint={t('cinematic.cast.wardrobeOwnedHint')} action={<Button size="sm" icon={<Plus aria-hidden="true" />} disabled={!selectedAssignment} onClick={() => { setLookDialogMode('upload'); setLookDialogOpen(true); }}>{t('cinematic.cast.addLook')}</Button>} />
          <article className="cinematic-look-card"><div className="cinematic-look-card__preview"><Shirt aria-hidden="true" /></div><div><span>{t('cinematic.cast.primaryLook')}</span><h4>{hasBoundLook ? selectedLookName : t('cinematic.cast.noPrimaryLook')}</h4><p>{hasBoundLook ? t('cinematic.cast.sceneScope') : t('cinematic.cast.chooseLookHint')}</p></div><span className={`cinematic-status-pill${hasBoundLook ? ' is-ready' : ''}`}>{hasBoundLook ? t('cinematic.cast.locked') : t('cinematic.cast.lookNotReady')}</span></article>
          {characterLooks.map(look => <article className="cinematic-look-card" key={look.id}><div className="cinematic-look-card__preview"><Shirt aria-hidden="true" /></div><div><span>{t('cinematic.cast.characterLook')}</span><h4>{look.name}</h4><p>{t(`cinematic.lookStatus.${look.lifecycleStatus}`)}</p></div><Button size="sm" disabled={!look.approvedVersionId} onClick={() => void bindCharacterLook(look)}>{look.approvedVersionId ? t('cinematic.cast.useLook') : t('cinematic.cast.prepareLook')}</Button></article>)}
          <div className="cinematic-wardrobe-options">
            <button type="button" className="is-active" onClick={() => void addCharacterWardrobeLook()}><Shirt aria-hidden="true" /><strong>{t('cinematic.cast.characterWardrobe')}</strong><small>{t('cinematic.cast.characterWardrobeHint')}</small></button>
            <button type="button" disabled={!selectedAssignment} onClick={() => { setLookDialogMode('upload'); setLookDialogOpen(true); }}><Upload aria-hidden="true" /><strong>{t('cinematic.cast.uploadWardrobe')}</strong><small>{t('cinematic.cast.uploadForCharacter')}</small></button>
            <button type="button" disabled={!selectedAssignment} onClick={() => { setLookDialogMode('ai'); setLookDialogOpen(true); }}><Sparkles aria-hidden="true" /><strong>{t('cinematic.cast.aiWardrobe')}</strong><small>{t('cinematic.cast.aiWardrobeHint')}</small></button>
          </div>
        </section> : null}
        {activeDetailTab === 'continuity' ? <section className="cinematic-dossier-section cinematic-continuity-panel"><SectionHeading title={t('cinematic.cast.continuity')} hint={t('cinematic.cast.continuityHint')} /><ul><li className="is-ready"><Check aria-hidden="true" />{t('cinematic.cast.identityVersionReady')}</li><li className="is-ready"><Check aria-hidden="true" />{t('cinematic.cast.faceAuthorityReady')}</li><li className="is-ready"><Check aria-hidden="true" />{t('cinematic.cast.reuseRightsReady')}</li><li><Clock3 aria-hidden="true" />{selectedAssignment?.looks.length ? t('cinematic.cast.lookBound') : t('cinematic.cast.lookPreparationOptional')}</li><li><Clock3 aria-hidden="true" />{project?.scenes.length ? t('cinematic.cast.sceneContinuityReady') : t('cinematic.cast.scenesNotPlanned')}</li></ul><label className="cinematic-check-row"><input type="checkbox" defaultChecked />{t('cinematic.cast.lockWardrobe')}</label>{mode === 'advanced' && <label className="cinematic-check-row"><input type="checkbox" disabled={!project?.scenes.length} />{t('cinematic.cast.allowSceneChanges')}</label>}</section> : null}
      </aside> : <aside className="cinematic-character-dossier cinematic-character-dossier--empty"><UserRound aria-hidden="true" /><h3>{t('cinematic.cast.addCharacter')}</h3><p>{t('cinematic.cast.charactersHint')}</p></aside>}
    </div>
    {castError ? <p role="alert" className="text-sm text-red-400">{castError}</p> : null}
    <CharacterPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={addCharacter} />
    {selectedAssignment ? <CharacterLookDialog open={lookDialogOpen} onOpenChange={setLookDialogOpen} initialMode={lookDialogMode} characterProfileId={selectedAssignment.characterProfileId} characterProfileVersionId={selectedAssignment.characterProfileVersionId} onSaved={look => setCharacterLooks(current => [look, ...current.filter(item => item.id !== look.id)])} /> : null}
  </>;
}

export function castDirectionFromRole(role?: CinematicProject['setup']['storyRoleSlots'][number]) {
  return {
    objective: role?.objective || '',
    personalityTraits: role?.personalityTraits || [],
    emotionalBaseline: role?.emotionalArc || '',
    performanceDirection: role?.performanceDirection || ''
  };
}

function CastCard({ role, required = false, name, portraitUrl, identityReady = true, personality, look, scenes, tone, active, onSelect }: { role: string; required?: boolean; name: string; portraitUrl?: string | null; identityReady?: boolean; personality: string; look: string; scenes: string | null; tone: 'cyan' | 'amber'; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('cinematic');
  return <button type="button" className={`cinematic-cast-card${active ? ' is-active' : ''}${identityReady ? '' : ' is-needs-preparation'}`} onClick={onSelect}><CharacterPortrait portraitUrl={portraitUrl} tone={tone} /><div className="cinematic-cast-card__body"><span>{role}{required ? <b>{t('cinematic.roleImportance.required')}</b> : null}</span><h4>{name}</h4><small>{personality}</small><p>{identityReady ? <Check aria-hidden="true" /> : <Clock3 aria-hidden="true" />} {t(identityReady ? 'cinematic.cast.identityReady' : 'cinematic.cast.needsPreparation')}</p><div className="cinematic-card-facts"><span>{look}</span><span>{scenes ? `${scenes} ${t('cinematic.cast.scenes')}` : t('cinematic.cast.scenesNotPlanned')}</span></div></div></button>;
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
  const [directorOpen, setDirectorOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const sceneCount = project?.scenes.length || 3;
  const shotCount = project?.scenes.reduce((total, scene) => total + scene.shots.length, 0) || 8;
  const runtimeSeconds = (project?.scenes.reduce((total, scene) => total + scene.durationMs, 0) ?? 30000) / 1000;
  async function savePlan() {
    if (!project) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      onProjectChanged?.(await saveCinematicStoryPlan(project.id, createStarterStoryPlan(project, t)));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setSaveState('idle');
    }
  }
  return <>
    <StageHeading stage="story-plan" />
    <div className="cinematic-story-layout">
      <section className="cinematic-work-panel">
        <SectionHeading title={t('cinematic.story.beats')} hint={t('cinematic.story.beatsHint')} action={<Button size="sm" icon={<WandSparkles aria-hidden="true" />} disabled={saveState === 'saving' || !project} onClick={() => void savePlan()}>{project?.scenes.length ? t('cinematic.story.savePlan') : t('cinematic.story.createStarterPlan')}</Button>} />
        <ol className="cinematic-beat-list">{beats.map((beat, index) => <li key={beat}><span>{index + 1}</span><div><h4>{t(`cinematic.story.${beat}`)}</h4><p>{t(`cinematic.story.${beat}Description`)}</p></div><Button size="sm" variant="ghost" onClick={() => setDirectorOpen(true)}>{t('cinematic.story.expand')}</Button></li>)}</ol>
      </section>
      <aside className="cinematic-inspector"><h3>{t('cinematic.story.arc')}</h3><div className="cinematic-arc"><span /><span /><span /><span /><span /></div><LabeledValue icon={<Film />} label={t('cinematic.story.scenes')} value={String(sceneCount)} /><LabeledValue icon={<ImageIcon />} label={t('cinematic.story.estimatedShots')} value={String(shotCount)} /><LabeledValue icon={<Clock3 />} label={t('cinematic.story.runtime')} value={`${runtimeSeconds.toFixed(1)}s`} /><ContextualOperationDock title={t('cinematic.story.operationTitle')} description={t('cinematic.story.operationDescription')} operation={t('cinematic.story.operation')} credits={5} actionLabel={t('cinematic.story.generate')} /></aside>
    </div>
    {saveError ? <p role="alert" className="text-sm text-red-400">{saveError}</p> : null}
    <SceneDirectorDialog open={directorOpen} onOpenChange={setDirectorOpen} />
  </>;
}

function StoryboardStage({ project, onProjectRefresh }: { project?: CinematicProject; onProjectRefresh?: () => void }) {
  const { t } = useTranslation('cinematic');
  const sourceScenes = project?.scenes.length ? project.scenes : null;
  const [selectedSceneId, setSelectedSceneId] = useState(sourceScenes?.[0]?.id || 'preview-scene');
  const activeScene = sourceScenes?.find(scene => scene.id === selectedSceneId) || sourceScenes?.[0];
  const [selectedShot, setSelectedShot] = useState(activeScene?.shots[0]?.id || '01A');
  const [scope, setScope] = useState<'shot' | 'set'>('shot');
  const selectedShotRecord = activeScene?.shots.find(shot => shot.id === selectedShot) || activeScene?.shots[0];
  const defaultPrompt = selectedShotRecord?.prompt || t('cinematic.storyboard.promptFixture');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [jobId, setJobId] = useState('');
  const [approveState, setApproveState] = useState<'idle' | 'saving'>('idle');
  const [editState, setEditState] = useState<'idle' | 'saving'>('idle');
  const [approveError, setApproveError] = useState<string | null>(null);
  const [shotOrder, setShotOrder] = useState<string[]>(activeScene?.shotOrder || storyboardShotFixtures.map(shot => shot.id));
  const orderedShots = activeScene ? shotOrder.map(id => activeScene.shots.find(shot => shot.id === id)).filter(Boolean).map(shot => ({ id: shot!.id, durationSeconds: shot!.durationMs / 1000, title: shot!.title, framing: shot!.framing, action: shot!.blocking || shot!.purpose, status: shot!.approvedStoryboardSource ? 'ready' : shot!.storyboardStatus === 'warning' ? 'warning' : 'draft' } satisfies StoryboardShotSummary)) : shotOrder.map(id => storyboardShotFixtures.find(shot => shot.id === id)!).map(shot => ({ id: shot.id, durationSeconds: shot.durationSeconds, title: t(`cinematic.storyboard.fixture.${shot.titleKey}`), framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`), action: t(`cinematic.storyboard.fixture.${shot.actionKey}`), status: shot.status } satisfies StoryboardShotSummary));
  async function moveShot(shotId: string, direction: 'earlier' | 'later') {
    const next = moveItem(shotOrder, shotId, direction);
    if (next === shotOrder) return;
    setShotOrder(next);
    if (!project || !activeScene) return;
    setEditState('saving');
    try {
      await reorderCinematicSceneShots(project.id, activeScene.id, { expectedVersion: project.version, shotIds: next });
      onProjectRefresh?.();
    } catch (error) {
      setShotOrder(activeScene.shotOrder);
      setApproveError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setEditState('idle');
    }
  }
  async function saveDirection() {
    if (!project || !activeScene || !selectedShotRecord) return;
    setEditState('saving');
    setApproveError(null);
    try {
      await updateCinematicShotDirection(project.id, activeScene.id, selectedShotRecord.id, {
        expectedVersion: project.version,
        expectedShotVersion: selectedShotRecord.version,
        prompt
      });
      onProjectRefresh?.();
    } catch (error) {
      setApproveError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setEditState('idle');
    }
  }
  async function approveSource() {
    if (!project || !selectedShotRecord) return;
    setApproveState('saving');
    setApproveError(null);
    try {
      await approveCinematicStoryboardSource(project.id, selectedShotRecord.id, {
        expectedVersion: project.version,
        expectedShotVersion: selectedShotRecord.version,
        jobId,
        idempotencyKey: `storyboard:${project.id}:${selectedShotRecord.id}:${jobId}`
      });
      setJobId('');
      onProjectRefresh?.();
    } catch (error) {
      setApproveError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setApproveState('idle');
    }
  }
  function selectShot(shotId: string) {
    setSelectedShot(shotId);
    const shot = activeScene?.shots.find(item => item.id === shotId);
    setPrompt(shot?.prompt || t('cinematic.storyboard.promptFixture'));
    window.requestAnimationFrame(() => focusAnchor(`shot-editor-${shotId}`));
  }
  return <>
    <StageHeading stage="storyboard" />
    <div className="cinematic-shot-workspace">
      <SceneNavigator scenes={sourceScenes || undefined} activeSceneId={activeScene?.id} onSelectScene={sceneId => { const scene = sourceScenes?.find(item => item.id === sceneId); setSelectedSceneId(sceneId); if (scene?.shots[0]) selectShot(scene.shots[0].id); }} />
      <section className="cinematic-shot-editor">
        <StoryboardSequenceBoard sceneId={activeScene?.id} sceneTitle={activeScene?.title || t('cinematic.storyboard.sceneOne')} sceneDurationSeconds={(activeScene?.durationMs || 12500) / 1000} shots={orderedShots} selectedShotId={selectedShot} onSelectShot={selectShot} onMoveShot={moveShot} />
        <section id={`shot-editor-${selectedShot}`} className="cinematic-focused-shot" aria-label={`${t('cinematic.storyboard.editShot')} ${selectedShot}`} tabIndex={-1}>
          <header><div><span>{t('cinematic.storyboard.selectedShot')}</span><h3>{t('cinematic.storyboard.shot')} {selectedShot}</h3></div><div><Button size="sm" variant="ghost" onClick={() => focusAnchor(`storyboard-shot-${selectedShot}`)}>{t('cinematic.storyboard.backToSequence')}</Button><strong><Clock3 aria-hidden="true" />{orderedShots.find(shot => shot.id === selectedShot)?.durationSeconds ?? 0}s</strong></div></header>
          {selectedShotRecord?.approvedStoryboardSource ? <img className="cinematic-approved-source" src={selectedShotRecord.approvedStoryboardSource.imageUrl} alt="" /> : <CinematicResultPlaceholder type="image" />}
          <div className="cinematic-shot-editor__form"><label><span>{t('cinematic.storyboard.prompt')}</span><textarea rows={6} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><div className="cinematic-shot-direction-summary"><LabeledValue label={t('cinematic.storyboard.framing')} value={selectedShotRecord?.framing || t('cinematic.storyboard.mediumClose')} /><LabeledValue label={t('cinematic.storyboard.performance')} value={selectedShotRecord?.performance || t('cinematic.storyboard.heldBreath')} /></div><div className="flex flex-wrap gap-2"><Button size="sm" icon={<RotateCcw aria-hidden="true" />} onClick={() => setPrompt(defaultPrompt)}>{t('cinematic.storyboard.reset')}</Button>{project ? <Button size="sm" variant="primary" disabled={!prompt.trim() || editState === 'saving'} onClick={() => void saveDirection()}>{t('cinematic.storyboard.saveDirection')}</Button> : null}</div></div>
          {project && selectedShotRecord ? <div className="cinematic-source-approval"><label><span>{t('cinematic.storyboard.generatedJobId')}</span><input value={jobId} onChange={event => setJobId(event.target.value)} placeholder="job_..." /></label><Button size="sm" disabled={!jobId.trim() || approveState === 'saving'} onClick={() => void approveSource()}>{t('cinematic.storyboard.approveSource')}</Button>{approveError ? <p role="alert">{approveError}</p> : null}</div> : null}
          <AttemptHistory type="image" />
        </section>
      </section>
      <aside className="cinematic-sticky-generation-panel"><ContextualOperationDock media title={t('cinematic.storyboard.operationTitle')} description={t('cinematic.storyboard.operationDescription')} operation={`${t('cinematic.storyboard.shot')} ${selectedShot}`} credits={scope === 'set' ? 32 : 8} actionLabel={scope === 'set' ? t('cinematic.storyboard.generateSet') : t('cinematic.storyboard.previewStill')}><GenerationScopeControl scope={scope} onScopeChange={setScope} eligible={scope === 'set' ? 4 : 1} blocked={scope === 'set' ? 0 : undefined} unitCredits={8} /><div className="cinematic-sticky-engine-fields"><label><span>{t('cinematic.engine.provider')}</span><select defaultValue="gemini"><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label><label><span>{t('cinematic.engine.model')}</span><select defaultValue="flash"><option value="flash">Flash Image</option><option value="quality">Quality Image</option></select></label><label><span>{t('cinematic.engine.aspectRatio')}</span><select defaultValue="9:16"><option value="9:16">9:16</option><option value="16:9">16:9</option></select></label><label><span>{t('cinematic.engine.outputs')}</span><select defaultValue="1"><option value="1">1</option><option value="2">2</option><option value="4">4</option></select></label></div></ContextualOperationDock></aside>
    </div>
  </>;
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
    if (!selectedModel.durations.includes(durationSeconds)) setDurationSeconds(selectedModel.durations[0] || 4);
    if (!selectedModel.audioModes.includes(audioMode)) setAudioMode((selectedModel.audioModes[0] || 'none') as 'none' | 'generated');
  }, [audioMode, durationSeconds, resolution, selectedModel]);
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
      <aside className="cinematic-sticky-generation-panel"><ContextualOperationDock media title={t('cinematic.produce.operationTitle')} description={t('cinematic.produce.operationDescription')} operation={`${t('cinematic.storyboard.shot')} ${selectedShot}`} credits={quote.data?.estimate.estimatedCredits} actionLabel={t('cinematic.produce.generate')} disabled={!quote.data?.account.canAfford || !source || submit.isPending || isRunning} loading={quote.isFetching || submit.isPending} notice={!source ? t('cinematic.produce.sourceRequired') : quote.error?.message || t('cinematic.produce.lockedEstimate')} onAction={() => submit.mutate()}><div className="cinematic-sticky-engine-fields"><label><span>{t('cinematic.engine.provider')}</span><select value={selectedModel?.providerId || ''} onChange={event => { const model = models.find(item => item.providerId === event.target.value); if (model) setModelKey(`${model.providerId}:${model.modelId}`); }}>{[...new Set(models.map(model => model.providerId))].map(provider => <option key={provider} value={provider}>{provider}</option>)}</select></label><label><span>{t('cinematic.engine.model')}</span><select value={modelKey} onChange={event => setModelKey(event.target.value)}>{models.filter(model => model.providerId === selectedModel?.providerId).map(model => <option key={`${model.providerId}:${model.modelId}`} value={`${model.providerId}:${model.modelId}`}>{model.displayName}</option>)}</select></label><label><span>{t('cinematic.engine.duration')}</span><select value={durationSeconds} onChange={event => setDurationSeconds(Number(event.target.value))}>{selectedModel?.durations.map(value => <option key={value} value={value}>{value}s</option>)}</select></label><label><span>{t('cinematic.engine.resolution')}</span><select value={resolution} onChange={event => setResolution(event.target.value)}>{selectedModel?.resolutions.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div></ContextualOperationDock></aside>
    </div>
  </>;
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

function focusAnchor(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

function createStarterStoryPlan(project: CinematicProject, t: (key: string) => string) {
  const durationPerShot = Math.max(1000, Math.round(project.durationTargetMs / 4));
  return {
    expectedVersion: project.version,
    objective: project.setup.storyBrief,
    logline: project.setup.storyBrief,
    approved: true,
    source: 'manual' as const,
    beats: beats.map(beat => ({ id: beat, title: t(`cinematic.story.${beat}`), description: t(`cinematic.story.${beat}Description`) })),
    scenes: [{
      id: project.scenes[0]?.id,
      title: t('cinematic.storyboard.sceneOne'),
      purpose: project.setup.storyBrief,
      location: '', time: '', emotionalStart: '', emotionalEnd: '', transitionIntent: 'cut',
      shots: storyboardShotFixtures.map((shot, index) => ({
        id: project.scenes[0]?.shots[index]?.id,
        title: t(`cinematic.storyboard.fixture.${shot.titleKey}`),
        purpose: t(`cinematic.storyboard.fixture.${shot.actionKey}`),
        durationMs: durationPerShot,
        framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`),
        blocking: t(`cinematic.storyboard.fixture.${shot.actionKey}`),
        prompt: t('cinematic.storyboard.promptFixture')
      }))
    }]
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
function StageFooter({ activeStage, onPrevious, onNext, nextDisabled = false }: Pick<Props, 'activeStage' | 'onPrevious' | 'onNext'> & { nextDisabled?: boolean }) {
  const { t } = useTranslation('cinematic');
  const castStage = activeStage === 'cast';
  return <Surface className="cinematic-stage-footer"><div><strong>{castStage ? t(nextDisabled ? 'cinematic.cast.castIncomplete' : 'cinematic.cast.requiredCastReady') : t('cinematic.prototype.title')}</strong><p>{castStage ? t(nextDisabled ? 'cinematic.cast.requiredRolesBlocking' : 'cinematic.cast.readyToContinue') : t('cinematic.prototype.description')}</p></div><div><Button icon={<ArrowLeft />} onClick={onPrevious}>{castStage ? t('cinematic.cast.backToSetup') : t('cinematic.actions.back')}</Button><Button variant="primary" icon={<ArrowRight />} onClick={onNext} disabled={activeStage === 'finish' || nextDisabled}>{castStage ? t('cinematic.cast.continueToStoryPlan') : t('cinematic.actions.next')}</Button></div></Surface>;
}

function hasUnassignedRequiredRoles(project?: CinematicProject) {
  if (!project?.setup?.storyRoleSlots?.length) return false;
  return project.setup.storyRoleSlots.some(role => (
    role.importance === 'required'
    && !project.castAssignments.some(assignment => assignment.identityReady && (
      assignment.storyRoleSlotId === role.id
      || (!assignment.storyRoleSlotId && assignment.storyRole.trim().toLowerCase() === role.label.trim().toLowerCase())
    ))
  ));
}
