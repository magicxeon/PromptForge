import { useTranslation } from 'react-i18next';
import { AuthenticatedMediaImage } from '../../../../components/media/AuthenticatedMediaImage';
import type { CinematicCastAssignment } from '../../schemas/cinematicSchemas';

type Props = {
  assignments: CinematicCastAssignment[];
  selectedCastAssignmentIds: string[];
  selectedLookIds: string[];
  onToggleAssignment: (assignmentId: string, selected: boolean) => void;
  onSelectLook: (assignmentId: string, lookId: string) => void;
};

export function SceneCastLookSelector({
  assignments, selectedCastAssignmentIds, selectedLookIds, onToggleAssignment, onSelectLook
}: Props) {
  const { t } = useTranslation('cinematic');
  const activeAssignments = assignments.filter(assignment => assignment.active !== false);
  if (!activeAssignments.length) return null;
  return <section className="cinematic-director-cast" aria-labelledby="cinematic-director-cast-title">
    <header><div><h3 id="cinematic-director-cast-title">{t('cinematic.director.sceneCast')}</h3><p>{t('cinematic.director.sceneCastHint')}</p></div></header>
    <div className="cinematic-director-cast__list">
      {activeAssignments.map(assignment => {
        const selected = selectedCastAssignmentIds.includes(assignment.id);
        const looks = readAssignmentLooks(assignment);
        const selectedLookId = selectedLookIds.find(id => looks.some(look => look.id === id)) || '';
        return <article key={assignment.id} className={selected ? 'is-selected' : ''}>
          <label className="cinematic-director-cast__character">
            <input type="checkbox" checked={selected} onChange={event => onToggleAssignment(assignment.id, event.target.checked)} />
            <AuthenticatedMediaImage src={assignment.portraitUrl || undefined} alt="" />
            <span><strong>{assignment.displayName}</strong><small>{assignment.storyRole}</small></span>
          </label>
          <label><span>{t('cinematic.director.sceneLook')}</span><select value={selectedLookId} disabled={!selected} onChange={event => onSelectLook(assignment.id, event.target.value)}>
            <option value="">{t('cinematic.director.characterWardrobe')}</option>
            {looks.map(look => <option key={look.id} value={look.id}>{look.name}</option>)}
          </select></label>
        </article>;
      })}
    </div>
  </section>;
}

export type SceneWardrobeLook = { id: string; name: string };

export function readAssignmentLooks(assignment?: CinematicCastAssignment): SceneWardrobeLook[] {
  return (assignment?.looks || []).flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const record = value as Record<string, unknown>;
    const id = String(record.id || '').trim();
    if (!id) return [];
    return [{ id, name: String(record.name || id) }];
  });
}
