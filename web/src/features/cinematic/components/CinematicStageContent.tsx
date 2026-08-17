import {
  ArrowLeft, ArrowRight, Check, Clock3, Film, Image as ImageIcon,
  Play, Plus, RotateCcw, Shirt, Sparkles, Upload, UserRound, WandSparkles
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import type { CinematicStage } from '../cinematicStages';
import { CharacterPickerDialog, SceneDirectorDialog } from './CinematicDialogs';
import { ContextualOperationDock } from './ContextualOperationDock';
import { StoryboardSequenceBoard, type StoryboardShotSummary } from './StoryboardSequenceBoard';

type Props = {
  activeStage: CinematicStage;
  mode?: 'simple' | 'advanced';
  onModeChange?: (mode: 'simple' | 'advanced') => void;
  onPrevious: () => void;
  onNext: () => void;
};
const beats = ['arrival', 'recognition', 'choice', 'reveal', 'resolution'] as const;
const shots = ['01A', '01B', '02A', '03A'] as const;
const storyboardShotFixtures = [
  { id: '01A', durationSeconds: 3.5, titleKey: 'arrivalHold', framingKey: 'mediumClose', actionKey: 'arrivalAction', status: 'ready' },
  { id: '01B', durationSeconds: 2.5, titleKey: 'letterInsert', framingKey: 'insertClose', actionKey: 'letterAction', status: 'draft' },
  { id: '01C', durationSeconds: 3, titleKey: 'platformReaction', framingKey: 'profileMedium', actionKey: 'reactionAction', status: 'warning' },
  { id: '01D', durationSeconds: 3.5, titleKey: 'trainReveal', framingKey: 'wideReveal', actionKey: 'revealAction', status: 'draft' }
] as const;

export function CinematicStageContent({ activeStage, mode = 'simple', onModeChange, onPrevious, onNext }: Props) {
  return <div className="cinematic-stage-content" data-testid={`cinematic-stage-${activeStage}`}>
    {activeStage === 'cast' && <CastStage mode={mode} onModeChange={onModeChange} />}
    {activeStage === 'story-plan' && <StoryPlanStage />}
    {activeStage === 'storyboard' && <StoryboardStage />}
    {activeStage === 'produce' && <ProduceStage />}
    {activeStage === 'finish' && <FinishStage />}
    <StageFooter activeStage={activeStage} onPrevious={onPrevious} onNext={onNext} />
  </div>;
}

function StageHeading({ stage }: { stage: CinematicStage }) {
  const { t } = useTranslation('cinematic');
  return <header className="cinematic-stage-heading"><div><p>{t(`cinematic.stage.${stage}.eyebrow`)}</p><h2>{t(`cinematic.stage.${stage}.title`)}</h2></div><span className="cinematic-prototype-badge">{t('cinematic.prototype.badge')}</span></header>;
}

function CastStage({ mode, onModeChange }: { mode: 'simple' | 'advanced'; onModeChange?: (mode: 'simple' | 'advanced') => void }) {
  const { t } = useTranslation('cinematic');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<'mira' | 'noah'>('mira');
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
          <CastCard active={selectedCharacter === 'mira'} onSelect={() => setSelectedCharacter('mira')} role={t('cinematic.cast.lead')} name="Mira Chen" personality={t('cinematic.cast.miraTraits')} look={t('cinematic.cast.lookArrival')} scenes="3" tone="cyan" />
          <CastCard active={selectedCharacter === 'noah'} onSelect={() => setSelectedCharacter('noah')} role={t('cinematic.cast.supporting')} name="Noah Lin" personality={t('cinematic.cast.noahTraits')} look={t('cinematic.cast.lookPlatform')} scenes="2" tone="amber" />
        </div>
      </section>
      <aside key={selectedCharacter} className="cinematic-character-dossier">
        <header className="cinematic-dossier-header"><div className={`cinematic-cast-card__portrait is-${selectedCharacter === 'mira' ? 'cyan' : 'amber'}`}><UserRound aria-hidden="true" /></div><div><span>{t('cinematic.cast.selectedCharacter')}</span><h3>{selectedCharacter === 'mira' ? 'Mira Chen' : 'Noah Lin'}</h3><p><Check aria-hidden="true" />{t('cinematic.cast.identityReady')}</p></div></header>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.rolePersonality')} hint={t('cinematic.cast.rolePersonalityHint')} /><div className="cinematic-dossier-fields"><label><span>{t('cinematic.cast.storyRole')}</span><select defaultValue={selectedCharacter === 'mira' ? 'lead' : 'supporting'}><option value="lead">{t('cinematic.cast.lead')}</option><option value="supporting">{t('cinematic.cast.supporting')}</option></select></label><label><span>{t('cinematic.cast.emotionalBaseline')}</span><select defaultValue="guarded"><option value="guarded">{t('cinematic.cast.guarded')}</option><option value="open">{t('cinematic.cast.open')}</option></select></label><label className="is-wide"><span>{t('cinematic.cast.objective')}</span><textarea rows={2} defaultValue={selectedCharacter === 'mira' ? t('cinematic.cast.miraObjective') : t('cinematic.cast.noahObjective')} /></label><label className="is-wide"><span>{t('cinematic.cast.personality')}</span><input defaultValue={selectedCharacter === 'mira' ? t('cinematic.cast.miraTraits') : t('cinematic.cast.noahTraits')} /></label>{mode === 'advanced' && <><label className="is-wide"><span>{t('cinematic.cast.pressure')}</span><textarea rows={2} defaultValue={t('cinematic.cast.pressureValue')} /></label><label><span>{t('cinematic.cast.relationship')}</span><input defaultValue={t('cinematic.cast.relationshipValue')} /></label><label><span>{t('cinematic.cast.dialogueStyle')}</span><input defaultValue={t('cinematic.cast.dialogueStyleValue')} /></label></>}</div></section>
        <section className="cinematic-dossier-section"><SectionHeading title={t('cinematic.cast.performanceDirection')} hint={t('cinematic.cast.performanceDirectionHint')} /><textarea rows={3} defaultValue={selectedCharacter === 'mira' ? t('cinematic.cast.miraPerformance') : t('cinematic.cast.noahPerformance')} /></section>
        <section className="cinematic-dossier-section">
          <SectionHeading title={t('cinematic.cast.wardrobeLooks')} hint={t('cinematic.cast.wardrobeOwnedHint')} action={<Button size="sm" icon={<Plus aria-hidden="true" />}>{t('cinematic.cast.addLook')}</Button>} />
          <article className="cinematic-look-card"><div className="cinematic-look-card__preview"><Shirt aria-hidden="true" /></div><div><span>{t('cinematic.cast.primaryLook')}</span><h4>{selectedCharacter === 'mira' ? t('cinematic.cast.lookArrival') : t('cinematic.cast.lookPlatform')}</h4><p>{t('cinematic.cast.sceneScope')}</p></div><span className="cinematic-status-pill is-ready">{t('cinematic.cast.locked')}</span></article>
          <div className="cinematic-wardrobe-options">
            <button type="button" className="is-active"><Shirt aria-hidden="true" /><strong>{t('cinematic.cast.characterWardrobe')}</strong><small>{t('cinematic.cast.characterWardrobeHint')}</small></button>
            <button type="button"><Upload aria-hidden="true" /><strong>{t('cinematic.cast.uploadWardrobe')}</strong><small>{t('cinematic.cast.uploadForCharacter')}</small></button>
            <button type="button"><Sparkles aria-hidden="true" /><strong>{t('cinematic.cast.aiWardrobe')}</strong><small>{t('cinematic.cast.aiWardrobeHint')}</small></button>
          </div>
          <label className="cinematic-check-row"><input type="checkbox" defaultChecked />{t('cinematic.cast.lockWardrobe')}</label>
          {mode === 'advanced' && <label className="cinematic-check-row"><input type="checkbox" />{t('cinematic.cast.allowSceneChanges')}</label>}
        </section>
        <ContextualOperationDock title={t('cinematic.cast.wardrobeOperationTitle')} description={t('cinematic.cast.wardrobeOperationDescription')} operation={t('cinematic.cast.wardrobeOperation')} credits={4} actionLabel={t('cinematic.cast.generateWardrobe')} />
      </aside>
    </div>
    <CharacterPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />
  </>;
}

function CastCard({ role, name, personality, look, scenes, tone, active, onSelect }: { role: string; name: string; personality: string; look: string; scenes: string; tone: 'cyan' | 'amber'; active: boolean; onSelect: () => void }) {
  const { t } = useTranslation('cinematic');
  return <button type="button" className={`cinematic-cast-card${active ? ' is-active' : ''}`} onClick={onSelect}><div className={`cinematic-cast-card__portrait is-${tone}`}><UserRound aria-hidden="true" /></div><div className="cinematic-cast-card__body"><span>{role}</span><h4>{name}</h4><small>{personality}</small><p><Check aria-hidden="true" /> {t('cinematic.cast.identityReady')}</p><div className="cinematic-card-facts"><span>{look}</span><span>{scenes} {t('cinematic.cast.scenes')}</span></div></div></button>;
}

function StoryPlanStage() {
  const { t } = useTranslation('cinematic');
  const [directorOpen, setDirectorOpen] = useState(false);
  return <>
    <StageHeading stage="story-plan" />
    <div className="cinematic-story-layout">
      <section className="cinematic-work-panel">
        <SectionHeading title={t('cinematic.story.beats')} hint={t('cinematic.story.beatsHint')} action={<Button size="sm" icon={<WandSparkles aria-hidden="true" />} disabled>{t('cinematic.story.generate')}</Button>} />
        <ol className="cinematic-beat-list">{beats.map((beat, index) => <li key={beat}><span>{index + 1}</span><div><h4>{t(`cinematic.story.${beat}`)}</h4><p>{t(`cinematic.story.${beat}Description`)}</p></div><Button size="sm" variant="ghost" onClick={() => setDirectorOpen(true)}>{t('cinematic.story.expand')}</Button></li>)}</ol>
      </section>
      <aside className="cinematic-inspector"><h3>{t('cinematic.story.arc')}</h3><div className="cinematic-arc"><span /><span /><span /><span /><span /></div><LabeledValue icon={<Film />} label={t('cinematic.story.scenes')} value="3" /><LabeledValue icon={<ImageIcon />} label={t('cinematic.story.estimatedShots')} value="8" /><LabeledValue icon={<Clock3 />} label={t('cinematic.story.runtime')} value="00:30" /><ContextualOperationDock title={t('cinematic.story.operationTitle')} description={t('cinematic.story.operationDescription')} operation={t('cinematic.story.operation')} credits={5} actionLabel={t('cinematic.story.generate')} /></aside>
    </div>
    <SceneDirectorDialog open={directorOpen} onOpenChange={setDirectorOpen} />
  </>;
}

function StoryboardStage() {
  const { t } = useTranslation('cinematic');
  const [selectedShot, setSelectedShot] = useState('01A');
  const [scope, setScope] = useState<'shot' | 'set'>('shot');
  const [prompt, setPrompt] = useState(t('cinematic.storyboard.promptFixture'));
  const [shotOrder, setShotOrder] = useState<string[]>(storyboardShotFixtures.map(shot => shot.id));
  const orderedShots = shotOrder.map(id => storyboardShotFixtures.find(shot => shot.id === id)!).map(shot => ({ id: shot.id, durationSeconds: shot.durationSeconds, title: t(`cinematic.storyboard.fixture.${shot.titleKey}`), framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`), action: t(`cinematic.storyboard.fixture.${shot.actionKey}`), status: shot.status } satisfies StoryboardShotSummary));
  const moveShot = (shotId: string, direction: 'earlier' | 'later') => setShotOrder(current => moveItem(current, shotId, direction));
  return <>
    <StageHeading stage="storyboard" />
    <div className="cinematic-shot-workspace">
      <SceneNavigator activeScene="one" />
      <section className="cinematic-shot-editor">
        <StoryboardSequenceBoard sceneTitle={t('cinematic.storyboard.sceneOne')} sceneDurationSeconds={12.5} shots={orderedShots} selectedShotId={selectedShot} onSelectShot={setSelectedShot} onMoveShot={moveShot} />
        <section className="cinematic-focused-shot" aria-label={`${t('cinematic.storyboard.editShot')} ${selectedShot}`}>
          <header><div><span>{t('cinematic.storyboard.selectedShot')}</span><h3>{t('cinematic.storyboard.shot')} {selectedShot}</h3></div><strong><Clock3 aria-hidden="true" />{orderedShots.find(shot => shot.id === selectedShot)?.durationSeconds ?? 0}s</strong></header>
          <CinematicResultPlaceholder type="image" />
          <div className="cinematic-shot-editor__form"><label><span>{t('cinematic.storyboard.prompt')}</span><textarea rows={6} value={prompt} onChange={event => setPrompt(event.target.value)} /></label><div className="cinematic-shot-direction-summary"><LabeledValue label={t('cinematic.storyboard.framing')} value={t('cinematic.storyboard.mediumClose')} /><LabeledValue label={t('cinematic.storyboard.performance')} value={t('cinematic.storyboard.heldBreath')} /></div><Button size="sm" icon={<RotateCcw aria-hidden="true" />} onClick={() => setPrompt(t('cinematic.storyboard.promptFixture'))}>{t('cinematic.storyboard.reset')}</Button></div>
          <AttemptHistory type="image" />
        </section>
      </section>
      <aside className="cinematic-sticky-generation-panel"><ContextualOperationDock media title={t('cinematic.storyboard.operationTitle')} description={t('cinematic.storyboard.operationDescription')} operation={`${t('cinematic.storyboard.shot')} ${selectedShot}`} credits={scope === 'set' ? 32 : 8} actionLabel={scope === 'set' ? t('cinematic.storyboard.generateSet') : t('cinematic.storyboard.previewStill')}><GenerationScopeControl scope={scope} onScopeChange={setScope} eligible={scope === 'set' ? 4 : 1} blocked={scope === 'set' ? 0 : undefined} unitCredits={8} /><div className="cinematic-sticky-engine-fields"><label><span>{t('cinematic.engine.provider')}</span><select defaultValue="gemini"><option value="gemini">Gemini</option><option value="openai">OpenAI</option></select></label><label><span>{t('cinematic.engine.model')}</span><select defaultValue="flash"><option value="flash">Flash Image</option><option value="quality">Quality Image</option></select></label><label><span>{t('cinematic.engine.aspectRatio')}</span><select defaultValue="9:16"><option value="9:16">9:16</option><option value="16:9">16:9</option></select></label><label><span>{t('cinematic.engine.outputs')}</span><select defaultValue="1"><option value="1">1</option><option value="2">2</option><option value="4">4</option></select></label></div></ContextualOperationDock></aside>
    </div>
  </>;
}

function ProduceStage() {
  const { t } = useTranslation('cinematic');
  const [selectedShot, setSelectedShot] = useState('01A');
  const [scope, setScope] = useState<'shot' | 'set'>('shot');
  const [prompt, setPrompt] = useState(t('cinematic.produce.promptFixture'));
  const orderedShots = storyboardShotFixtures.map(shot => ({ id: shot.id, durationSeconds: shot.durationSeconds, title: t(`cinematic.storyboard.fixture.${shot.titleKey}`), framing: t(`cinematic.storyboard.fixture.${shot.framingKey}`), action: t(`cinematic.storyboard.fixture.${shot.actionKey}`), status: shot.status } satisfies StoryboardShotSummary));
  return <>
    <StageHeading stage="produce" />
    <div className="cinematic-shot-workspace">
      <SceneNavigator activeScene="one" />
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

function SceneNavigator({ activeScene }: { activeScene: 'one' | 'two' | 'three' }) {
  const { t } = useTranslation('cinematic');
  const scenes = [
    { id: 'one', duration: '12.5s', shots: 4 },
    { id: 'two', duration: '9s', shots: 2 },
    { id: 'three', duration: '8.5s', shots: 2 }
  ] as const;
  return <aside className="cinematic-scene-navigator" aria-label={t('cinematic.storyboard.sceneNavigator')}><header><strong>{t('cinematic.storyboard.scenes')}</strong><small>30s {t('cinematic.storyboard.projectTotal')}</small></header>{scenes.map(scene => <button key={scene.id} type="button" className={activeScene === scene.id ? 'is-active' : ''}><span>{t(`cinematic.storyboard.scene${scene.id[0]!.toUpperCase()}${scene.id.slice(1)}`)}</span><strong><Clock3 aria-hidden="true" />{scene.duration}</strong><small>{scene.shots} {t('cinematic.storyboard.shots')}</small></button>)}</aside>;
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

function FinishStage() {
  const { t } = useTranslation('cinematic');
  return <>
    <StageHeading stage="finish" />
    <div className="cinematic-finish-layout">
      <section className="cinematic-finish-monitor"><div className="cinematic-monitor cinematic-monitor--large"><Play aria-hidden="true" /><span>00:18 / 00:30</span></div></section>
      <section className="cinematic-timeline-panel"><SectionHeading title={t('cinematic.finish.timeline')} hint={t('cinematic.finish.timelineHint')} /><div className="cinematic-timeline">{shots.map((shot, index) => <div key={shot}><span>{shot}</span><small>{index === 3 ? '5.0s' : '3.5s'}</small></div>)}</div><div className="cinematic-trim-controls"><label><span>{t('cinematic.finish.trimIn')}</span><input defaultValue="00:00.0" /></label><label><span>{t('cinematic.finish.trimOut')}</span><input defaultValue="00:03.5" /></label><label><span>{t('cinematic.finish.transition')}</span><select defaultValue="cut"><option value="cut">{t('cinematic.finish.straightCut')}</option><option value="dissolve">{t('cinematic.finish.dissolve')}</option></select></label></div></section>
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
function StageFooter({ activeStage, onPrevious, onNext }: Props) {
  const { t } = useTranslation('cinematic');
  return <Surface className="cinematic-stage-footer"><div><strong>{t('cinematic.prototype.title')}</strong><p>{t('cinematic.prototype.description')}</p></div><div><Button icon={<ArrowLeft />} onClick={onPrevious}>{t('cinematic.actions.back')}</Button><Button variant="primary" icon={<ArrowRight />} onClick={onNext} disabled={activeStage === 'finish'}>{t('cinematic.actions.next')}</Button></div></Surface>;
}
