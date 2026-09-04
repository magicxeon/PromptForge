import { useTranslation } from 'react-i18next';
import { StoryboardSequenceBoard } from '../StoryboardSequenceBoard';
import type { ProduceSceneQueue } from './produceReadModel';

export function ProduceShotQueue({
  scenes,
  selectedShotId,
  onSelectShot
}: {
  scenes: ProduceSceneQueue[];
  selectedShotId: string;
  onSelectShot: (sceneId: string, shotId: string) => void;
}) {
  const { t } = useTranslation('cinematic');
  return (
    <aside className="cinematic-produce-queue" aria-label={t('cinematic.produce.shotQueue')}>
      <header>
        <h3>{t('cinematic.produce.shotQueue')}</h3>
        <p>{t('cinematic.produce.queueHint')}</p>
      </header>
      <div className="cinematic-produce-queue__scenes">
        {scenes.map(scene => (
          <StoryboardSequenceBoard
            key={scene.id}
            sceneId={`produce-${scene.id}`}
            sceneTitle={scene.title}
            sceneDurationSeconds={scene.durationSeconds}
            shots={scene.shots.map((shot, shotIndex) => ({
              ...shot,
              sequenceLabel: `${t('cinematic.storyboard.shot')} ${shotIndex + 1}`
            }))}
            selectedShotId={selectedShotId}
            onSelectShot={shotId => onSelectShot(scene.id, shotId)}
            onMoveShot={() => undefined}
            readOnly
            variant="queue"
          />
        ))}
      </div>
    </aside>
  );
}
