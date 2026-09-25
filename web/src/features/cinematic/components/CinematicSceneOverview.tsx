import { ArrowLeft, Check, Clapperboard, Clock3, FileText, ListVideo, MapPin, Plus, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import {
  applyCinematicShotProposal,
  applyCinematicSceneProposal,
  createCinematicManualShot,
  createCinematicManualScene,
  discardCinematicShotProposal,
  discardCinematicSceneProposal,
  proposeCinematicShots,
  proposeCinematicScenes,
  updateCinematicSceneOutline
} from '../api/cinematicSeriesApi';
import type { CinematicProject, CinematicSceneProposal, CinematicShotProposal } from '../schemas/cinematicSchemas';
import { CinematicSceneLooks } from './CinematicSceneLooks';

type Scene = CinematicProject['scenes'][number];
type Purpose = 'dialogue' | 'action' | 'montage' | 'establishing' | 'atmosphere' | 'transition' | 'dramatic';

type Props = {
  actorId: string;
  project: CinematicProject;
  online: boolean;
  onBackToChapter: () => void;
  onOpenShot: (shotId: string) => void;
  onProjectChanged: (project: CinematicProject) => void;
  renderEnvironment?: (scene: Scene, disabled: boolean) => ReactNode;
  initialSceneId?: string;
};

const PURPOSES = ['dramatic', 'dialogue', 'action', 'montage', 'establishing', 'atmosphere', 'transition'] as const;

export function CinematicSceneOverview({ actorId, project, online, onBackToChapter, onOpenShot, onProjectChanged, renderEnvironment, initialSceneId }: Props) {
  const { t } = useTranslation('cinematic');
  const orderedScenes = useMemo(() => [...project.scenes].sort((a, b) => a.orderKey - b.orderKey), [project.scenes]);
  const persistedProposal = useMemo(() => [...(project.sceneProposals || [])].reverse().find(item => item.status === 'pending_review') || null, [project.sceneProposals]);
  const [selectedId, setSelectedId] = useState(initialSceneId || orderedScenes[0]?.id || '');
  const selected = orderedScenes.find(scene => scene.id === selectedId) || orderedScenes[0] || null;
  const persistedShotProposal = useMemo(() => [...(project.shotProposals || [])].reverse().find(item => (
    item.sceneId === selected?.id && item.status === 'pending_review'
  )) || null, [project.shotProposals, selected?.id]);
  const [draft, setDraft] = useState(() => sceneDraft(selected));
  const [proposal, setProposal] = useState<CinematicSceneProposal | null>(persistedProposal);
  const [proposalVersion, setProposalVersion] = useState(project.version);
  const [shotProposal, setShotProposal] = useState<CinematicShotProposal | null>(persistedShotProposal);
  const [shotProposalVersion, setShotProposalVersion] = useState(project.version);
  const [busy, setBusy] = useState<'save' | 'generate' | 'apply' | 'discard' | 'manual' | 'shot-generate' | 'shot-apply' | 'shot-discard' | 'shot-manual' | null>(null);
  const [error, setError] = useState('');
  const [looksPending, setLooksPending] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!selectedId && orderedScenes[0]) setSelectedId(orderedScenes[0].id);
  }, [orderedScenes, selectedId]);
  useEffect(() => { setDraft(sceneDraft(selected)); }, [selected]);
  useEffect(() => {
    if (!proposal && persistedProposal) { setProposal(persistedProposal); setProposalVersion(project.version); }
  }, [persistedProposal, project.version, proposal]);
  useEffect(() => {
    setShotProposal(persistedShotProposal);
    setShotProposalVersion(project.version);
  }, [persistedShotProposal, selected?.id, project.version]);

  const dirty = selected ? JSON.stringify(draft) !== JSON.stringify(sceneDraft(selected)) : false;
  const shotCount = project.scenes.reduce((total, scene) => total + scene.shots.length, 0);
  const proposalStale = Boolean(proposal && proposal.sourceChapterRevisionId !== project.activeChapterVersionId);
  const shotProposalStale = Boolean(shotProposal && selected && (
    shotProposal.sourceSceneVersion !== selected.version
    || shotProposal.sourceChapterRevisionId !== (project.activeChapterVersionId || null)
    || Boolean(selected.sourceChapterRevisionId && shotProposal.sourceChapterRevisionId !== selected.sourceChapterRevisionId)
  ));

  async function run<T>(kind: NonNullable<typeof busy>, operation: () => Promise<T>) {
    if (busyRef.current) return undefined;
    busyRef.current = true; setBusy(kind); setError('');
    try { return await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.scenes.operationFailed')); return undefined; }
    finally { busyRef.current = false; setBusy(null); }
  }

  function generate() {
    void run('generate', async () => {
      if (looksPending) return;
      const result = await proposeCinematicScenes(project.id, project.version);
      if (getActiveActorId() !== actorId) return;
      setProposal(result.proposal); setProposalVersion(result.project.version); onProjectChanged(result.project);
    });
  }

  function apply() {
    if (!proposal || looksPending) return;
    void run('apply', async () => {
      const result = await applyCinematicSceneProposal(project.id, proposal.id, proposalVersion);
      if (getActiveActorId() !== actorId) return;
      setProposal(null); setSelectedId(result.project.scenes[0]?.id || ''); onProjectChanged(result.project);
    });
  }

  function discard() {
    if (!proposal) return;
    void run('discard', async () => {
      const result = await discardCinematicSceneProposal(project.id, proposal.id, proposalVersion);
      if (getActiveActorId() !== actorId) return;
      setProposal(null); setProposalVersion(result.project.version); onProjectChanged(result.project);
    });
  }

  function addManual() {
    void run('manual', async () => {
      const result = await createCinematicManualScene(project.id, project.version, globalThis.crypto.randomUUID());
      if (getActiveActorId() !== actorId) return;
      onProjectChanged(result.project);
      if (result.scene) setSelectedId(result.scene.id);
    });
  }

  function save() {
    if (!selected || !draft.title.trim()) return;
    void run('save', async () => {
      const result = await updateCinematicSceneOutline(project.id, selected.id, {
        expectedVersion: project.version,
        expectedSceneVersion: selected.version,
        ...draft,
        targetDurationSeconds: Math.max(5, Math.min(120, draft.targetDurationSeconds)),
        dialogueTargetPercent: Math.max(0, Math.min(100, draft.dialogueTargetPercent)),
        characterIds: selected.castAssignmentIds
      });
      if (getActiveActorId() !== actorId) return;
      onProjectChanged(result.project);
    });
  }

  function generateShots() {
    if (!selected) return;
    void run('shot-generate', async () => {
      const result = await proposeCinematicShots(project.id, selected.id, project.version);
      if (getActiveActorId() !== actorId) return;
      setShotProposal(result.proposal);
      setShotProposalVersion(result.project.version);
      onProjectChanged(result.project);
    });
  }

  function applyShots() {
    if (!selected || !shotProposal) return;
    void run('shot-apply', async () => {
      const result = await applyCinematicShotProposal(project.id, selected.id, shotProposal.id, shotProposalVersion);
      if (getActiveActorId() !== actorId) return;
      setShotProposal(null);
      onProjectChanged(result.project);
      const firstShot = result.scene?.shots[0];
      if (firstShot) onOpenShot(firstShot.id);
    });
  }

  function discardShots() {
    if (!selected || !shotProposal) return;
    void run('shot-discard', async () => {
      const result = await discardCinematicShotProposal(project.id, selected.id, shotProposal.id, shotProposalVersion);
      if (getActiveActorId() !== actorId) return;
      setShotProposal(null);
      setShotProposalVersion(result.project.version);
      onProjectChanged(result.project);
    });
  }

  function addManualShot() {
    if (!selected) return;
    void run('shot-manual', async () => {
      const result = await createCinematicManualShot(project.id, selected.id, project.version, globalThis.crypto.randomUUID());
      if (getActiveActorId() !== actorId) return;
      onProjectChanged(result.project);
      if (result.shot) onOpenShot(result.shot.id);
    });
  }

  return (
    <main className="cinematic-scene-overview" data-testid="cinematic-scene-overview" inert={busy ? true : undefined}>
      <header className="cinematic-scene-overview__header">
        <button type="button" className="cinematic-story-writer__back" disabled={looksPending} onClick={onBackToChapter}><ArrowLeft aria-hidden="true" />{t('cinematic.scenes.backToChapter')}</button>
        <div><span>{t('cinematic.scenes.eyebrow')}</span><h1>{project.chapterTitle || project.title}</h1><p>{t('cinematic.scenes.summary', { scenes: project.scenes.length, shots: shotCount })}</p></div>
        <div className="cinematic-scene-overview__header-actions">
          <Button size="sm" icon={<RefreshCw />} loading={busy === 'generate'} disabled={!online || Boolean(busy) || dirty || looksPending || !project.activeChapterVersionId} onClick={generate}>{project.scenes.length ? t('cinematic.scenes.regenerate') : t('cinematic.scenes.generate')}</Button>
          <Button size="sm" icon={<Plus />} loading={busy === 'manual'} disabled={!online || Boolean(busy) || looksPending} onClick={addManual}>{t('cinematic.scenes.add')}</Button>
        </div>
      </header>

      {error ? <StatusNotice tone="error" title={t('cinematic.scenes.operationFailed')}>{error}</StatusNotice> : null}
      {proposal ? <SceneProposalReview proposal={proposal} stale={proposalStale} busy={busy || (looksPending ? 'save' : null)} onDiscard={discard} onApply={apply} /> : null}

      <div className="cinematic-scene-overview__layout">
        <aside className="cinematic-scene-overview__navigator" inert={looksPending ? true : undefined} aria-label={t('cinematic.scenes.list')}>
          <header><div><Clapperboard aria-hidden="true" /><strong>{t('cinematic.scenes.list')}</strong></div><span>{orderedScenes.length}</span></header>
          {orderedScenes.length ? <ol>{orderedScenes.map((scene, index) => <li key={scene.id}><button type="button" className={scene.id === selected?.id ? 'is-active' : ''} aria-current={scene.id === selected?.id ? 'page' : undefined} onClick={() => setSelectedId(scene.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{scene.title || t('cinematic.scenes.untitled')}</strong><small><MapPin aria-hidden="true" />{[scene.location, scene.time].filter(Boolean).join(' · ') || t('cinematic.scenes.locationPending')}</small><small><Clock3 aria-hidden="true" />{t('cinematic.scenes.duration', { seconds: Math.round(scene.durationMs / 1000) })}<i>·</i><ListVideo aria-hidden="true" />{scene.shots.length ? t('cinematic.scenes.shotCount', { count: scene.shots.length }) : t('cinematic.scenes.shotsNotPlanned')}</small></div></button></li>)}</ol> : <div className="cinematic-scene-overview__empty"><FileText aria-hidden="true" /><strong>{t('cinematic.scenes.emptyTitle')}</strong><p>{t('cinematic.scenes.emptyDescription')}</p></div>}
        </aside>

        <section className="cinematic-scene-overview__document">
          {selected ? <>
            <div className="cinematic-scene-overview__document-heading"><div><span>{t('cinematic.scenes.sceneNumber', { number: selected.orderKey })}</span><h2>{selected.title || t('cinematic.scenes.untitled')}</h2></div><span className={`cinematic-scene-overview__status is-${selected.planningStatus || 'ready'}`}>{t(`cinematic.scenes.status.${selected.planningStatus || 'ready'}`)}</span></div>
            <label><span>{t('cinematic.scenes.title')}</span><input value={draft.title} maxLength={120} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label>
            <label><span>{t('cinematic.scenes.synopsis')}</span><textarea rows={8} maxLength={4000} value={draft.synopsis} onChange={event => setDraft(value => ({ ...value, synopsis: event.target.value }))} /></label>
            <div className="cinematic-scene-overview__field-grid">
              <label><span>{t('cinematic.scenes.location')}</span><input value={draft.location} maxLength={240} onChange={event => setDraft(value => ({ ...value, location: event.target.value }))} /></label>
              <label><span>{t('cinematic.scenes.time')}</span><input value={draft.time} maxLength={160} onChange={event => setDraft(value => ({ ...value, time: event.target.value }))} /></label>
              <label><span>{t('cinematic.scenes.weather')}</span><input value={draft.weather} maxLength={160} onChange={event => setDraft(value => ({ ...value, weather: event.target.value }))} /></label>
              <label><span>{t('cinematic.scenes.purpose')}</span><select value={draft.purpose} onChange={event => setDraft(value => ({ ...value, purpose: event.target.value as Purpose }))}>{PURPOSES.map(purpose => <option key={purpose} value={purpose}>{t(`cinematic.scenes.purpose.${purpose}`)}</option>)}</select></label>
              <label><span>{t('cinematic.scenes.durationLabel')}</span><input type="number" min={5} max={120} value={draft.targetDurationSeconds} onChange={event => setDraft(value => ({ ...value, targetDurationSeconds: Number(event.target.value) }))} /></label>
              <label><span>{t('cinematic.scenes.dialogueTarget')}</span><input type="number" min={0} max={100} value={draft.dialogueTargetPercent} onChange={event => setDraft(value => ({ ...value, dialogueTargetPercent: Number(event.target.value) }))} /></label>
            </div>
            <footer><span role="status">{busy === 'save' ? <><ProcessingSpinner />{t('cinematic.scenes.saving')}</> : dirty ? t('cinematic.scenes.unsaved') : t('cinematic.scenes.saved')}</span><Button variant="primary" icon={<Save />} loading={busy === 'save'} disabled={!online || Boolean(busy) || !dirty || !draft.title.trim()} onClick={save}>{t('cinematic.scenes.save')}</Button></footer>
            <CinematicSceneLooks key={selected.id} actorId={actorId} project={project} scene={selected} disabled={!online || Boolean(busy) || dirty || Boolean(shotProposal)} onProjectChanged={onProjectChanged} onPendingChange={setLooksPending} />
            <section className="cinematic-authoring-visuals__environment" aria-label={t('cinematic.visuals.environment')}>
              <header><MapPin aria-hidden="true" /><h3>{t('cinematic.visuals.environment')}</h3><small>{t('cinematic.visuals.sharedScene')}</small></header>
              {renderEnvironment?.(selected, !online || Boolean(busy) || dirty || looksPending || Boolean(shotProposal))}
              {dirty ? <p role="status">{t('cinematic.visuals.saveSceneFirst')}</p> : null}
            </section>
            <section className="cinematic-scene-overview__shots" inert={looksPending ? true : undefined}>
              <header>
                <div><ListVideo aria-hidden="true" /><h3>{t('cinematic.scenes.shots')}</h3><span>{selected.shots.length}</span></div>
                <div className="cinematic-scene-overview__shot-actions">
                  <Button size="sm" icon={<Sparkles />} loading={busy === 'shot-generate'} disabled={!online || Boolean(busy) || dirty || looksPending || Boolean(shotProposal) || !(selected.synopsis || selected.objective || selected.storyChange)} onClick={generateShots}>{selected.shots.length ? t('cinematic.scenes.regenerateShots') : t('cinematic.scenes.generateShots')}</Button>
                  <Button size="sm" icon={<Plus />} loading={busy === 'shot-manual'} disabled={!online || Boolean(busy) || looksPending || Boolean(shotProposal)} onClick={addManualShot}>{t('cinematic.scenes.addShot')}</Button>
                </div>
              </header>
              {shotProposal ? <ShotProposalReview proposal={shotProposal} stale={shotProposalStale} busy={busy} onDiscard={discardShots} onApply={applyShots} /> : null}
              {selected.shots.length ? <ol>{[...selected.shots].sort((a, b) => a.orderKey - b.orderKey).map((shot, index) => <li key={shot.id}><button type="button" onClick={() => onOpenShot(shot.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{shot.title || t('cinematic.scenes.untitledShot')}</strong><small>{t('cinematic.scenes.duration', { seconds: Math.round(shot.durationMs / 1000) })} · {t(`cinematic.shotWriter.status.${shot.shotPlanningStatus || 'ready'}`)}</small></div></button></li>)}</ol> : <p>{t('cinematic.scenes.shotsEmpty')}</p>}
            </section>
          </> : <div className="cinematic-scene-overview__document-empty"><Sparkles aria-hidden="true" /><h2>{t('cinematic.scenes.emptyDocumentTitle')}</h2><p>{t('cinematic.scenes.emptyDocumentDescription')}</p><div><Button variant="primary" icon={<Sparkles />} loading={busy === 'generate'} disabled={!online || Boolean(busy) || !project.activeChapterVersionId} onClick={generate}>{t('cinematic.scenes.generate')}</Button><Button icon={<Plus />} loading={busy === 'manual'} disabled={!online || Boolean(busy)} onClick={addManual}>{t('cinematic.scenes.add')}</Button></div></div>}
        </section>
      </div>
    </main>
  );

  function SceneProposalReview({ proposal: value, stale, busy: currentBusy, onDiscard, onApply }: { proposal: CinematicSceneProposal; stale: boolean; busy: typeof busy; onDiscard: () => void; onApply: () => void }) {
    return <section className="cinematic-scene-overview__proposal" aria-label={t('cinematic.scenes.reviewTitle')}><header><div><span>{t('cinematic.scenes.proposalEyebrow')}</span><h2>{t('cinematic.scenes.reviewTitle')}</h2></div><strong>{t('cinematic.scenes.proposalCount', { count: value.scenes.length })}</strong></header><ol>{value.scenes.map((scene, index) => <li key={`${index}-${scene.title}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{scene.title}</strong><p>{scene.synopsis}</p><small>{[scene.location, scene.time, `${scene.targetDurationSeconds}s`].filter(Boolean).join(' · ')}</small></div></li>)}</ol><div className="cinematic-scene-overview__proposal-impact"><strong>{t('cinematic.scenes.impactTitle')}</strong><p>{stale ? t('cinematic.scenes.proposalStale') : project.scenes.length ? t('cinematic.scenes.impactExisting') : t('cinematic.scenes.impactNew')}</p></div><footer><Button icon={<X />} loading={currentBusy === 'discard'} disabled={Boolean(currentBusy)} onClick={onDiscard}>{t('cinematic.scenes.discard')}</Button><Button variant="primary" icon={<Check />} loading={currentBusy === 'apply'} disabled={Boolean(currentBusy) || stale} onClick={onApply}>{t('cinematic.scenes.apply')}</Button></footer></section>;
  }

  function ShotProposalReview({ proposal: value, stale, busy: currentBusy, onDiscard, onApply }: { proposal: CinematicShotProposal; stale: boolean; busy: typeof busy; onDiscard: () => void; onApply: () => void }) {
    return <section className="cinematic-scene-overview__shot-proposal" aria-label={t('cinematic.scenes.shotReviewTitle')}>
      <header><div><span>{t('cinematic.scenes.proposalEyebrow')}</span><h4>{t('cinematic.scenes.shotReviewTitle')}</h4></div><strong>{t('cinematic.scenes.shotProposalCount', { count: value.shots.length })}</strong></header>
      <ol>{value.shots.map((shot, index) => <li key={`${index}-${shot.title}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{shot.title}</strong><small>{t('cinematic.scenes.duration', { seconds: shot.durationMs / 1000 })}</small><p>{shot.shotDocument}</p></div></li>)}</ol>
      <div className="cinematic-scene-overview__proposal-impact"><strong>{t('cinematic.scenes.impactTitle')}</strong><p>{stale ? t('cinematic.scenes.shotProposalStale') : selected?.shots.length ? t('cinematic.scenes.shotImpactExisting') : t('cinematic.scenes.shotImpactNew')}</p></div>
      <footer><Button icon={<X />} loading={currentBusy === 'shot-discard'} disabled={Boolean(currentBusy)} onClick={onDiscard}>{t('cinematic.scenes.discard')}</Button><Button variant="primary" icon={<Check />} loading={currentBusy === 'shot-apply'} disabled={Boolean(currentBusy) || stale} onClick={onApply}>{t('cinematic.scenes.applyShots')}</Button></footer>
    </section>;
  }
}

function sceneDraft(scene: Scene | null) {
  return {
    title: scene?.title || '', synopsis: scene?.synopsis || scene?.storyChange || '',
    purpose: (scene?.purpose || 'dramatic') as Purpose, objective: scene?.objective || '',
    location: scene?.location || '', time: scene?.time || '', weather: scene?.weather || '',
    environment: scene?.environmentPrompt || '', entryState: scene?.entryState || '', exitState: scene?.exitState || '',
    emotionalStart: scene?.emotionalStart || '', emotionalEnd: scene?.emotionalEnd || '', transitionIntent: scene?.transitionIntent || '',
    targetDurationSeconds: Math.max(5, Math.round(Number(scene?.durationMs || 15000) / 1000)),
    dialogueTargetPercent: scene?.dialogueTargetPercent || 0
  };
}
