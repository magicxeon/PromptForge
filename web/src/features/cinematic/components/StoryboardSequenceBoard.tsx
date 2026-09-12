import { ArrowLeft, ArrowRight, Clock3, GripVertical, Image as ImageIcon, ContactRound, Clapperboard, Pencil } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useTranslation } from 'react-i18next';
import { useGenerationJob } from '../../generation/hooks/useGenerationJob';

export type StoryboardShotSummary = {
  id: string;
  sequenceLabel?: string;
  durationSeconds: number;
  title: string;
  framing: string;
  action: string;
  status: 'ready' | 'draft' | 'warning' | 'quoted' | 'queued' | 'generating' | 'review' | 'approved' | 'failed' | 'storyboard_required' | 'source_changed' | 'audio_incomplete';
  imageUrl?: string | null;
  generationJobId?: string | null;
  videoReferenceMode?: 'storyboard_only' | 'storyboard_and_looks' | 'looks_only' | 'text_only';
  castNames?: string[];
  lookNames?: string[];
};

type StoryboardSequenceBoardProps = {
  sceneId?: string;
  sceneTitle: string;
  sceneDurationSeconds: number;
  shots: StoryboardShotSummary[];
  selectedShotId: string;
  onSelectShot: (shotId: string) => void;
  onEditShot?: (shotId: string) => void;
  onMoveShot: (shotId: string, direction: 'earlier' | 'later') => void;
  readOnly?: boolean;
  variant?: 'board' | 'queue';
};

export function StoryboardSequenceBoard({
  sceneId,
  sceneTitle,
  sceneDurationSeconds,
  shots,
  selectedShotId,
  onSelectShot,
  onEditShot,
  onMoveShot,
  readOnly = false,
  variant = 'board'
}: StoryboardSequenceBoardProps) {
  const { t } = useTranslation('cinematic');

  return (
    <section
      id={`storyboard-sequence-${sceneId || 'preview'}`}
      className={`cinematic-storyboard-board${readOnly ? ' is-read-only' : ''}${variant === 'queue' ? ' is-queue' : ''}`}
      aria-label={t('cinematic.storyboard.boardLabel')}
      tabIndex={-1}
    >
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
        {shots.map((shot, index) => <StoryboardShotCard
          key={shot.id}
          shot={shot}
          index={index}
          selected={selectedShotId === shot.id}
          last={index === shots.length - 1}
          onSelectShot={onSelectShot}
          onEditShot={onEditShot}
          onMoveShot={onMoveShot}
          readOnly={readOnly}
        />)}
      </div>
    </section>
  );
}

function StoryboardShotCard({ shot, index, selected, last, onSelectShot, onEditShot, onMoveShot, readOnly }: {
  shot: StoryboardShotSummary;
  index: number;
  selected: boolean;
  last: boolean;
  onSelectShot: (shotId: string) => void;
  onEditShot?: (shotId: string) => void;
  onMoveShot: (shotId: string, direction: 'earlier' | 'later') => void;
  readOnly: boolean;
}) {
  if (shot.generationJobId && !readOnly) {
    return <TrackedStoryboardShotCard shot={shot} index={index} selected={selected} last={last}
      onSelectShot={onSelectShot} onEditShot={onEditShot} onMoveShot={onMoveShot} readOnly={readOnly} />;
  }
  return <StoryboardShotCardContent shot={shot} index={index} selected={selected} last={last}
    onSelectShot={onSelectShot} onEditShot={onEditShot} onMoveShot={onMoveShot} readOnly={readOnly} />;
}

function TrackedStoryboardShotCard(props: Parameters<typeof StoryboardShotCardContent>[0]) {
  const job = useGenerationJob(props.shot.generationJobId || null);
  return <StoryboardShotCardContent {...props} generatedImageUrl={job.data?.result?.imageUrl || null}
    generationStatus={job.data?.status || 'queued'} />;
}

