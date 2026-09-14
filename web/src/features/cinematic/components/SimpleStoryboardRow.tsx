import { ChevronDown, ChevronRight, Clock3, Film, Image as ImageIcon, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { ApiError } from '../../../lib/api/apiError';
import { saveCinematicManualStoryboard } from '../api/cinematicApi';
import type { CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';
import { readAssignmentLooks } from './authoring/SceneCastLookSelector';
import { readStoryboardAuthorDirection } from './storyboardGenerationAdapter';
import type { SimpleStoryboardWorkspaceProps } from './SimpleStoryboardWorkspace';

type EventDraft = { id: string; start: string; end: string; description: string };
type RowDraft = {
  title: string;
  imagePrompt: string;
  duration: string;
  castAssignmentIds: string[];
  wardrobeLookIds: string[];
  events: EventDraft[];
};
type RowProps = SimpleStoryboardWorkspaceProps & {
  rowKey: string;
  onRowDirtyChange: (key: string, dirty: boolean) => void;
  scene: CinematicScene;
  shot: CinematicShot;
  sceneIndex: number;
  shotIndex: number;
  active: boolean;
  mutationPending: boolean;
  beginMutation: () => boolean;
  endMutation: () => void;
  onActivate: () => void;
};

function initialDraft(scene: CinematicScene, shot: CinematicShot): RowDraft {
  const storedEvents = shot.videoActionTimeline ?? (shot.manualStoryboard ? [] : [{
    startMs: 0, endMs: shot.durationMs, description: shot.manualStoryboard ? '' : shot.subjectAction || ''
  }]);
  const events = storedEvents.length ? storedEvents : [{ startMs: 0, endMs: shot.durationMs, description: '' }];
  const inherit = !shot.manualStoryboard && (shot.castMode === 'inherit'
    || (shot.castMode !== 'selected' && !shot.castAssignmentIds.length));
  return {
    title: shot.title,
    imagePrompt: readStoryboardAuthorDirection(shot.prompt) || shot.visibleMoment || '',
    duration: String(shot.durationMs / 1000),
    castAssignmentIds: shot.castMode === 'none' || (!shot.manualStoryboard && scene.castMode === 'none') ? []
      : [...(inherit ? scene.castAssignmentIds : shot.castAssignmentIds)],
    wardrobeLookIds: [...(!shot.manualStoryboard && !shot.wardrobeLookIds.length ? scene.wardrobeLookIds : shot.wardrobeLookIds)],
    events: events.map((event, index) => ({ id: `saved-${index}`, start: String(event.startMs / 1000),
      end: String(event.endMs / 1000), description: event.description }))
  };
}

function milliseconds(value: string) {
  return value.trim() ? Math.round(Number(value) * 1000) : NaN;
}

function eventError(event: EventDraft, index: number, events: EventDraft[], durationMs: number) {
  const start = milliseconds(event.start), end = milliseconds(event.end);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start) return 'cinematic.manual.invalidTime';
  if (end > durationMs) return 'cinematic.manual.pastDuration';
  if (index > 0 && start < milliseconds(events[index - 1]!.end)) return 'cinematic.manual.overlap';
  return null;
}

export function SimpleStoryboardRow({ project, scene, shot, sceneIndex, shotIndex, active,
  mutationPending, beginMutation, endMutation, onActivate, onProjectChanged, onProjectRefresh,
  renderImage, renderVideo, rowKey, onRowDirtyChange }: RowProps) {
  const { t } = useTranslation('cinematic');
  const id = useId();
  const [draft, setDraft] = useState(() => initialDraft(scene, shot));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDraft(scene, shot)));
  const [baseVersion, setBaseVersion] = useState(shot.version);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<{ key: string; projectVersion: number } | null>(null);
  const mounted = useRef(true);
  const latestProject = useRef(project);
  latestProject.current = project;
  const eventSequence = useRef(0);
  const eventFocus = useRef<string | null>(null);
  const dirty = JSON.stringify(draft) !== baseline;
  const changedElsewhere = dirty && shot.version !== baseVersion;
  const conflict = changedElsewhere || error?.key === 'cinematic.manual.conflict';
  const awaitingProject = shot.version < baseVersion;
  const durationMs = milliseconds(draft.duration);
  const invalidDuration = !Number.isSafeInteger(durationMs) || durationMs < 1000 || durationMs > 30000;
  const invalidTitle = draft.title.trim().length > 100;
  const invalidPrompt = draft.imagePrompt.trim().length > 4000;
  const invalidDescriptions = draft.events.some(event => event.description.trim().length > 1200);
  const timingErrors = draft.events.map((event, index) => eventError(event, index, draft.events, durationMs));
  const hasDescription = draft.events.some(event => event.description.trim());
  const incompleteEvents = hasDescription && draft.events.some(event => !event.description.trim());
  const invalidDraft = invalidDuration || invalidTitle || invalidPrompt || invalidDescriptions
    || draft.events.length > 12 || timingErrors.some(Boolean) || incompleteEvents;
  const saveBlock = saving || awaitingProject ? t('cinematic.manual.savingBeforeGenerate')
    : conflict ? t('cinematic.manual.conflict') : dirty ? t('cinematic.manual.saveBeforeGenerate') : null;
  const imageBlock = saveBlock || (!draft.imagePrompt.trim() ? t('cinematic.manual.imageRequired') : null);
  const videoBlock = saveBlock || (invalidDraft ? t('cinematic.manual.fixTimeline')
    : !hasDescription ? t('cinematic.manual.actionRequired') : null);
  const label = scene.shots.length > 1
    ? t('cinematic.manual.sceneShot', { scene: sceneIndex + 1, shot: shotIndex + 1 })
    : t('cinematic.manual.sceneNumber', { number: sceneIndex + 1 });
  const title = draft.title.trim() || label;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const navigationBlocked = dirty || saving || awaitingProject || Boolean(conflict);
  useEffect(() => { onRowDirtyChange(rowKey, navigationBlocked); }, [rowKey, navigationBlocked, onRowDirtyChange]);
  useEffect(() => () => { onRowDirtyChange(rowKey, false); }, [rowKey, onRowDirtyChange]);
  useEffect(() => {
    if (dirty || saving || shot.version < baseVersion) return;
    const next = initialDraft(scene, shot);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setBaseVersion(shot.version);
  }, [scene, shot, dirty, saving, baseVersion]);
  useEffect(() => {
    if (!eventFocus.current) return;
    const target = document.getElementById(eventFocus.current);
    target?.focus();
    eventFocus.current = null;
  }, [draft.events]);

  function edit(update: Partial<RowDraft>) {
    setDraft(current => ({ ...current, ...update }));
    setSaved(false);
  }

  function updateEvent(eventId: string, update: Partial<EventDraft>) {
    edit({ events: draft.events.map(event => event.id === eventId ? { ...event, ...update } : event) });
  }

  function addEvent() {
    if (draft.events.length >= 12) return;
    const eventId = `new-${++eventSequence.current}`;
    const start = draft.events.at(-1)?.end || '0';
    eventFocus.current = `${id}-${eventId}-description`;
    edit({ events: [...draft.events, { id: eventId, start, end: draft.duration, description: '' }] });
  }

  function removeEvent(index: number) {
    const remaining = draft.events.filter((_, position) => index !== position);
    const next = remaining[Math.min(index, remaining.length - 1)];
    eventFocus.current = next ? `${id}-${next.id}-description` : `${id}-add-event`;
    edit({ events: remaining });
  }

  async function save() {
    if (!dirty || invalidDraft || conflict || awaitingProject || !beginMutation()) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const submittedVersion = project.version;
    try {
      const next = await saveCinematicManualStoryboard(project.id, scene.id, shot.id, {
        expectedVersion: submittedVersion, expectedShotVersion: baseVersion,
        title: draft.title, imagePrompt: draft.imagePrompt, durationMs,
        castAssignmentIds: draft.castAssignmentIds, wardrobeLookIds: draft.wardrobeLookIds,
        // An untouched empty event is an empty VIDEO draft, not an invented action.
        videoActionTimeline: hasDescription ? draft.events.map(event => ({
          startMs: milliseconds(event.start), endMs: milliseconds(event.end), description: event.description
        })) : []
      });
      if (!mounted.current) return;
      const nextScene = next.scenes.find(value => value.id === scene.id);
      const nextShot = nextScene?.shots.find(value => value.id === shot.id);
      if (!nextScene || !nextShot) throw new Error('Missing saved Shot');
      const nextDraft = initialDraft(nextScene, nextShot);
      setDraft(nextDraft);
      setBaseline(JSON.stringify(nextDraft));
      setBaseVersion(nextShot.version);
      setSaved(true);
      if (next.version >= latestProject.current.version) onProjectChanged(next);
      else onProjectRefresh?.();
    } catch (reason) {
      if (mounted.current) setError({ key: reason instanceof ApiError && reason.status === 409
        ? 'cinematic.manual.conflict' : 'cinematic.manual.saveFailed', projectVersion: submittedVersion });
    } finally {
      if (mounted.current) setSaving(false);
      endMutation();
    }
  }

  function keepEdits() {
    setBaseVersion(shot.version);
    setError(null);
    setSaved(false);
  }

  return <article className={`cinematic-manual__row${active ? ' is-active' : ''}`}
    data-scene-id={scene.id} data-shot-id={shot.id} aria-labelledby={`${id}-heading`}>
    <header className="cinematic-manual__row-header">
      <h3 id={`${id}-heading`}>
        <button type="button" className="cinematic-manual__activate"
          aria-expanded={active} aria-controls={`${id}-draft`} disabled={mutationPending && !active}
          onClick={onActivate}>
          {active ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          <span><small>{label}</small><strong>{title}</strong>
            {scene.shots.length > 1 ? <small>{scene.title}</small> : null}</span>
        </button>
      </h3>
      <span className="cinematic-manual__duration"><Clock3 aria-hidden="true" />
        {t('cinematic.manual.seconds', { seconds: draft.duration || '0' })}
      </span>
      <span className="cinematic-manual__save-status" role="status">
        {saving ? <ProcessingSpinner /> : null}
        {t(saving ? 'cinematic.manual.saving' : dirty ? 'cinematic.manual.unsaved'
          : saved ? 'cinematic.manual.saved' : 'cinematic.manual.savedDraft')}
      </span>
    </header>
    {error || changedElsewhere ? <div className="cinematic-manual__error" role="alert">
      <span>{t(changedElsewhere ? 'cinematic.manual.conflict' : error!.key)}</span>
      {onProjectRefresh ? <Button type="button" size="sm" icon={<RefreshCw aria-hidden="true" />}
        disabled={mutationPending} onClick={onProjectRefresh}>{t('cinematic.manual.refresh')}</Button> : null}
      {conflict && (changedElsewhere || project.version > (error?.projectVersion ?? project.version))
        ? <Button type="button" size="sm" disabled={mutationPending} onClick={keepEdits}>
          {t('cinematic.manual.keepEdits')}
        </Button> : null}
    </div> : null}
    <RowMediaSummary project={project} scene={scene} shot={shot} label={title} />
    <div id={`${id}-draft`} hidden={!active} className="cinematic-manual__draft">
      <fieldset disabled={saving || awaitingProject} className="cinematic-manual__fields">
        <label className="cinematic-manual__field cinematic-manual__title"><span>{t('cinematic.manual.title')}</span>
          <input value={draft.title} aria-invalid={invalidTitle}
            aria-describedby={invalidTitle ? `${id}-title-error` : undefined}
            onChange={event => edit({ title: event.target.value })} />
        </label>
        {invalidTitle ? <p id={`${id}-title-error`} className="cinematic-manual__error">{t('cinematic.manual.textLimit', { limit: 100 })}</p> : null}
      </fieldset>
      <div className="cinematic-manual__save-bar">
        <span>{saveBlock}</span>
        <Button type="button" icon={saving ? <ProcessingSpinner /> : <Save aria-hidden="true" />}
          disabled={!dirty || Boolean(invalidDraft) || mutationPending || conflict || awaitingProject}
          onClick={() => void save()}>{t(saving ? 'cinematic.manual.saving' : 'cinematic.manual.save')}</Button>
      </div>
        <div className="cinematic-manual__columns">
          <section className="cinematic-manual__image" aria-labelledby={`${id}-image`}>
            <h4 id={`${id}-image`}><ImageIcon aria-hidden="true" />{t('cinematic.manual.image')}</h4>
            <fieldset disabled={saving || awaitingProject} className="cinematic-manual__fields">
            <label className="cinematic-manual__field"><span>{t('cinematic.manual.imagePrompt')}</span>
              <textarea rows={7} value={draft.imagePrompt} aria-invalid={invalidPrompt}
                aria-describedby={invalidPrompt ? `${id}-prompt-error` : undefined}
                onChange={event => edit({ imagePrompt: event.target.value })} />
            </label>
            {invalidPrompt ? <p id={`${id}-prompt-error`} className="cinematic-manual__error">{t('cinematic.manual.textLimit', { limit: 4000 })}</p> : null}
            <fieldset className="cinematic-manual__cast"><legend>{t('cinematic.manual.castLooks')}</legend>
              {project.castAssignments.filter(assignment => assignment.active !== false || draft.castAssignmentIds.includes(assignment.id)).map(assignment => {
                const looks = readAssignmentLooks(assignment);
                const selected = draft.castAssignmentIds.includes(assignment.id);
                const selectedLookIds = draft.wardrobeLookIds.filter(lookId => looks.some(look => look.id === lookId));
                return <div key={assignment.id} className="cinematic-manual__cast-row">
                  <label className="cinematic-manual__cast-check"><input type="checkbox" checked={selected}
                    onChange={event => edit({
                      castAssignmentIds: event.target.checked ? [...draft.castAssignmentIds, assignment.id]
                        : draft.castAssignmentIds.filter(value => value !== assignment.id),
                      wardrobeLookIds: event.target.checked ? draft.wardrobeLookIds
                        : draft.wardrobeLookIds.filter(value => !looks.some(look => look.id === value))
                    })} /><span>{assignment.displayName}
                    {!assignment.identityReady || assignment.active === false ? <small>{t('cinematic.manual.castUnavailable')}</small> : null}</span></label>
                  <label className="cinematic-manual__field"><span>{t('cinematic.manual.lookFor', { name: assignment.displayName })}</span>
                    <select disabled={!selected} value={selectedLookIds.length > 1 ? '__multiple__' : selectedLookIds[0] || ''}
                      onChange={event => edit({ wardrobeLookIds: [
                        ...draft.wardrobeLookIds.filter(value => !looks.some(look => look.id === value)),
                        ...(event.target.value ? [event.target.value] : [])
                      ] })}>
                      <option value="">{t('cinematic.manual.chooseLook')}</option>
                      {selectedLookIds.length > 1 ? <option value="__multiple__" disabled>{t('cinematic.manual.multipleLooks')}</option> : null}
                      {looks.map(look => <option key={look.id} value={look.id}>{look.name}</option>)}
                    </select>
                  </label>
                </div>;
              })}
              {draft.castAssignmentIds.filter(value => !project.castAssignments.some(assignment => assignment.id === value)).map(value =>
                <label key={value} className="cinematic-manual__cast-check"><input type="checkbox" checked
                  onChange={() => edit({ castAssignmentIds: draft.castAssignmentIds.filter(id => id !== value) })} />
                  <span>{t('cinematic.manual.missingCast', { id: value })}</span></label>)}
              {draft.wardrobeLookIds.filter(value => !project.castAssignments.some(assignment =>
                draft.castAssignmentIds.includes(assignment.id) && readAssignmentLooks(assignment).some(look => look.id === value))).map(value =>
                <label key={value} className="cinematic-manual__cast-check"><input type="checkbox" checked
                  onChange={() => edit({ wardrobeLookIds: draft.wardrobeLookIds.filter(id => id !== value) })} />
                  <span>{t('cinematic.manual.missingLook', { id: value })}</span></label>)}
              {!project.castAssignments.length && !draft.castAssignmentIds.length ? <p>{t('cinematic.manual.noCast')}</p> : null}
            </fieldset>
            </fieldset>
            {active ? <div className="cinematic-manual__engine">
              {imageBlock ? <p role="status" className="cinematic-manual__blocked">{imageBlock}</p> : null}
              {renderImage(scene, shot, imageBlock)}
            </div> : null}
          </section>
          <section className="cinematic-manual__video" aria-labelledby={`${id}-video`}>
            <h4 id={`${id}-video`}><Film aria-hidden="true" />{t('cinematic.manual.video')}</h4>
            <fieldset disabled={saving || awaitingProject} className="cinematic-manual__fields">
            <label className="cinematic-manual__field cinematic-manual__length"><span>{t('cinematic.manual.duration')}</span>
              <input type="number" min="1" max="30" step="0.001" inputMode="decimal" value={draft.duration}
                aria-invalid={invalidDuration} aria-describedby={invalidDuration ? `${id}-duration-error` : undefined}
                onChange={event => edit({ duration: event.target.value })} />
            </label>
            {invalidDuration ? <p id={`${id}-duration-error`} className="cinematic-manual__error">{t('cinematic.manual.invalidDuration')}</p> : null}
            <ol className="cinematic-manual__events">
              {draft.events.map((event, index) => <li key={event.id}>
                <fieldset className="cinematic-manual__event">
                  <legend>{t('cinematic.manual.actionNumber', { number: index + 1 })}</legend>
                  <div className="cinematic-manual__times">
                    <label className="cinematic-manual__field"><span>{t('cinematic.manual.start')}</span>
                      <input type="number" min="0" step="0.001" inputMode="decimal" value={event.start}
                        aria-invalid={Boolean(timingErrors[index])} aria-describedby={timingErrors[index] ? `${id}-${event.id}-error` : undefined}
                        onChange={change => updateEvent(event.id, { start: change.target.value })} />
                    </label>
                    <label className="cinematic-manual__field"><span>{t('cinematic.manual.end')}</span>
                      <input type="number" min="0" step="0.001" inputMode="decimal" value={event.end}
                        aria-invalid={Boolean(timingErrors[index])} aria-describedby={timingErrors[index] ? `${id}-${event.id}-error` : undefined}
                        onChange={change => updateEvent(event.id, { end: change.target.value })} />
                    </label>
                    <Button type="button" size="icon" variant="ghost" icon={<Trash2 aria-hidden="true" />}
                      title={t('cinematic.manual.removeAction', { number: index + 1 })}
                      aria-label={t('cinematic.manual.removeAction', { number: index + 1 })} onClick={() => removeEvent(index)} />
                  </div>
                  <label className="cinematic-manual__field"><span>{t('cinematic.manual.description')}</span>
                    <textarea id={`${id}-${event.id}-description`} rows={3} value={event.description}
                      aria-invalid={event.description.trim().length > 1200 || (incompleteEvents && !event.description.trim())}
                      aria-describedby={event.description.trim().length > 1200 ? `${id}-${event.id}-text-error` : undefined}
                      onChange={change => updateEvent(event.id, { description: change.target.value })} />
                  </label>
                  {event.description.trim().length > 1200 ? <p id={`${id}-${event.id}-text-error`} className="cinematic-manual__error">
                    {t('cinematic.manual.textLimit', { limit: 1200 })}
                  </p> : null}
                  {timingErrors[index] ? <p id={`${id}-${event.id}-error`} className="cinematic-manual__error">{t(timingErrors[index]!)}</p> : null}
                </fieldset>
              </li>)}
            </ol>
            <div className="cinematic-manual__event-actions">
              <Button id={`${id}-add-event`} type="button" size="sm" icon={<Plus aria-hidden="true" />}
                disabled={draft.events.length >= 12} onClick={addEvent}>{t('cinematic.manual.addAction')}</Button>
              <span>{t('cinematic.manual.actionCount', { count: draft.events.length })}</span>
            </div>
            {incompleteEvents ? <p className="cinematic-manual__error">{t('cinematic.manual.incompleteActions')}</p> : null}
            </fieldset>
            {active ? <div className="cinematic-manual__engine">
              {videoBlock ? <p role="status" className="cinematic-manual__blocked">{videoBlock}</p> : null}
              {renderVideo(scene, shot, videoBlock)}
            </div> : null}
          </section>
        </div>
    </div>
  </article>;
}

