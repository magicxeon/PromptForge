import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, ArrowLeft, ArrowRight, Film, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VideoMediaPlayer } from '../../../../components/media/VideoMediaPlayer';
import { Button } from '../../../../components/ui/Button';
import type { ProduceSceneQueue } from './produceReadModel';

export function ProduceRoughSequence({
  open,
  onOpenChange,
  scenes,
  selectedShotId,
  onSelectShot
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenes: ProduceSceneQueue[];
  selectedShotId: string;
  onSelectShot: (sceneId: string, shotId: string) => void;
}) {
  const { t } = useTranslation('cinematic');
  const shots = useMemo(() => scenes.flatMap(scene => scene.shots), [scenes]);
  const [index, setIndex] = useState(0);
  const shot = shots[index];
  const selectedIndex = useMemo(() => {
    const nextIndex = shots.findIndex(item => item.id === selectedShotId);
    return nextIndex >= 0 ? nextIndex : 0;
  }, [selectedShotId, shots]);
  useEffect(() => { if (open) setIndex(selectedIndex); }, [open, selectedIndex]);
  if (!shot) return null;
  const currentShotLabel = `${t('cinematic.storyboard.shot')} ${index + 1}`;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-produce-sequence-dialog">
          <header className="cinematic-dialog__header">
            <div><Dialog.Title>{t('cinematic.produce.reviewSequence')}</Dialog.Title><Dialog.Description>{t('cinematic.produce.reviewSequenceDescription')}</Dialog.Description></div>
            <Dialog.Close asChild><Button size="icon" variant="ghost" title={t('cinematic.actions.close')} icon={<X aria-hidden="true" />} /></Dialog.Close>
          </header>
          <div className="cinematic-produce-sequence-dialog__stage">
            {shot.approvedVideoAsset ? <VideoMediaPlayer videoUrl={shot.approvedVideoAsset.publicUrl} posterUrl={shot.approvedVideoAsset.posterUrl} title={shot.title} /> : <div className="cinematic-produce-sequence-dialog__gap"><AlertTriangle aria-hidden="true" /><strong>{t('cinematic.produce.sequenceGap', { shot: index + 1 })}</strong><p>{t('cinematic.produce.sequenceGapDescription')}</p><Button variant="primary" onClick={() => { onSelectShot(shot.sceneId, shot.id); onOpenChange(false); }}>{t('cinematic.produce.openShot')}</Button></div>}
          </div>
          <div className="cinematic-produce-sequence-dialog__timeline" aria-label={t('cinematic.produce.storyOrder')}>
            {shots.map((item, shotIndex) => {
              const itemLabel = `${t('cinematic.storyboard.shot')} ${shotIndex + 1}`;
              return <button key={item.id} type="button" className={`${shotIndex === index ? 'is-current' : ''}${item.approvedVideoAsset ? ' is-ready' : ' is-gap'}`} aria-label={`${itemLabel}: ${item.title}`} onClick={() => setIndex(shotIndex)}><span>{itemLabel}</span><small>{item.title}</small></button>;
            })}
          </div>
          <footer className="cinematic-dialog__footer cinematic-produce-sequence-dialog__footer">
            <span><Film aria-hidden="true" />{currentShotLabel} / {shots.length}</span>
            <div><Dialog.Close asChild><Button variant="secondary">{t('cinematic.actions.close')}</Button></Dialog.Close><Button size="icon" variant="secondary" title={t('cinematic.produce.previousShot')} disabled={index === 0} icon={<ArrowLeft aria-hidden="true" />} onClick={() => setIndex(value => Math.max(0, value - 1))} /><Button size="icon" variant="secondary" title={t('cinematic.produce.nextShot')} disabled={index === shots.length - 1} icon={<ArrowRight aria-hidden="true" />} onClick={() => setIndex(value => Math.min(shots.length - 1, value + 1))} /></div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
