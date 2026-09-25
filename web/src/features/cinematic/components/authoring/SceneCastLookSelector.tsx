import { useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';
import { AuthenticatedMediaImage } from '../../../../components/media/AuthenticatedMediaImage';
import type { CinematicCastAssignment } from '../../schemas/cinematicSchemas';
import { readCharacterLookBindings } from '../storyboardGenerationAdapter';

type Props = {
  assignments: CinematicCastAssignment[];
  selectedCastAssignmentIds: string[];
  selectedLookIds: string[];
  onToggleAssignment: (assignmentId: string, selected: boolean) => void;
  onSelectLook: (assignmentId: string, lookId: string) => void;
  disabled?: boolean;
  lookSelectionOnly?: boolean;
};

export function SceneCastLookSelector({
  assignments, selectedCastAssignmentIds, selectedLookIds, onToggleAssignment, onSelectLook, disabled = false, lookSelectionOnly = false
}: Props) {
  const { t } = useTranslation('cinematic');
  const activeAssignments = assignments.filter(assignment => assignment.active !== false);
  if (!activeAssignments.length) return null;
  return <section className="cinematic-director-cast" aria-labelledby="cinematic-director-cast-title">
    <header><div><h3 id="cinematic-director-cast-title">{t('cinematic.director.sceneCast')}</h3><p>{t('cinematic.director.sceneCastHint')}</p></div></header>
    <div className="cinematic-director-cast__list">
      {activeAssignments.map(assignment => {
        const selected = selectedCastAssignmentIds.includes(assignment.id);
        const bindings = readCharacterLookBindings(assignment);
        const looks = lookSelectionOnly ? bindings : readAssignmentLooks(assignment);
        const selectedLookId = selectedLookIds.find(id => looks.some(look => look.id === id)) || '';
        const selectedBinding = bindings.find(look => look.id === selectedLookId);
        return <article key={assignment.id} className={selected ? 'is-selected' : ''}>
          <label className="cinematic-director-cast__character">
            {!lookSelectionOnly ? <input type="checkbox" checked={selected} disabled={disabled} onChange={event => onToggleAssignment(assignment.id, event.target.checked)} /> : null}
            <span className="cinematic-director-cast__portrait" aria-hidden="true">
              <AuthenticatedMediaImage src={selectedBinding?.previewUrl || assignment.generatedSheet?.previewUrl || assignment.portraitUrl || undefined}
                alt="" fallback={<UserRound />} />
            </span>
            <span><strong>{assignment.displayName}</strong><small>{assignment.storyRole}</small></span>
          </label>
          <label><span>{t('cinematic.director.sceneLook')}</span><select aria-label={lookSelectionOnly ? t('cinematic.lookReferences.lookFor', { name: assignment.displayName }) : undefined} value={selectedLookId} disabled={disabled || !selected} onChange={event => onSelectLook(assignment.id, event.target.value)}>
            <option value="">{t(lookSelectionOnly ? 'cinematic.lookReferences.chooseLook' : 'cinematic.director.characterWardrobe')}</option>
            {looks.map(look => <option key={look.id} value={look.id} disabled={lookSelectionOnly && !bindings.find(binding => binding.id === look.id)?.ready}>{look.name}{lookSelectionOnly && !bindings.find(binding => binding.id === look.id)?.ready ? ` (${t('cinematic.lookReferences.unavailable')})` : ''}</option>)}
          </select>{lookSelectionOnly ? <small>{selectedBinding ? t(`cinematic.lookReferences.source.${selectedBinding.source}`) : t('cinematic.lookReferences.empty')}</small> : null}</label>
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
