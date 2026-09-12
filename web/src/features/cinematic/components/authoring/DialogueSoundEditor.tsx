import { ArrowDown, ArrowUp, MessageSquare, Plus, Trash2, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import type { CinematicCastAssignment, CinematicShot } from '../../schemas/cinematicSchemas';

type Props = {
  shot: CinematicShot;
  cast: CinematicCastAssignment[];
  onDialogue: (rows: NonNullable<CinematicShot['dialogueCues']>) => void;
  onSound: (rows: NonNullable<CinematicShot['audioCues']>) => void;
};

export function hasInvalidCues(shot: CinematicShot) {
  return (shot.dialogueCues || []).some(cue => !cue.text.trim() || (!cue.speakerCastAssignmentId && !cue.offscreenVoiceRole.trim()) || !Number.isFinite(cue.startOffsetMs) || cue.startOffsetMs < 0 || cue.startOffsetMs > shot.durationMs)
    || (shot.audioCues || []).some(cue => !cue.description.trim() || !Number.isFinite(cue.startOffsetMs) || cue.startOffsetMs < 0 || cue.startOffsetMs > shot.durationMs);
}

export function DialogueSoundEditor({ shot, cast, onDialogue, onSound }: Props) {
  const { t } = useTranslation('cinematic');
  const dialogue = shot.dialogueCues || [], sounds = shot.audioCues || [];
  const duration = shot.durationMs / 1000;
  function actions(index: number, count: number, change: (from: number, to: number) => void, remove: () => void) {
    return <div className="cinematic-cue-actions">
      <Button size="icon" variant="ghost" icon={<ArrowUp />} aria-label={t('cinematic.cues.earlier')} disabled={!index} onClick={() => change(index, index - 1)} />
      <Button size="icon" variant="ghost" icon={<ArrowDown />} aria-label={t('cinematic.cues.later')} disabled={index === count - 1} onClick={() => change(index, index + 1)} />
      <Button size="icon" variant="ghost" icon={<Trash2 />} aria-label={t('cinematic.cues.remove')} onClick={remove} />
    </div>;
  }
  return <section className="cinematic-cue-editor" aria-label={t('cinematic.cues.title')}>
    <header><h4><MessageSquare aria-hidden="true" />{t('cinematic.cues.title')}</h4><span>{dialogue.length} / 12</span></header>
    {dialogue.map((cue, index) => <div className="cinematic-cue-row" key={index}>
      <header><strong>{t('cinematic.cues.line', { number: index + 1 })}</strong>{actions(index, dialogue.length,
        (from, to) => { const next = [...dialogue]; [next[from], next[to]] = [next[to]!, next[from]!]; onDialogue(next); },
        () => onDialogue(dialogue.filter((_, i) => i !== index)))}</header>
      <div className="cinematic-cue-fields">
        <label><span>{t('cinematic.director.dialogueSpeaker')}</span><select value={cue.speakerCastAssignmentId || ''}
          onChange={event => onDialogue(dialogue.map((row, i) => i === index ? { ...row, speakerCastAssignmentId: event.target.value, speakerVisible: Boolean(event.target.value), offscreenVoiceRole: event.target.value ? '' : row.offscreenVoiceRole } : row))}>
          <option value="">{t('cinematic.cues.offscreen')}</option>
          {cue.speakerCastAssignmentId && !cast.some(item => item.id === cue.speakerCastAssignmentId) ? <option value={cue.speakerCastAssignmentId}>{t('cinematic.cues.unavailableSpeaker')}</option> : null}
          {cast.map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}
        </select></label>
        {!cue.speakerCastAssignmentId ? <label><span>{t('cinematic.cues.voiceRole')}</span><input required maxLength={100} value={cue.offscreenVoiceRole} onChange={event => onDialogue(dialogue.map((row, i) => i === index ? { ...row, offscreenVoiceRole: event.target.value } : row))} /></label> : null}
        <label><span>{t('cinematic.director.dialogueDelivery')}</span><input maxLength={240} value={cue.delivery} onChange={event => onDialogue(dialogue.map((row, i) => i === index ? { ...row, delivery: event.target.value } : row))} /></label>
        <label><span>{t('cinematic.cues.start')}</span><input type="number" min={0} max={duration} step="0.1" value={cue.startOffsetMs / 1000} onChange={event => onDialogue(dialogue.map((row, i) => i === index ? { ...row, startOffsetMs: Math.round(Number(event.target.value) * 1000) } : row))} /></label>
        <label className="cinematic-cue-wide"><span>{t('cinematic.director.dialogueText')}</span><textarea rows={2} required maxLength={600} value={cue.text} onChange={event => onDialogue(dialogue.map((row, i) => i === index ? { ...row, text: event.target.value } : row))} /></label>
      </div>
      {cue.startOffsetMs + cue.estimatedDurationMs > shot.durationMs ? <p role="status">{t('cinematic.cues.timingWarning')}</p> : null}
    </div>)}
    <Button size="sm" icon={<Plus />} disabled={dialogue.length >= 12} onClick={() => onDialogue([...dialogue, {
      speakerCastAssignmentId: cast[0]?.id || '', offscreenVoiceRole: '', text: '', delivery: '', startOffsetMs: 0,
      estimatedDurationMs: Math.min(2000, shot.durationMs), speakerVisible: Boolean(cast.length)
    }])}>{t('cinematic.cues.addDialogue')}</Button>
    <header><h4><Volume2 aria-hidden="true" />{t('cinematic.cues.sound')}</h4><span>{sounds.length} / 12</span></header>
    {sounds.map((cue, index) => <div className="cinematic-cue-row" key={index}>
      <header><strong>{t('cinematic.cues.soundNumber', { number: index + 1 })}</strong>{actions(index, sounds.length,
        (from, to) => { const next = [...sounds]; [next[from], next[to]] = [next[to]!, next[from]!]; onSound(next); },
        () => onSound(sounds.filter((_, i) => i !== index)))}</header>
      <div className="cinematic-cue-fields">
        <label><span>{t('cinematic.cues.kind')}</span><select value={cue.kind} onChange={event => onSound(sounds.map((row, i) => i === index ? { ...row, kind: event.target.value } : row))}>
          {!['ambience', 'sfx', 'music'].includes(cue.kind) ? <option value={cue.kind}>{cue.kind}</option> : null}
          {['ambience', 'sfx', 'music'].map(kind => <option key={kind} value={kind}>{t(`cinematic.cues.${kind}`)}</option>)}
        </select></label>
        <label><span>{t('cinematic.cues.start')}</span><input type="number" min={0} max={duration} step="0.1" value={cue.startOffsetMs / 1000} onChange={event => onSound(sounds.map((row, i) => i === index ? { ...row, startOffsetMs: Math.round(Number(event.target.value) * 1000) } : row))} /></label>
        <label className="cinematic-cue-wide"><span>{t('cinematic.director.audioCue')}</span><textarea rows={2} required maxLength={500} value={cue.description} onChange={event => onSound(sounds.map((row, i) => i === index ? { ...row, description: event.target.value } : row))} /></label>
      </div>
    </div>)}
    <Button size="sm" icon={<Plus />} disabled={sounds.length >= 12} onClick={() => onSound([...sounds, { kind: 'ambience', source: 'scene', description: '', startOffsetMs: 0, durationMs: shot.durationMs }])}>{t('cinematic.cues.addSound')}</Button>
  </section>;
}
