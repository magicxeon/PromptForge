import { Columns2, Image as ImageIcon, Maximize2, Play } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GenerationStageState } from '../../../../components/generation/GenerationStageState';
import { GenerationVideoViewer, type GenerationVideoViewerItem } from '../../../../components/media/GenerationVideoViewer';
import { VideoMediaPlayer } from '../../../../components/media/VideoMediaPlayer';
import { Button } from '../../../../components/ui/Button';

type ReviewMode = 'video' | 'keyframe' | 'compare';

export function ProduceMediaReview({
  title,
  aspectRatio,
  sourceImageUrl,
  video,
  loading,
  statusDescription
}: {
  title: string;
  aspectRatio: string;
  sourceImageUrl?: string | null;
  video?: GenerationVideoViewerItem | null;
  loading: boolean;
  statusDescription?: string | null;
}) {
  const { t } = useTranslation('cinematic');
  const [mode, setMode] = useState<ReviewMode>(video ? 'video' : 'keyframe');
  const [viewerOpen, setViewerOpen] = useState(false);
  const ratio = useMemo(() => aspectRatio.replace(':', ' / '), [aspectRatio]);

  useEffect(() => {
    setMode(video ? 'video' : 'keyframe');
  }, [video?.id]);

  return (
    <section className="cinematic-produce-media" aria-labelledby="cinematic-produce-media-title">
      <header>
        <div>
          <span>{t('cinematic.produce.mediaEyebrow')}</span>
          <h3 id="cinematic-produce-media-title">{title}</h3>
        </div>
        {video ? <div className="cinematic-produce-media__modes" aria-label={t('cinematic.produce.comparisonMode')}>
          <Button size="sm" variant={mode === 'video' ? 'primary' : 'ghost'} icon={<Play aria-hidden="true" />} aria-pressed={mode === 'video'} onClick={() => setMode('video')}>{t('cinematic.produce.videoAttempt')}</Button>
          <Button size="sm" variant={mode === 'keyframe' ? 'primary' : 'ghost'} icon={<ImageIcon aria-hidden="true" />} aria-pressed={mode === 'keyframe'} onClick={() => setMode('keyframe')}>{t('cinematic.produce.approvedKeyframe')}</Button>
          {sourceImageUrl ? <Button size="sm" variant={mode === 'compare' ? 'primary' : 'ghost'} icon={<Columns2 aria-hidden="true" />} aria-pressed={mode === 'compare'} onClick={() => setMode('compare')}>{t('cinematic.produce.compare')}</Button> : null}
          <Button size="icon" variant="ghost" title={t('cinematic.produce.openVideo')} icon={<Maximize2 aria-hidden="true" />} onClick={() => setViewerOpen(true)} />
        </div> : null}
      </header>
      <div className={`cinematic-produce-media__stage${mode === 'compare' ? ' is-compare' : ''}`} style={{ '--cinematic-media-ratio': ratio } as CSSProperties}>
        {loading ? (
          <GenerationStageState loading title={t('cinematic.produce.generating')} description={statusDescription || t('cinematic.produce.queued')} />
        ) : mode === 'compare' && video && sourceImageUrl ? (
          <>
            <MediaCell label={t('cinematic.produce.videoAttempt')}><VideoMediaPlayer videoUrl={video.videoUrl} posterUrl={video.posterUrl} title={title} /></MediaCell>
            <MediaCell label={t('cinematic.produce.approvedKeyframe')}><img src={sourceImageUrl} alt={t('cinematic.produce.approvedKeyframe')} /></MediaCell>
          </>
        ) : mode === 'video' && video ? (
          <VideoMediaPlayer videoUrl={video.videoUrl} posterUrl={video.posterUrl} title={title} />
        ) : sourceImageUrl ? (
          <img src={sourceImageUrl} alt={t('cinematic.produce.approvedKeyframe')} />
        ) : (
          <GenerationStageState title={t('cinematic.results.videoEmpty')} description={t('cinematic.produce.sourceRequired')} />
        )}
      </div>
      {video ? <GenerationVideoViewer items={[video]} activeId={video.id} open={viewerOpen} onOpenChange={setViewerOpen} onActiveIdChange={() => undefined} /> : null}
    </section>
  );
}

function MediaCell({ label, children }: { label: string; children: ReactNode }) {
  return <div className="cinematic-produce-media__cell"><span>{label}</span>{children}</div>;
}
