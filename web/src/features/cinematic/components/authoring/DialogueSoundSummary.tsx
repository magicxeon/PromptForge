import { MessageSquare, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import type { CinematicCastAssignment, CinematicShot } from '../../schemas/cinematicSchemas';

export function DialogueSoundSummary({ shot, cast, onEdit, silent = false }: {
  shot: CinematicShot; cast: CinematicCastAssignment[]; onEdit?: () => void; silent?: boolean;
}) {
  const { t } = useTranslation('cinematic');
  return <section className="cinematic-cue-editor">
    <header><h4><MessageSquare aria-hidden="true" />{t('cinematic.cues.title')}</h4>
      {onEdit ? <Button size="sm" icon={<Pencil />} onClick={onEdit}>{t('cinematic.cues.editInPlan')}</Button> : null}</header>
    {(shot.dialogueCues || []).map((cue, i) => <p key={i}><strong>{cast.find(item => item.id === cue.speakerCastAssignmentId)?.displayName || cue.offscreenVoiceRole}: </strong>{cue.text}</p>)}
    {(shot.audioCues || []).map((cue, i) => <p key={i}>{cue.description || cue.source}</p>)}
    {!shot.dialogueCues?.length && !shot.audioCues?.length ? <p>{t('cinematic.cues.empty')}</p> : null}
    {silent && (shot.dialogueCues?.length || shot.audioCues?.length) ? <p role="status">{t('cinematic.cues.silentOutput')}</p> : null}
  </section>;
}
