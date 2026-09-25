import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Copy, FileText, ImagePlus, Images, MapPin, Play, RotateCcw, Save, Users, MessageSquarePlus, Sparkles, Check, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { applyCinematicShotProposal, discardCinematicShotProposal, prepareCinematicShotWriter, proposeCinematicShots, updateCinematicShotDocument } from '../api/cinematicSeriesApi';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';
import { selectedCharacterLook } from './storyboardGenerationAdapter';

type Props = {
  actorId: string;
  project: CinematicProject;
  shotId: string;
  online: boolean;
  maximumDocumentCharacters?: number;
  onBackToScenes: () => void;
  onOpenShot: (shotId: string) => void;
  onProjectChanged: (project: CinematicProject) => void;
  onOpenFirstFrame?: () => void;
  onOpenVideo?: () => void;
  onOpenCharacters?: () => void;
};

export function CinematicShotWriter({ actorId, project, shotId, online, maximumDocumentCharacters = 12000, onBackToScenes, onOpenShot, onProjectChanged, onOpenFirstFrame, onOpenVideo, onOpenCharacters }: Props) {
  const { t } = useTranslation('cinematic');
  const orderedScenes = useMemo(() => [...project.scenes].sort((a, b) => a.orderKey - b.orderKey), [project.scenes]);
  const entries = useMemo(() => orderedScenes.flatMap(scene => [...scene.shots].sort((a, b) => a.orderKey - b.orderKey).map(shot => ({ scene, shot }))), [orderedScenes]);
  const activeIndex = entries.findIndex(entry => entry.shot.id === shotId);
  const active = activeIndex >= 0 ? entries[activeIndex] : null;
  const preparation = useQuery({
    queryKey: ['cinematic-shot-writer', actorId, project.id, active?.scene.id, shotId, project.version],
    queryFn: () => prepareCinematicShotWriter(project.id, active!.scene.id, shotId),
    enabled: online && Boolean(active), retry: false, staleTime: 30_000
  });
  const [draft, setDraft] = useState(() => shotDraft(active?.shot, active?.scene, project));
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState<string | null>(active?.shot.videoPromptOverride?.text ?? null);
  const [promptTouched, setPromptTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  useEffect(() => {
    setDraft(shotDraft(active?.shot, active?.scene, project)); setError('');
    setPromptDraft(active?.shot.videoPromptOverride?.text ?? null); setPromptTouched(false); setCopied(false);
  }, [active?.shot.id, active?.shot.version, actorId]);
  useEffect(() => {
    if (!active?.shot.shotDocument && preparation.data) setDraft(value => value.shotDocument ? value : ({ ...value, shotDocument: preparation.data.shotDocument }));
  }, [preparation.data, active?.shot.shotDocument]);

  if (!active) {
    return <main className="cinematic-shot-writer"><StatusNotice tone="error" title={t('cinematic.shotWriter.notFoundTitle')}>{t('cinematic.shotWriter.notFoundDescription')}</StatusNotice><Button icon={<ArrowLeft />} onClick={onBackToScenes}>{t('cinematic.shotWriter.backToScenes')}</Button></main>;
  }

  const { scene, shot } = active;
  const saved = shotDraft(shot, scene, project);
  if (!shot.shotDocument && preparation.data) saved.shotDocument = preparation.data.shotDocument;
  const sourceDirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const dirty = sourceDirty || promptTouched;
  const cast = (project.castAssignments || []).filter(item => item.active !== false && scene.castMode !== 'none' && scene.castAssignmentIds.includes(item.id));
  const promptText = promptDraft ?? preparation.data?.generatedPrompt ?? '';
  const legacyLoading = !shot.shotDocument && !preparation.data;
  const pendingProposal = (project.shotProposals || []).find(item => item.sceneId === scene.id && item.status === 'pending_review');
  const revision = pendingProposal?.targetShotId === shot.id ? pendingProposal : null;
  const previous = entries[activeIndex - 1]?.shot;
  const next = entries[activeIndex + 1]?.shot;
  const environment = scene.approvedEnvironmentSource;
  const firstFrame = shot.approvedStoryboardSource;

  async function save() {
    if (busyRef.current || !draft.title.trim() || !draft.shotDocument.trim() || legacyLoading) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await updateCinematicShotDocument(project.id, scene.id, shot.id, {
        expectedVersion: project.version,
        expectedShotVersion: shot.version,
        title: draft.title,
        durationMs: Math.max(500, Math.min(20000, Math.round(draft.durationSeconds * 1000))),
        shotDocument: draft.shotDocument,
        speakerBindings: draft.speakerBindings,
        ...(promptTouched ? { videoPromptOverride: promptDraft === null ? null : {
          text: promptDraft, sourceFingerprint: preparation.data!.sourceFingerprint
        } } : {}),
        source: shot.source || 'legacy'
      });
      if (getActiveActorId() === actorId) onProjectChanged(result.project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('cinematic.shotWriter.saveFailed'));
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }

  function insertSpeaker(alias: string) {
    const heading = 'DIALOGUE AND FACIAL PERFORMANCE';
    const nextDocument = draft.shotDocument.includes(heading)
      ? draft.shotDocument.replace(heading, `${heading}\n${alias}: `)
      : `${draft.shotDocument}\n\n${heading}\n${alias}: `;
    const caret = nextDocument.indexOf(heading) + heading.length + alias.length + 3;
    setDraft(value => ({ ...value, shotDocument: nextDocument }));
    requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLTextAreaElement>('.cinematic-shot-writer__editor textarea');
      editor?.focus(); editor?.setSelectionRange(caret, caret);
    });
  }

  async function revise(action: 'propose' | 'apply' | 'discard') {
    if (busyRef.current || dirty || (action === 'propose' && !instruction.trim())) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = action === 'propose'
        ? await proposeCinematicShots(project.id, scene.id, project.version, { targetShotId: shot.id, instruction })
        : action === 'apply'
          ? await applyCinematicShotProposal(project.id, scene.id, revision!.id, project.version)
          : await discardCinematicShotProposal(project.id, scene.id, revision!.id, project.version);
      if (getActiveActorId() === actorId) onProjectChanged(result.project);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.shotWriter.saveFailed')); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return <main className="cinematic-shot-writer" data-testid="cinematic-shot-writer">
    <header className="cinematic-shot-writer__header">
      <button type="button" className="cinematic-story-writer__back" disabled={dirty || busy} onClick={onBackToScenes}><ArrowLeft aria-hidden="true" />{t('cinematic.shotWriter.backToScenes')}</button>
      <div><span>{t('cinematic.shotWriter.eyebrow')}</span><h1>{project.chapterTitle || project.title}</h1><p>{scene.title} · {t('cinematic.shotWriter.position', { current: activeIndex + 1, total: entries.length })}</p></div>
    </header>

    {error ? <StatusNotice tone="error" title={t('cinematic.shotWriter.saveFailed')}>{error}</StatusNotice> : null}

    <div className="cinematic-shot-writer__layout">
      <aside className="cinematic-shot-writer__navigator" aria-label={t('cinematic.shotWriter.navigator')}>
        {orderedScenes.map((sceneItem, sceneIndex) => <section key={sceneItem.id}>
          <header><span>{String(sceneIndex + 1).padStart(2, '0')}</span><strong>{sceneItem.title}</strong></header>
          <ol>{[...sceneItem.shots].sort((a, b) => a.orderKey - b.orderKey).map((shotItem, index) => <li key={shotItem.id}><button type="button" className={shotItem.id === shot.id ? 'is-active' : ''} aria-current={shotItem.id === shot.id ? 'page' : undefined} disabled={(dirty || busy) && shotItem.id !== shot.id} onClick={() => onOpenShot(shotItem.id)}><span>{index + 1}</span><div><strong>{shotItem.title}</strong><small><Clock3 aria-hidden="true" />{t('cinematic.shotWriter.seconds', { seconds: shotItem.durationMs / 1000 })}</small></div></button></li>)}</ol>
        </section>)}
      </aside>

      <section className="cinematic-shot-writer__document">
        <header><div><span>{t('cinematic.shotWriter.shotNumber', { number: shot.orderKey })}</span><h2>{draft.title || t('cinematic.shotWriter.untitled')}</h2></div><span className={`cinematic-shot-writer__status is-${shot.shotPlanningStatus || 'ready'}`}>{t(`cinematic.shotWriter.status.${shot.shotPlanningStatus || 'ready'}`)}</span></header>
        <section className="cinematic-shot-workspace__section" aria-label={t('cinematic.shotWorkspace.cast')}>
          <header><h3><Users aria-hidden="true" />{t('cinematic.shotWorkspace.cast')}</h3><Button size="sm" icon={<Users />} disabled={dirty || busy || !onOpenCharacters} onClick={onOpenCharacters}>{t('cinematic.shotWorkspace.manageCast')}</Button></header>
          <section className="cinematic-shot-workspace__environment" aria-label={t('cinematic.visuals.environment')}>
            {environment ? <AuthenticatedMediaImage src={environment.thumbnailUrl || environment.imageUrl} alt={scene.title} /> : <MapPin aria-hidden="true" />}
            <div><strong>{scene.title}</strong><p>{[scene.location, scene.time, scene.weather].filter(Boolean).join(' / ')}</p><small>{environment ? t(scene.environmentReferenceEnabled === false ? 'cinematic.visuals.referenceOff' : 'cinematic.visuals.inherited') : t('cinematic.visuals.noEnvironment')}</small></div>
            <Button size="sm" icon={<MapPin />} disabled={dirty || busy} onClick={onBackToScenes}>{t('cinematic.visuals.manageScene')}</Button>
          </section>
          {!cast.length ? <p>{t('cinematic.shotWorkspace.noCast')}</p> : null}
          <ul className="cinematic-shot-workspace__cast">
            {cast.map(person => {
              const binding = draft.speakerBindings.find(item => item.castAssignmentId === person.id);
              const reference = selectedCharacterLook(person, scene, shot);
              const preview = reference.look?.previewUrl || person.generatedSheet?.previewUrl || person.portraitUrl;
              return <li key={person.id}>
                <label className="cinematic-shot-workspace__person"><input type="checkbox" checked={Boolean(binding)} disabled={busy} onChange={event => setDraft(value => ({ ...value, speakerBindings: event.target.checked
                  ? [...value.speakerBindings, { castAssignmentId: person.id, alias: person.displayName, visible: true }]
                  : value.speakerBindings.filter(item => item.castAssignmentId !== person.id) }))} />
                  {preview ? <AuthenticatedMediaImage src={preview} alt={person.displayName} /> : <Users aria-hidden="true" />}<span><strong>{person.displayName}</strong><small>{t(reference.look?.ready ? 'cinematic.characters.lookReady' : 'cinematic.shotWorkspace.lookMissing')}</small></span></label>
                <div className="cinematic-shot-workspace__look">
                  <strong>{reference.look?.name || t(reference.ambiguous ? 'cinematic.lookReferences.ambiguous' : 'cinematic.lookReferences.empty')}</strong>
                  {reference.look ? <small>{t(`cinematic.lookReferences.source.${reference.look.source}`)} · {t(`cinematic.lookReferences.scope.${reference.scope}`)}</small> : null}
                  {binding && !binding.visible ? <small>{t('cinematic.lookReferences.offscreen')}</small> : null}
                </div>
                <p className="cinematic-shot-workspace__voice"><span>{t('cinematic.shotWorkspace.voice')}</span> {person.dialogueStyle || t('cinematic.shotWorkspace.voiceUnset')}</p>
                {binding ? <div className="cinematic-shot-workspace__binding">
                  <label><span>{t('cinematic.shotWorkspace.speakerName')}</span><input value={binding.alias} maxLength={120} disabled={busy} onChange={event => setDraft(value => ({ ...value, speakerBindings: value.speakerBindings.map(item => item.castAssignmentId === person.id ? { ...item, alias: event.target.value } : item) }))} /></label>
                  <label><input type="checkbox" checked={binding.visible} disabled={busy} onChange={event => setDraft(value => ({ ...value, speakerBindings: value.speakerBindings.map(item => item.castAssignmentId === person.id ? { ...item, visible: event.target.checked } : item) }))} />{t('cinematic.shotWorkspace.visible')}</label>
                  <Button size="sm" icon={<MessageSquarePlus />} disabled={busy || !binding.alias.trim()} onClick={() => insertSpeaker(binding.alias)}>{t('cinematic.shotWorkspace.addLine')}</Button>
                </div> : null}
              </li>;
            })}
          </ul>
        </section>
        <h3 className="cinematic-shot-workspace__heading">{t('cinematic.shotWorkspace.script')}</h3>
        <div className="cinematic-shot-writer__meta">
          <label><span>{t('cinematic.shotWriter.title')}</span><input value={draft.title} maxLength={120} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label>
          <label><span>{t('cinematic.shotWriter.duration')}</span><input type="number" min="0.5" max="20" step="0.5" value={draft.durationSeconds} onChange={event => setDraft(value => ({ ...value, durationSeconds: Number(event.target.value) }))} /></label>
        </div>
        <label className="cinematic-shot-writer__editor"><span><FileText aria-hidden="true" />{t('cinematic.shotWriter.direction')}</span><textarea aria-label={t('cinematic.shotWriter.direction')} readOnly={busy || legacyLoading} spellCheck value={draft.shotDocument} maxLength={maximumDocumentCharacters} onChange={event => setDraft(value => ({ ...value, shotDocument: event.target.value }))} /></label>
        {preparation.isPending && online ? <p role="status"><ProcessingSpinner />{t('cinematic.shotWorkspace.preparing')}</p> : null}
        {preparation.isError ? <StatusNotice tone="error" title={t('cinematic.shotWriter.saveFailed')}><Button size="sm" icon={<RotateCcw />} onClick={() => void preparation.refetch()}>{t('cinematic.shotWorkspace.refresh')}</Button></StatusNotice> : null}
        {!sourceDirty && preparation.data?.dialogue.findings.map((item, index) => <p role="alert" key={index}>{t('cinematic.shotWorkspace.unresolved', { name: item.speaker, line: item.line })}</p>)}
        {!sourceDirty && preparation.data?.dialogue.cues.length ? <div className="cinematic-shot-workspace__exchange">
          {preparation.data.dialogue.cues.map((cue, index) => <p key={index}><strong>{(project.castAssignments || []).find(item => item.id === cue.speakerCastAssignmentId)?.displayName || cue.offscreenVoiceRole}</strong><small>{(cue.startOffsetMs / 1000).toFixed(1)}s{!cue.speakerVisible ? ` / ${t('cinematic.shotWorkspace.offscreen')}` : ''}</small><span>{cue.text}</span>{cue.delivery ? <em>{cue.delivery}</em> : null}</p>)}
        </div> : null}
        {!sourceDirty && preparation.data?.timing.findings.length ? <p role="status">{t('cinematic.shotWorkspace.timingAdvice')}</p> : null}
        <details className="cinematic-shot-workspace__assist">
          <summary>{t('cinematic.shotWorkspace.aiAssist')}</summary>
          <label><span>{t('cinematic.shotWorkspace.revisionInstruction')}</span><input value={instruction} maxLength={2000} disabled={busy} onChange={event => setInstruction(event.target.value)} /></label>
          <Button size="sm" icon={<Sparkles />} loading={busy} disabled={!online || dirty || busy || !instruction.trim() || Boolean(pendingProposal)} onClick={() => void revise('propose')}>{t('cinematic.shotWorkspace.revise')}</Button>
          {revision ? <><pre>{revision.shots[0]?.shotDocument}</pre><div className="cinematic-shot-workspace__actions">
            <Button size="sm" icon={<Check />} disabled={busy || dirty || !online} onClick={() => void revise('apply')}>{t('cinematic.shotWorkspace.apply')}</Button>
            <Button size="sm" icon={<X />} disabled={busy || dirty || !online} onClick={() => void revise('discard')}>{t('cinematic.shotWorkspace.discard')}</Button>
          </div></> : pendingProposal ? <p>{t('cinematic.shotWorkspace.pendingSceneProposal')}</p> : null}
        </details>
        <footer>
          <div className="cinematic-shot-writer__pager"><button type="button" aria-label={t('cinematic.shotWriter.previous')} disabled={!previous || dirty || busy} onClick={() => previous && onOpenShot(previous.id)}><ChevronLeft aria-hidden="true" /></button><button type="button" aria-label={t('cinematic.shotWriter.next')} disabled={!next || dirty || busy} onClick={() => next && onOpenShot(next.id)}><ChevronRight aria-hidden="true" /></button></div>
          <span role="status">{busy ? <><ProcessingSpinner />{t('cinematic.shotWriter.saving')}</> : dirty ? t('cinematic.shotWriter.unsaved') : t('cinematic.shotWriter.saved')}</span>
          <Button variant="primary" icon={<Save />} loading={busy} disabled={!online || busy || legacyLoading || !dirty || !draft.title.trim() || !draft.shotDocument.trim() || (promptTouched && promptDraft !== null && (!promptDraft.trim() || !preparation.data))} onClick={save}>{t('cinematic.shotWriter.save')}</Button>
        </footer>
        <div className="cinematic-authoring-visuals">
          <section aria-label={t('cinematic.visuals.firstFrame')}>
            <header><Images aria-hidden="true" /><h3>{t('cinematic.visuals.firstFrame')}</h3><small>{t('cinematic.visuals.optional')}</small></header>
            <div className="cinematic-authoring-visuals__preview">
              {firstFrame ? <AuthenticatedMediaImage src={firstFrame.thumbnailUrl || firstFrame.imageUrl} alt={shot.title} />
                : <div><ImagePlus aria-hidden="true" /><span>{t('cinematic.visuals.noFirstFrame')}</span></div>}
            </div>
            <p>{firstFrame ? t(shot.storyboardStatus === 'draft' ? 'cinematic.visuals.reviewFrame' : 'cinematic.visuals.frameSelected') : t('cinematic.visuals.openingMoment')}</p>
            <Button id="cinematic-shot-first-frame" size="sm" variant="primary" icon={<ImagePlus />} disabled={!online || dirty || busy || !onOpenFirstFrame} onClick={onOpenFirstFrame}>
              {t(shot.shotDocument?.trim() || firstFrame ? 'cinematic.visuals.openFrameTools' : 'cinematic.visuals.generateFrame')}
            </Button>
          </section>
        </div>
        <section className="cinematic-shot-workspace__section">
          <details open={promptOpen} onToggle={event => setPromptOpen(event.currentTarget.open)}>
            <summary>{t('cinematic.shotWorkspace.videoPrompt')}</summary>
            {promptOpen ? <div className="cinematic-shot-workspace__prompt">
              <p role="status">{t(sourceDirty ? 'cinematic.shotWorkspace.saveSource' : preparation.data?.overrideStale ? 'cinematic.shotWorkspace.stale' : promptDraft !== null ? 'cinematic.shotWorkspace.custom' : 'cinematic.shotWorkspace.generated')}</p>
              <textarea aria-label={t('cinematic.shotWorkspace.videoPrompt')} rows={12} value={promptText} maxLength={preparation.data?.maximumPromptCharacters} disabled={busy || sourceDirty || !preparation.data} onChange={event => { setPromptDraft(event.target.value); setPromptTouched(true); }} />
              <div className="cinematic-shot-workspace__actions">
                <Button size="sm" icon={<Copy />} disabled={!promptText} onClick={() => { void navigator.clipboard.writeText(promptText).then(() => setCopied(true)).catch(() => setError(t('cinematic.shotWorkspace.copyFailed'))); }}>{t(copied ? 'cinematic.shotWorkspace.copied' : 'cinematic.shotWorkspace.copy')}</Button>
                <Button size="sm" icon={<RotateCcw />} disabled={busy || sourceDirty || !preparation.data} onClick={() => { if (promptDraft === null || window.confirm(t('cinematic.shotWorkspace.resetConfirm'))) { setPromptDraft(null); setPromptTouched(true); } }}>{t('cinematic.shotWorkspace.reset')}</Button>
                {preparation.data?.overrideStale && promptDraft !== null ? <Button size="sm" icon={<Save />} disabled={busy || sourceDirty} onClick={() => setPromptTouched(true)}>{t('cinematic.shotWorkspace.reconfirm')}</Button> : null}
                <Button size="sm" icon={<Save />} disabled={!promptTouched || sourceDirty || busy || !online || !preparation.data || (promptDraft !== null && !promptDraft.trim())} loading={busy} onClick={save}>{t('cinematic.shotWorkspace.savePrompt')}</Button>
              </div>
            </div> : null}
          </details>
          <Button variant="primary" icon={<Play />} disabled={!online || dirty || busy || !onOpenVideo || !preparation.data || preparation.data.overrideStale || (!shot.videoPromptOverride && Boolean(preparation.data.dialogue.findings.length))} onClick={onOpenVideo}>{t('cinematic.shotWorkspace.openVideo')}</Button>
        </section>
      </section>
    </div>
  </main>;
}

function shotDraft(shot: CinematicShot | undefined, scene: CinematicScene | undefined, project: CinematicProject) {
  const ids = shot?.castMode === 'none' || scene?.castMode === 'none' ? [] : shot?.castMode === 'selected' ? shot.castAssignmentIds : shot?.castAssignmentIds?.length ? shot.castAssignmentIds : scene?.castAssignmentIds || [];
  return {
    title: shot?.title || '',
    durationSeconds: Math.max(0.5, Number(shot?.durationMs || 5000) / 1000),
    shotDocument: shot?.shotDocument || '',
    speakerBindings: shot?.speakerBindings || ids.map(id => ({ castAssignmentId: id, alias: (project.castAssignments || []).find(item => item.id === id)?.displayName || id, visible: true }))
  };
}
