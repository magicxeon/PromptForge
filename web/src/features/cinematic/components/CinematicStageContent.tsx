import {
  ArrowLeft, ArrowRight, Check, Clock3, Film, Image as ImageIcon,
  Play, Plus, RotateCcw, Shirt, Sparkles, Upload, UserRound, WandSparkles
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import type { CinematicStage } from '../cinematicStages';
import { CharacterPickerDialog, SceneDirectorDialog } from './CinematicDialogs';
import { ContextualOperationDock } from './ContextualOperationDock';
import { StoryboardSequenceBoard, type StoryboardShotSummary } from './StoryboardSequenceBoard';
import {
  approveCinematicStoryboardSource, reorderCinematicSceneShots, saveCinematicStoryPlan,
  saveCinematicTimeline, updateCinematicShotDirection, upsertCinematicCast,
  upsertCinematicWardrobeLook
} from '../api/cinematicApi';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';

type Props = {
  activeStage: CinematicStage;
  mode?: 'simple' | 'advanced';
  onModeChange?: (mode: 'simple' | 'advanced') => void;
  onPrevious: () => void;
  onNext: () => void;
  project?: CinematicProject;
  onProjectChanged?: (project: CinematicProject) => void;
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

export function CinematicStageContent({ activeStage, mode = 'simple', onModeChange, onPrevious, onNext, project, onProjectChanged, onProjectRefresh, onOpenStage }: Props) {
  return <div className="cinematic-stage-content" data-testid={`cinematic-stage-${activeStage}`}>
    {activeStage === 'cast' && <CastStage mode={mode} onModeChange={onModeChange} project={project} onProjectChanged={onProjectChanged} />}
    {activeStage === 'story-plan' && <StoryPlanStage project={project} onProjectChanged={onProjectChanged} />}
    {activeStage === 'storyboard' && <StoryboardStage project={project} onProjectRefresh={onProjectRefresh} />}
    {activeStage === 'produce' && <ProduceStage project={project} onEditStoryboard={() => onOpenStage?.('storyboard')} />}
    {activeStage === 'finish' && <FinishStage project={project} onProjectChanged={onProjectChanged} />}
    <StageFooter activeStage={activeStage} onPrevious={onPrevious} onNext={onNext} />
  </div>;
}

function StageHeading({ stage }: { stage: CinematicStage }) {
  const { t } = useTranslation('cinematic');
  return <header className="cinematic-stage-heading"><div><p>{t(`cinematic.stage.${stage}.eyebrow`)}</p><h2>{t(`cinematic.stage.${stage}.title`)}</h2></div><span className="cinematic-prototype-badge">{t('cinematic.prototype.badge')}</span></header>;
}

function CastStage({ mode, onModeChange, project, onProjectChanged }: { mode: 'simple' | 'advanced'; onModeChange?: (mode: 'simple' | 'advanced') => void; project?: CinematicProject; onProjectChanged?: (project: CinematicProject) => void }) {
  const { t } = useTranslation('cinematic');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(project?.castAssignments[0]?.id || 'mira');
  const selectedAssignment = project?.castAssignments.find(item => item.id === selectedCharacter);
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
  const [castError, setCastError] = useState<string | null>(null);
  async function addCharacter(character: { id: string; displayName: string; characterProfileVersionId: string }) {
    if (!project || !character.characterProfileVersionId) return;
    setCastError(null);
    try {
      const saved = await upsertCinematicCast(project.id, `cinecast_${character.id}`, {
        expectedVersion: project.version,
        characterProfileId: character.id,
        characterProfileVersionId: character.characterProfileVersionId,
        displayName: character.displayName,
        storyImportance: project.castAssignments.length ? 'supporting' : 'protagonist',
        storyRole: project.castAssignments.length ? 'Supporting' : 'Lead'
      });
      setSelectedCharacter(`cinecast_${character.id}`);
      onProjectChanged?.(saved);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    }
  }
  async function saveDossier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !selectedAssignment) return;
    const values = new FormData(event.currentTarget);
    setCastError(null);
    try {
      const saved = await upsertCinematicCast(project.id, selectedAssignment.id, {
        expectedVersion: project.version,
        characterProfileId: selectedAssignment.characterProfileId,
        characterProfileVersionId: selectedAssignment.characterProfileVersionId,
        displayName: selectedAssignment.displayName,
        storyImportance: values.get('storyImportance') === 'lead' ? 'protagonist' : 'supporting',
        storyRole: values.get('storyImportance') === 'lead' ? 'Lead' : 'Supporting',
        objective: String(values.get('objective') || ''),
        pressure: String(values.get('pressure') || ''),
        personalityTraits: String(values.get('personalityTraits') || '').split(',').map(value => value.trim()).filter(Boolean),
        emotionalBaseline: String(values.get('emotionalBaseline') || ''),
        dialogueStyle: String(values.get('dialogueStyle') || ''),
        performanceDirection: String(values.get('performanceDirection') || '')
      });
      onProjectChanged?.(saved);
    } catch (error) {
      setCastError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    }
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
  return <>
    <StageHeading stage="cast" />
    <div className="cinematic-mode-row" aria-label={t('cinematic.mode.label')}>
      <span>{t('cinematic.mode.control')}</span>
      <div>{(['simple', 'advanced'] as const).map(item => <Button key={item} size="sm" variant={mode === item ? 'primary' : 'ghost'} onClick={() => onModeChange?.(item)}>{t(`cinematic.mode.${item}`)}</Button>)}</div>
      <small>{t(`cinematic.mode.${mode}Hint`)}</small>
    </div>
    <div className="cinematic-character-workspace">
      <section className="cinematic-work-panel">
        <SectionHeading title={t('cinematic.cast.characters')} hint={t('cinematic.cast.charactersHint')} action={<Button size="sm" icon={<Plus aria-hidden="true" />} onClick={() => setPickerOpen(true)}>{t('cinematic.cast.addCharacter')}</Button>} />
        <div className="cinematic-character-dossier-list">
          {project?.castAssignments.map(assignment => <CastCard key={assignment.id} active={selectedCharacter === assignment.id} onSelect={() => setSelectedCharacter(assignment.id)} role={assignment.storyRole} name={assignment.displayName} personality={assignment.personalityTraits.join(' / ') || assignment.objective || t('cinematic.cast.identityReady')} look={assignment.looks.length ? t('cinematic.cast.lookArrival') : t('cinematic.cast.characterWardrobe')} scenes="0" tone="cyan" />)}
          {!project ? <><CastCard active={selectedCharacter === 'mira'} onSelect={() => setSelectedCharacter('mira')} role={t('cinematic.cast.lead')} name="Mira Chen" personality={t('cinematic.cast.miraTraits')} look={t('cinematic.cast.lookArrival')} scenes="3" tone="cyan" /><CastCard active={selectedCharacter === 'noah'} onSelect={() => setSelectedCharacter('noah')} role={t('cinematic.cast.supporting')} name="Noah Lin" personality={t('cinematic.cast.noahTraits')} look={t('cinematic.cast.lookPlatform')} scenes="2" tone="amber" /></> : null}
          {project && project.castAssignments.length === 0 ? <p>{t('cinematic.cast.charactersHint')}</p> : null}
        </div>
      </section>
      {(!project || selectedAssignment) ? <aside key={selectedCharacter} className="cinematic-character-dossier">
        <header className="cinematic-dossier-header"><div className={`cinematic-cast-card__portrait is-${selectedCharacter === 'noah' ? 'amber' : 'cyan'}`}><UserRound aria-hidden="true" /></div><div><span>{t('cinematic.cast.selectedCharacter')}</span><h3>{selectedAssignment?.displayName || (selectedCharacter === 'mira' ? 'Mira Chen' : 'Noah Lin')}</h3><p><Check aria-hidden="true" />{t('cinematic.cast.identityReady')}</p></div></header>
        <form onSubmit={event => void saveDossier(event)}>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.rolePersonality')} hint={t('cinematic.cast.rolePersonalityHint')} /><div className="cinematic-dossier-fields"><label><span>{t('cinematic.cast.storyRole')}</span><select name="storyImportance" defaultValue={selectedRole}><option value="lead">{t('cinematic.cast.lead')}</option><option value="supporting">{t('cinematic.cast.supporting')}</option></select></label><label><span>{t('cinematic.cast.emotionalBaseline')}</span><select name="emotionalBaseline" defaultValue={selectedAssignment?.emotionalBaseline || 'guarded'}><option value="guarded">{t('cinematic.cast.guarded')}</option><option value="open">{t('cinematic.cast.open')}</option></select></label><label className="is-wide"><span>{t('cinematic.cast.objective')}</span><textarea name="objective" rows={2} defaultValue={selectedObjective} /></label><label className="is-wide"><span>{t('cinematic.cast.personality')}</span><input name="personalityTraits" defaultValue={selectedTraits} /></label>{mode === 'advanced' && <><label className="is-wide"><span>{t('cinematic.cast.pressure')}</span><textarea name="pressure" rows={2} defaultValue={selectedAssignment?.pressure || t('cinematic.cast.pressureValue')} /></label><label><span>{t('cinematic.cast.relationship')}</span><input defaultValue={t('cinematic.cast.relationshipValue')} /></label><label><span>{t('cinematic.cast.dialogueStyle')}</span><input name="dialogueStyle" defaultValue={selectedAssignment?.dialogueStyle || t('cinematic.cast.dialogueStyleValue')} /></label></>}</div></section>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.performanceDirection')} hint={t('cinematic.cast.performanceDirectionHint')} /><textarea name="performanceDirection" rows={3} defaultValue={selectedPerformance} /><Button type="submit" size="sm" disabled={!selectedAssignment}>{t('cinematic.cast.saveDossier')}</Button></section>
        </form>
        <section className="cinematic-dossier-section">
          <SectionHeading title={t('cinematic.cast.wardrobeLooks')} hint={t('cinematic.cast.wardrobeOwnedHint')} action={<Button size="sm" icon={<Plus aria-hidden="true" />} disabled={!selectedAssignment} onClick={() => void addCharacterWardrobeLook()}>{t('cinematic.cast.addLook')}</Button>} />
          <article className="cinematic-look-card"><div className="cinematic-look-card__preview"><Shirt aria-hidden="true" /></div><div><span>{t('cinematic.cast.primaryLook')}</span><h4>{selectedLookName}</h4><p>{t('cinematic.cast.sceneScope')}</p></div><span className="cinematic-status-pill is-ready">{t('cinematic.cast.locked')}</span></article>
          <div className="cinematic-wardrobe-options">
            <button type="button" className="is-active"><Shirt aria-hidden="true" /><strong>{t('cinematic.cast.characterWardrobe')}</strong><small>{t('cinematic.cast.characterWardrobeHint')}</small></button>
            <button type="button" disabled><Upload aria-hidden="true" /><strong>{t('cinematic.cast.uploadWardrobe')}</strong><small>{t('cinematic.cast.uploadForCharacter')}</small></button>
            <button type="button" disabled><Sparkles aria-hidden="true" /><strong>{t('cinematic.cast.aiWardrobe')}</strong><small>{t('cinematic.cast.aiWardrobeHint')}</small></button>
          </div>
          <label className="cinematic-check-row"><input type="checkbox" defaultChecked />{t('cinematic.cast.lockWardrobe')}</label>
          {mode === 'advanced' && <label className="cinematic-check-row"><input type="checkbox" />{t('cinematic.cast.allowSceneChanges')}</label>}
        </section>
        <ContextualOperationDock title={t('cinematic.cast.wardrobeOperationTitle')} description={t('cinematic.cast.wardrobeOperationDescription')} operation={t('cinematic.cast.wardrobeOperation')} credits={4} actionLabel={t('cinematic.cast.generateWardrobe')} />
      </aside> : <aside className="cinematic-character-dossier cinematic-character-dossier--empty"><UserRound aria-hidden="true" /><h3>{t('cinematic.cast.addCharacter')}</h3><p>{t('cinematic.cast.charactersHint')}</p><Button icon={<Plus aria-hidden="true" />} onClick={() => setPickerOpen(true)}>{t('cinematic.cast.addCharacter')}</Button></aside>}
    </div>
    {castError ? <p role="alert" className="text-sm text-red-400">{castError}</p> : null}
    <CharacterPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={character => void addCharacter(character)} />
  </>;
}

