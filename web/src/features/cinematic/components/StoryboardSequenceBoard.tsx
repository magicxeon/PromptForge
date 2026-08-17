import { ArrowLeft, ArrowRight, Clock3, GripVertical, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type StoryboardShotSummary = {
  id: string;
  durationSeconds: number;
  title: string;
  framing: string;
  action: string;
  status: 'ready' | 'draft' | 'warning';
};

type StoryboardSequenceBoardProps = {
  sceneId?: string;
  sceneTitle: string;
  sceneDurationSeconds: number;
  shots: StoryboardShotSummary[];
  selectedShotId: string;
  onSelectShot: (shotId: string) => void;
  onMoveShot: (shotId: string, direction: 'earlier' | 'later') => void;
};

export function StoryboardSequenceBoard({
  sceneId,
  sceneTitle,
  sceneDurationSeconds,
  shots,
  selectedShotId,
  onSelectShot,
  onMoveShot
}: StoryboardSequenceBoardProps) {
  const { t } = useTranslation('cinematic');

  return (
    <section id={`storyboard-sequence-${sceneId || 'preview'}`} className="cinematic-storyboard-board" aria-label={t('cinematic.storyboard.boardLabel')} tabIndex={-1}>
      <header className="cinematic-storyboard-board__header">
        <div>
          <span>{t('cinematic.storyboard.sequence')}</span>
          <h3>{sceneTitle}</h3>
        </div>
        <div className="cinematic-storyboard-board__timing">
          <span><Clock3 aria-hidden="true" />{formatSeconds(sceneDurationSeconds)} {t('cinematic.storyboard.total')}</span>
          <small>{shots.length} {t('cinematic.storyboard.shots')}</small>
        </div>
      </header>
      <div className="cinematic-storyboard-board__grid">
        {shots.map((shot, index) => (
          <article
            id={`storyboard-shot-${shot.id}`}
            key={shot.id}
            className={`cinematic-storyboard-card${selectedShotId === shot.id ? ' is-selected' : ''}`}
            draggable
            data-shot-id={shot.id}
          >
            <button
              type="button"
              className="cinematic-storyboard-card__media"
              aria-label={`${t('cinematic.storyboard.editShot')} ${shot.id}`}
              onClick={() => onSelectShot(shot.id)}
            >
              <ImageIcon aria-hidden="true" />
              <span>{t('cinematic.storyboard.previewEmpty')}</span>
            </button>
            <div className="cinematic-storyboard-card__body">
              <header>
                <span className="cinematic-storyboard-card__handle" title={t('cinematic.storyboard.dragToReorder')}><GripVertical aria-hidden="true" /></span>
                <div><strong>{t('cinematic.storyboard.shot')} {shot.id}</strong><small>{shot.title}</small></div>
                <span className="cinematic-storyboard-card__duration"><Clock3 aria-hidden="true" />{formatSeconds(shot.durationSeconds)}</span>
              </header>
              <dl><div><dt>{t('cinematic.storyboard.framing')}</dt><dd>{shot.framing}</dd></div><div><dt>{t('cinematic.storyboard.action')}</dt><dd>{shot.action}</dd></div></dl>
              <footer>
                <span className={`cinematic-status-pill is-${shot.status}`}>{t(`cinematic.storyboard.status.${shot.status}`)}</span>
                <div>
                  <button type="button" disabled={index === 0} aria-label={`${t('cinematic.storyboard.moveEarlier')} ${shot.id}`} onClick={() => onMoveShot(shot.id, 'earlier')}><ArrowLeft aria-hidden="true" /></button>
                  <button type="button" disabled={index === shots.length - 1} aria-label={`${t('cinematic.storyboard.moveLater')} ${shot.id}`} onClick={() => onMoveShot(shot.id, 'later')}><ArrowRight aria-hidden="true" /></button>
                </div>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatSeconds(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}s`;
}
