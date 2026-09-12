import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import type {
  CinematicAuthoringManifest, CinematicCastAssignment, CinematicScene, CinematicShot
} from '../../schemas/cinematicSchemas';
import { DialogueSoundEditor } from './DialogueSoundEditor';
import { isCinematicFieldVisible } from './cinematicFieldProjection';



type Props = {
  scene: CinematicScene;
  mode: 'simple' | 'advanced';
  authoringManifest?: CinematicAuthoringManifest;
  directionOnly?: boolean;
  castAssignments: CinematicCastAssignment[];
  onAddShot: () => void;
  onMoveShot: (shotId: string, direction: 'earlier' | 'later') => void;
  onRemoveShot: (shotId: string) => void;
  onUpdateShot: <K extends keyof CinematicShot>(shotId: string, field: K, value: CinematicShot[K]) => void;


};

export function ShotSequenceEditor({
  scene, mode, authoringManifest, castAssignments, onAddShot, onMoveShot, onRemoveShot,
  onUpdateShot, directionOnly = false
}: Props) {
  const { t } = useTranslation('cinematic');
  const visible = (path: string) => isCinematicFieldVisible(authoringManifest, path, mode);
  return <section className="cinematic-director-shots">
    {!directionOnly ? <header><div><h3>{t('cinematic.director.shotSkeleton')}</h3><span>{t('cinematic.director.shotSkeletonHint')}</span></div><Button size="sm" icon={<Plus aria-hidden="true" />} onClick={onAddShot}>{t('cinematic.director.addShot')}</Button></header> : null}
    {scene.shots.map((shot, index) => <article key={shot.id} className="cinematic-director-shot-row">
      <div className={`cinematic-director-shot-row__summary${mode === 'simple' ? ' is-simple' : ''}`}>
        <strong>{String(index + 1).padStart(2, '0')}</strong>
        <label><span>{t('cinematic.director.shotTitle')}</span><input value={shot.title} onChange={event => onUpdateShot(shot.id, 'title', event.target.value)} /></label>
        {visible('shot.purpose') ? <label><span>{t('cinematic.director.shotPurpose')}</span><input value={shot.purpose} onChange={event => onUpdateShot(shot.id, 'purpose', event.target.value)} /></label> : null}
        <label><span>{t('cinematic.director.shotDuration')}</span><input type="number" min="0.5" step="0.5" value={shot.durationMs / 1000} onChange={event => onUpdateShot(shot.id, 'durationMs', Math.max(500, Number(event.target.value || 0) * 1000))} /></label>
        {!directionOnly ? <div className="cinematic-director-shot-row__actions">
          <Button size="icon" variant="ghost" icon={<ArrowUp aria-hidden="true" />} aria-label={t('cinematic.director.moveShotEarlier', { name: shot.title })} disabled={index === 0} onClick={() => onMoveShot(shot.id, 'earlier')} />
          <Button size="icon" variant="ghost" icon={<ArrowDown aria-hidden="true" />} aria-label={t('cinematic.director.moveShotLater', { name: shot.title })} disabled={index === scene.shots.length - 1} onClick={() => onMoveShot(shot.id, 'later')} />
          <ConfirmDialog trigger={<Button size="icon" variant="ghost" icon={<Trash2 aria-hidden="true" />} aria-label={t('cinematic.director.removeShot', { name: shot.title })} disabled={scene.shots.length <= 1} />} title={t('cinematic.director.removeShotTitle')} description={t('cinematic.director.removeShotDescription', { name: shot.title })} confirmLabel={t('cinematic.director.removeShotConfirm')} destructive onConfirm={() => onRemoveShot(shot.id)} />
        </div> : null}
      </div>
      <div className="cinematic-director-shot-contract">
        {!directionOnly ? <label><span>{t('cinematic.director.castCoverage')}</span><select value={shot.castMode || 'inherit'} onChange={event => onUpdateShot(shot.id, 'castMode', event.target.value as CinematicShot['castMode'])}>
          <option value="inherit">{t('cinematic.director.castInherit')}</option>
          <option value="none">{t('cinematic.director.castNone')}</option>
          <option value="selected">{t('cinematic.director.castSelected')}</option>
        </select></label> : null}
        {!directionOnly && shot.castMode === 'selected' ? <fieldset className="cinematic-director-grid__wide cinematic-shot-cast-choices"><legend>{t('cinematic.director.castSelected')}</legend>
          {castAssignments.filter(assignment => scene.castAssignmentIds.includes(assignment.id)).map(assignment => <label key={assignment.id}>
            <input type="checkbox" checked={shot.castAssignmentIds.includes(assignment.id)} onChange={event => onUpdateShot(shot.id, 'castAssignmentIds', event.target.checked ? [...shot.castAssignmentIds, assignment.id] : shot.castAssignmentIds.filter(id => id !== assignment.id))} />
            <span>{assignment.displayName}</span>
          </label>)}
        </fieldset> : null}
        <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.visibleMoment')}</span><textarea rows={2} value={shot.visibleMoment || ''} onChange={event => onUpdateShot(shot.id, 'visibleMoment', event.target.value)} /></label>
        <label><span>{t('cinematic.director.subjectAction')}</span><textarea rows={2} value={shot.subjectAction || ''} onChange={event => onUpdateShot(shot.id, 'subjectAction', event.target.value)} /></label>
        <label><span>{t('cinematic.director.emotionalTarget')}</span><textarea rows={2} value={shot.emotionalTarget || ''} onChange={event => onUpdateShot(shot.id, 'emotionalTarget', event.target.value)} /></label>
        {shot.castMode !== 'none' && scene.castMode !== 'none' && visible('shot.performanceCue') ? <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.performanceCue')}</span><textarea rows={2} value={shot.performanceCue || ''} onChange={event => onUpdateShot(shot.id, 'performanceCue', event.target.value)} /></label> : null}
        {visible('shot.continuityEntry') ? <label><span>{t('cinematic.director.continuityEntry')}</span><textarea rows={2} value={shot.continuityEntry || ''} onChange={event => onUpdateShot(shot.id, 'continuityEntry', event.target.value)} /></label> : null}
        {visible('shot.continuityExit') ? <label><span>{t('cinematic.director.continuityExit')}</span><textarea rows={2} value={shot.continuityExit || ''} onChange={event => onUpdateShot(shot.id, 'continuityExit', event.target.value)} /></label> : null}
        {visible('shot.transitionToNext') ? <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.transitionToNext')}</span><input value={shot.transitionToNext || ''} onChange={event => onUpdateShot(shot.id, 'transitionToNext', event.target.value)} /></label> : null}
      </div>
      {!directionOnly ? <DialogueSoundEditor shot={shot} cast={shot.castMode === 'none' || scene.castMode === 'none' ? [] : castAssignments.filter(item => (shot.castAssignmentIds.length ? shot.castAssignmentIds : scene.castAssignmentIds).includes(item.id))}
        onDialogue={rows => onUpdateShot(shot.id, 'dialogueCues', rows)} onSound={rows => onUpdateShot(shot.id, 'audioCues', rows)} /> : null}
      {mode === 'advanced' ? <details className="cinematic-director-shot-advanced">
        <summary>{t(directionOnly ? 'cinematic.storyboard.cameraAndLighting' : 'cinematic.director.shotAdvanced')}</summary>
        <div className="cinematic-director-shot-contract">
          {(['framing', 'cameraAngle', 'lensIntent', 'cameraMovement', 'lighting', 'environment'] as const).map(field => <label key={field}><span>{t(`cinematic.director.${field === 'lighting' ? 'shotLighting' : field}`)}</span><textarea rows={2} value={shot[field] || ''} onChange={event => onUpdateShot(shot.id, field, event.target.value)} /></label>)}
          {!directionOnly ? <label><span>{t('cinematic.director.coverageRole')}</span><select value={shot.coverageRole || (index === 0 ? 'establishing' : 'action')} onChange={event => onUpdateShot(shot.id, 'coverageRole', event.target.value as NonNullable<CinematicShot['coverageRole']>)}>
            {(['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff'] as const).map(role => <option key={role} value={role}>{t(`cinematic.director.coverageRole.${role}`)}</option>)}
          </select></label> : null}
        </div>
      </details> : null}
    </article>)}
  </section>;
}