function StoryboardShotCardContent({ shot, index, selected, last, onSelectShot, onEditShot, onMoveShot,
  readOnly, generatedImageUrl = null, generationStatus = null }: {
  shot: StoryboardShotSummary;
  index: number;
  selected: boolean;
  last: boolean;
  onSelectShot: (shotId: string) => void;
  onEditShot?: (shotId: string) => void;
  onMoveShot: (shotId: string, direction: 'earlier' | 'later') => void;
  readOnly: boolean;
  generatedImageUrl?: string | null;
  generationStatus?: string | null;
}) {
  const { t } = useTranslation('cinematic');
  const imageUrl = shot.imageUrl || generatedImageUrl;
  const status = ['ready', 'source_changed'].includes(shot.status)
    ? shot.status
    : generationStatus === 'completed' && generatedImageUrl
      ? 'review'
      : generationStatus === 'failed'
        ? 'failed'
        : shot.generationJobId
          ? 'queued'
          : shot.status;
  return (
          <article
            id={`storyboard-shot-${shot.id}`}
            className={`cinematic-storyboard-card${selected ? ' is-selected' : ''}`}
            draggable={!readOnly}
            data-shot-id={shot.id}
          >
            <button
              type="button"
              className="cinematic-storyboard-card__media"
              aria-label={`${t(readOnly ? 'cinematic.storyboard.selectShot' : 'cinematic.storyboard.editShot')} ${shot.id}`}
              onClick={() => onSelectShot(shot.id)}
            >
              {['looks_only', 'text_only'].includes(shot.videoReferenceMode || '')
                ? <div className="cinematic-source-tile"><span>{shot.videoReferenceMode === 'text_only' ? <Clapperboard aria-hidden="true" /> : <><ContactRound aria-hidden="true" /><Clapperboard aria-hidden="true" /></>}</span><small>{t(shot.videoReferenceMode === 'text_only' ? 'cinematic.produce.references.textOnlyShort' : 'cinematic.produce.references.lookSheetShort')}</small></div>
                : imageUrl
                ? <img src={imageUrl} alt="" />
                : shot.generationJobId && status === 'queued'
                  ? <><ProcessingSpinner className="animate-spin" aria-hidden="true" /><span>{t('cinematic.storyboard.status.queued')}</span></>
                  : <><ImageIcon aria-hidden="true" /><span>{t('cinematic.storyboard.previewEmpty')}</span></>}
            </button>
            <div className="cinematic-storyboard-card__body">
              <header>
                {!readOnly ? <span className="cinematic-storyboard-card__handle" title={t('cinematic.storyboard.dragToReorder')}><GripVertical aria-hidden="true" /></span> : null}
                <div><strong>{shot.sequenceLabel || `${t('cinematic.storyboard.shot')} ${shot.id}`}</strong><small>{shot.title}</small></div>
                <span className="cinematic-storyboard-card__duration"><Clock3 aria-hidden="true" />{formatSeconds(shot.durationSeconds)}</span>
              </header>
              <dl><div><dt>{t('cinematic.storyboard.framing')}</dt><dd>{shot.framing}</dd></div><div><dt>{t('cinematic.storyboard.action')}</dt><dd>{shot.action}</dd></div></dl>
              {(shot.castNames?.length || shot.lookNames?.length) ? <div className="cinematic-storyboard-card__authority">
                {shot.castNames?.length ? <span>{shot.castNames.join(', ')}</span> : null}
                {shot.lookNames?.length ? <small>{shot.lookNames.join(', ')}</small> : null}
              </div> : null}
              <footer>
                <span className={`cinematic-status-pill is-${status}`}>{t(`cinematic.storyboard.status.${status}`)}</span>
                {!readOnly ? <div>
                  <button type="button" disabled={index === 0} aria-label={`${t('cinematic.storyboard.moveEarlier')} ${shot.id}`} onClick={() => onMoveShot(shot.id, 'earlier')}><ArrowLeft aria-hidden="true" /></button>
                  <button type="button" disabled={last} aria-label={`${t('cinematic.storyboard.moveLater')} ${shot.id}`} onClick={() => onMoveShot(shot.id, 'later')}><ArrowRight aria-hidden="true" /></button>
                </div> : null}
              </footer>
              {!readOnly && onEditShot ? <Button size="sm" icon={<Pencil />}
                aria-label={`${t('cinematic.storyboard.editShot')}: ${shot.title}`}
                onClick={() => onEditShot(shot.id)}>{t('cinematic.storyboard.editShot')}</Button> : null}
            </div>
          </article>
  );
}

function formatSeconds(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}s`;
}
