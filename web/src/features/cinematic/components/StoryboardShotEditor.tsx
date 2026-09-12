import { Save, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';
import { updateCinematicShotDirection } from '../api/cinematicApi';
import { ShotSequenceEditor } from './authoring/ShotSequenceEditor';

const fields = ['title', 'purpose', 'durationMs', 'visibleMoment', 'subjectAction',
  'emotionalTarget', 'performanceCue', 'continuityEntry', 'continuityExit',
  'transitionToNext', 'framing', 'cameraAngle', 'lensIntent', 'cameraMovement',
  'lighting', 'environment'] as const;

export function StoryboardShotEditor({ project, scene, shot, initialPrompt, onClose, onSaved }: {
  project: CinematicProject; scene: CinematicScene; shot: CinematicShot;
  initialPrompt: string; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useTranslation('cinematic');
  const [draft, setDraft] = useState(() => ({ ...shot, prompt: initialPrompt }));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await updateCinematicShotDirection(project.id, scene.id, shot.id, {
        ...Object.fromEntries(fields.map(field => [field, draft[field]])),
        expectedVersion: project.version, expectedShotVersion: shot.version,
        prompt: draft.prompt
      });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('cinematic.status.saveFailed'));
    } finally { setPending(false); }
  }
  return <section className="cinematic-inline-shot-editor cinematic-authoring-dialog" aria-label={t('cinematic.storyboard.editShot')}>
    <h3>{t('cinematic.storyboard.editShot')}</h3>
    <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
      <ShotSequenceEditor scene={{ ...scene, shots: [draft] }} mode="advanced" directionOnly
        castAssignments={project.castAssignments} onAddShot={() => {}} onMoveShot={() => {}} onRemoveShot={() => {}}
        onUpdateShot={(_id, field, value) => setDraft(current => ({ ...current, [field]: value }))} />
      <label className="mt-3 grid gap-2"><span>{t('cinematic.storyboard.shotDirection')}</span>
        <textarea rows={4} maxLength={4000} value={draft.prompt}
          onChange={event => setDraft(current => ({ ...current, prompt: event.target.value }))} />
      </label>
    </fieldset>
    <p className="text-sm text-[var(--mpf-text-muted)]">{t('cinematic.storyboard.editKeepsMedia')}</p>
    {error ? <p role="alert">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2">
      <Button disabled={pending} icon={<X />} onClick={onClose}>{t('cinematic.actions.cancel')}</Button>
      <Button variant="primary" disabled={pending || !draft.title.trim()}
        icon={pending ? <ProcessingSpinner /> : <Save />} onClick={() => void save()}>
        {t(pending ? 'cinematic.save.saving' : 'cinematic.storyboard.saveDirection')}
      </Button>
    </div>
  </section>;
}