function RowMediaSummary({ project, scene, shot, label }: Pick<RowProps, 'project' | 'scene' | 'shot'> & { label: string }) {
  const { t } = useTranslation('cinematic');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(8);
  const attempts = project.generationAttempts.filter((value): value is Record<string, unknown> =>
    Boolean(value && typeof value === 'object' && 'shotId' in value && value.shotId === shot.id
      && (!('sceneId' in value) || value.sceneId === scene.id)));
  const stills = attempts.filter(value => value.operation === 'cinematic_storyboard_still');
  const takes = attempts.filter(value => ['cinematic_draft_clip', 'cinematic_motion_preview', 'cinematic_final_clip'].includes(String(value.operation)));
  const selected = takes.find(value => value.id === shot.approvedVideoAttemptId);
  const asset = selected?.outputAsset as { posterUrl?: string } | undefined;
  const latest = attempts.at(-1);
  const history = attempts.filter(value => stills.includes(value) || takes.includes(value));
  const stale = shot.storyboardStatus === 'draft' && shot.approvedStoryboardSource
    || latest?.downstreamSourceStatus === 'source_changed' || latest?.downstreamSourceStatus === 'packet_changed';
  return <><div className="cinematic-manual__media-summary">
    <span className="cinematic-manual__thumbnail"><AuthenticatedMediaImage
      src={shot.approvedStoryboardSource?.thumbnailUrl} alt={t('cinematic.manual.imageFor', { title: label })}
      fallback={<ImageIcon aria-hidden="true" />} /></span>
    <span>{t('cinematic.manual.imageHistory', { count: stills.length })}
      {shot.approvedStoryboardSource ? <small>{t('cinematic.manual.approvedImage')}</small> : null}
      <AttemptStatus attempt={stills.at(-1)} />
    </span>
    <span className="cinematic-manual__thumbnail"><AuthenticatedMediaImage src={asset?.posterUrl}
      alt={t('cinematic.manual.videoFor', { title: label })} fallback={<Film aria-hidden="true" />} /></span>
    <span>{t('cinematic.manual.takeHistory', { count: takes.length })}
      {shot.approvedVideoAttemptId ? <small>{t('cinematic.manual.selectedTake')}</small> : null}
      <AttemptStatus attempt={takes.at(-1)} />
    </span>
    <span role="status" className="cinematic-manual__media-status">
      {stale ? <span>{t('cinematic.manual.sourceChanged')}</span> : null}
    </span>
  </div>
  {history.length ? <details className="cinematic-manual__history" open={historyOpen}
    onToggle={event => setHistoryOpen(event.currentTarget.open)}>
    <summary>{t('cinematic.manual.history')}</summary>
    {historyOpen ? <>
      <ol>{history.slice(-historyLimit).reverse().map((attempt, index) => {
        const isImage = attempt.operation === 'cinematic_storyboard_still';
        const output = attempt.outputAsset as { posterUrl?: string; thumbnailUrl?: string; imageUrl?: string } | undefined;
        const preview = isImage ? output?.thumbnailUrl || output?.imageUrl : output?.posterUrl;
        return <li key={String(attempt.id || index)}>
          <span className="cinematic-manual__thumbnail"><AuthenticatedMediaImage src={preview} alt=""
            fallback={isImage ? <ImageIcon aria-hidden="true" /> : <Film aria-hidden="true" />} /></span>
          <span><strong>{t(isImage ? 'cinematic.manual.imageNumber' : 'cinematic.manual.takeNumber', {
            number: (isImage ? stills : takes).indexOf(attempt) + 1
          })}</strong><small>{attempt.sourceKind === 'previous_video_last_frame'
            ? t('cinematic.storyboard.previousFrame.title') : String(attempt.modelLabel || attempt.modelId || '')}</small>
            <AttemptStatus attempt={attempt} />
            {attempt.id === shot.approvedVideoAttemptId ? <small>{t('cinematic.manual.selectedTake')}</small> : null}
          </span>
        </li>;
      })}</ol>
      {history.length > historyLimit ? <Button type="button" size="sm" onClick={() => setHistoryLimit(value => value + 8)}>
        {t('cinematic.manual.moreHistory')}
      </Button> : null}
    </> : null}
  </details> : null}</>;
}

function AttemptStatus({ attempt }: { attempt?: Record<string, unknown> }) {
  const { t } = useTranslation('cinematic');
  if (!attempt) return null;
  const status = String(attempt.status || '');
  const pending = ['pending', 'accepted', 'preparing', 'queued', 'running', 'processing',
    'provider_processing', 'provider_queued', 'provider_submitting', 'media_copying'].includes(status);
  const failed = ['failed', 'expired', 'reconciliation_required'].includes(status);
  const key = pending ? 'generating' : failed ? 'generationFailed' : status === 'cancelled' ? 'cancelled'
    : ['completed', 'superseded'].includes(status) ? 'readyForReview' : 'savedDraft';
  return <span className={`cinematic-manual__attempt-status${failed ? ' is-failed' : ''}`} role="status">
    {pending ? <ProcessingSpinner /> : null}{t(`cinematic.manual.${key}`)}
  </span>;
}