function CastCard({ role, name, personality, look, scenes, tone, active, onSelect }: { role: string; name: string; personality: string; look: string; scenes: string; tone: 'cyan' | 'amber'; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('cinematic');
  return <button type="button" className={`cinematic-cast-card${active ? ' is-active' : ''}`} onClick={onSelect}><div className={`cinematic-cast-card__portrait is-${tone}`}><UserRound aria-hidden="true" /></div><div className="cinematic-cast-card__body"><span>{role}</span><h4>{name}</h4><small>{personality}</small><p><Check aria-hidden="true" /> {t('cinematic.cast.identityReady')}</p><div className="cinematic-card-facts"><span>{look}</span><span>{scenes} {t('cinematic.cast.scenes')}</span></div></div></button>;
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

function ProduceStage({ project, onEditStoryboard }: { project?: CinematicProject; onEditStoryboard?: () => void }) {
  const { t } = useTranslation('cinematic');
  const activeScene = project?.scenes[0];
  const [selectedShot, setSelectedShot] = useState(activeScene?.shots[0]?.id || '01A');
  const [scope, setScope] = useState<'shot' | 'set'>('shot');
  const [prompt, setPrompt] = useState(t('cinematic.produce.promptFixture'));
  const selectedShotRecord = activeScene?.shots.find(shot => shot.id === selectedShot);
  const orderedShots = activeScene ? activeScene.shots.map(shot => ({ id: shot.id, durationSeconds: shot.durationMs / 1000, title: shot.title, framing: shot.framing, action: shot.blocking || shot.purpose, status: shot.approvedStoryboardSource ? 'ready' : 'warning' } satisfies StoryboardShotSummary)) : storyboardShotFixtures.map(shot => ({ id: shot.id, durationSeconds: shot.durationSeconds, title: t(`cinematic.storyboard.fixture.${shot.titleKey}`), framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`), action: t(`cinematic.storyboard.fixture.${shot.actionKey}`), status: shot.status } satisfies StoryboardShotSummary));
  return <>
    <StageHeading stage="produce" />
    <div className="cinematic-shot-workspace">
      <SceneNavigator scenes={project?.scenes} activeSceneId={activeScene?.id} onSelectScene={() => undefined} />
      <section className="cinematic-shot-editor">
        <StoryboardSequenceBoard sceneId={activeScene?.id} sceneTitle={activeScene?.title || t('cinematic.produce.sequenceTitle')} sceneDurationSeconds={(activeScene?.durationMs || 12500) / 1000} shots={orderedShots} selectedShotId={selectedShot} onSelectShot={setSelectedShot} onMoveShot={() => undefined} />
        <section className="cinematic-focused-shot" aria-label={`${t('cinematic.produce.editShot')} ${selectedShot}`}>
          <header><div><span>{t('cinematic.produce.selectedShot')}</span><h3>{t('cinematic.storyboard.shot')} {selectedShot}</h3></div><strong><Clock3 aria-hidden="true" />{orderedShots.find(shot => shot.id === selectedShot)?.durationSeconds ?? 0}s</strong></header>
          {selectedShotRecord?.approvedStoryboardSource ? <section className="cinematic-produce-source"><img src={selectedShotRecord.approvedStoryboardSource.imageUrl} alt="" /><div><strong>{t('cinematic.produce.approvedSource')}</strong><Button size="sm" variant="ghost" onClick={onEditStoryboard}>{t('cinematic.produce.editStoryboardSource')}</Button></div></section> : <CinematicResultPlaceholder type="video" />}
          <div className="cinematic-shot-editor__form"><label><span>{t('cinematic.produce.prompt')}</span><textarea rows={6} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><Button size="sm" icon={<RotateCcw aria-hidden="true" />} onClick={() => setPrompt(t('cinematic.produce.promptFixture'))}>{t('cinematic.produce.reset')}</Button></div>
          <AttemptHistory type="video" />
        </section>
      </section>
      <aside className="cinematic-sticky-generation-panel"><ContextualOperationDock media title={t('cinematic.produce.operationTitle')} description={t('cinematic.produce.operationDescription')} operation={`${t('cinematic.storyboard.shot')} ${selectedShot}`} credits={scope === 'set' ? 126 : 42} actionLabel={scope === 'set' ? t('cinematic.produce.generateSet') : t('cinematic.produce.generate')}><GenerationScopeControl scope={scope} onScopeChange={setScope} eligible={scope === 'set' ? 3 : 1} blocked={scope === 'set' ? 1 : undefined} unitCredits={42} /><div className="cinematic-sticky-engine-fields"><label><span>{t('cinematic.engine.provider')}</span><select defaultValue="veo"><option value="veo">Google Veo</option><option value="seedance">Seedance</option></select></label><label><span>{t('cinematic.engine.model')}</span><select defaultValue="veo-fast"><option value="veo-fast">Veo 3.1 Fast</option><option value="seedance-lite">Seedance Lite</option></select></label><label><span>{t('cinematic.engine.duration')}</span><select defaultValue="4"><option value="4">4s</option><option value="6">6s</option></select></label><label><span>{t('cinematic.engine.resolution')}</span><select defaultValue="720"><option value="720">720p</option><option value="1080">1080p</option></select></label></div></ContextualOperationDock></aside>
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

function AttemptHistory({ type }: { type: 'image' | 'video' }) {
  const { t } = useTranslation('cinematic');
  return <section className="cinematic-attempt-history"><h3>{t('cinematic.attempts.title')}</h3><article><span>{type === 'image' ? <ImageIcon /> : <Film />}</span><div><strong>{t('cinematic.attempts.first')}</strong><small>{t('cinematic.attempts.fixture')}</small></div><span className="cinematic-status-pill is-ready">{t('cinematic.attempts.approved')}</span></article></section>;
}

function SectionHeading({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) { return <div className="cinematic-section-heading"><div><h3>{title}</h3><p>{hint}</p></div>{action}</div>; }
function LabeledValue({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) { return <div className="cinematic-labeled-value">{icon && <span>{icon}</span>}<div><small>{label}</small><strong>{value}</strong></div></div>; }
function StageFooter({ activeStage, onPrevious, onNext }: Pick<Props, 'activeStage' | 'onPrevious' | 'onNext'>) {
  const { t } = useTranslation('cinematic');
  return <Surface className="cinematic-stage-footer"><div><strong>{t('cinematic.prototype.title')}</strong><p>{t('cinematic.prototype.description')}</p></div><div><Button icon={<ArrowLeft />} onClick={onPrevious}>{t('cinematic.actions.back')}</Button><Button variant="primary" icon={<ArrowRight />} onClick={onNext} disabled={activeStage === 'finish'}>{t('cinematic.actions.next')}</Button></div></Surface>;
}
