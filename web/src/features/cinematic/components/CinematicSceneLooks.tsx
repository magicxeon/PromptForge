import { RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { updateCinematicSceneLooks } from '../api/cinematicSeriesApi';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';
import { SceneCastLookSelector } from './authoring/SceneCastLookSelector';
import { readCharacterLookBindings } from './storyboardGenerationAdapter';

type Props = { actorId: string; project: CinematicProject; scene: CinematicScene; disabled: boolean;
  onProjectChanged: (project: CinematicProject) => void; onPendingChange?: (pending: boolean) => void };

export function CinematicSceneLooks({ actorId, project, scene, disabled, onProjectChanged, onPendingChange }: Props) {
  const { t } = useTranslation('cinematic');
  const [ids, setIds] = useState(scene.wardrobeLookIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const savedIds = JSON.stringify(scene.wardrobeLookIds);
  useEffect(() => { setIds(JSON.parse(savedIds) as string[]); setError(''); }, [scene.id, savedIds, actorId]);
  const assignments = (project.castAssignments || []).filter(person => person.active !== false && scene.castMode !== 'none' && scene.castAssignmentIds.includes(person.id));
  const dirty = JSON.stringify(ids) !== JSON.stringify(scene.wardrobeLookIds);
  useEffect(() => { onPendingChange?.(dirty || busy); }, [dirty, busy, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);

  async function save() {
    if (busy || disabled || !dirty) return;
    setBusy(true); setError('');
    try {
      const result = await updateCinematicSceneLooks(project.id, scene.id, {
        expectedVersion: project.version, expectedSceneVersion: scene.version, wardrobeLookIds: ids
      });
      if (getActiveActorId() === actorId) onProjectChanged(result.project);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.characters.operationFailed')); }
    finally { setBusy(false); }
  }

  return <section className="cinematic-scene-looks" aria-label={t('cinematic.lookReferences.sceneTitle')}>
    <SceneCastLookSelector assignments={assignments} selectedCastAssignmentIds={scene.castAssignmentIds} selectedLookIds={ids}
      disabled={disabled || busy} lookSelectionOnly onToggleAssignment={() => {}} onSelectLook={(assignmentId, lookId) => {
        const owned = new Set(readCharacterLookBindings(assignments.find(person => person.id === assignmentId)!).map(look => look.id));
        setIds(current => [...current.filter(id => !owned.has(id)), ...(lookId ? [lookId] : [])]);
      }} />
    {!assignments.length ? <p>{t('cinematic.shotWorkspace.noCast')}</p> : <div className="cinematic-scene-looks__actions">
      <span role="status">{t(dirty ? 'cinematic.scenes.unsaved' : 'cinematic.lookReferences.sceneSaved')}</span>
      {dirty ? <Button size="icon" icon={<RotateCcw />} disabled={busy} aria-label={t('cinematic.lookReferences.discard')} title={t('cinematic.lookReferences.discard')} onClick={() => setIds(scene.wardrobeLookIds)} /> : null}
      <Button size="sm" icon={<Save />} loading={busy} disabled={disabled || busy || !dirty} onClick={() => void save()}>{t('cinematic.lookReferences.saveScene')}</Button>
    </div>}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
