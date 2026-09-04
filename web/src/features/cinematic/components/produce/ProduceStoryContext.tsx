import { ArrowLeft, ArrowRight, AudioLines, Camera, Clapperboard, HeartPulse, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import type { CinematicProduceShotContext, CinematicScene, CinematicShot } from '../../schemas/cinematicSchemas';

export function ProduceStoryContext({
  scene,
  shot,
  previousShot,
  nextShot,
  context,
  characterNames,
  lookNames,
  motionDirection,
  motionDirectionSaved,
  motionDirectionSaving,
  motionDirectionError,
  onMotionDirectionChange,
  onMotionDirectionSave,
  onMotionDirectionReset
}: {
  scene: CinematicScene;
  shot: CinematicShot;
  previousShot?: CinematicShot | null;
  nextShot?: CinematicShot | null;
  context?: CinematicProduceShotContext;
  characterNames: string[];
  lookNames: string[];
  motionDirection: string;
  motionDirectionSaved: string;
  motionDirectionSaving: boolean;
  motionDirectionError?: string | null;
  onMotionDirectionChange: (value: string) => void;
  onMotionDirectionSave: () => void;
  onMotionDirectionReset: () => void;
}) {
  const { t } = useTranslation('cinematic');
  const packet = context?.videoPacket;
  const direction = context?.directingContract;
  const audioSummary = summarizeAudio(packet?.audio.dialogueCues || [], packet?.audio.audioCues || [], packet?.audio.intent || shot.audioIntent);
  return (
    <section className="cinematic-produce-context" aria-labelledby="cinematic-produce-context-title">
      <header>
        <span>{t('cinematic.produce.storyContextEyebrow')}</span>
        <h3 id="cinematic-produce-context-title">{scene.title} / {shot.title}</h3>
      </header>
      <div className="cinematic-produce-context__bridge">
        <StoryNeighbor icon={<ArrowLeft />} label={t('cinematic.produce.previousShot')} shot={previousShot} empty={t('cinematic.produce.sequenceStart')} />
        <div className="is-current"><span>{t('cinematic.produce.currentShot')}</span><strong>{shot.title}</strong><small>{direction?.visibleMoment || shot.visibleMoment || shot.purpose}</small></div>
        <StoryNeighbor icon={<ArrowRight />} label={t('cinematic.produce.nextShot')} shot={nextShot} empty={t('cinematic.produce.sequenceEnd')} />
      </div>
      <dl className="cinematic-produce-context__direction">
        <Direction icon={<Clapperboard />} label={t('cinematic.produce.primaryAction')} value={packet?.motion.primaryAction || direction?.subjectAction || shot.subjectAction || shot.blocking} />
        <Direction icon={<HeartPulse />} label={t('cinematic.produce.performanceTarget')} value={[packet?.performance.emotionalTarget || direction?.emotionalTarget, packet?.performance.observableCue || direction?.performanceCue].filter(Boolean).join(' / ')} />
        <Direction icon={<Camera />} label={t('cinematic.produce.cameraDirection')} value={[packet?.motion.cameraMovement || shot.cameraMovement, packet?.motion.screenDirection].filter(Boolean).join(' / ')} />
        <Direction icon={<AudioLines />} label={t('cinematic.produce.audioDirection')} value={audioSummary} />
        <Direction icon={<UsersRound />} label={t('cinematic.produce.characterAndLook')} value={[characterNames.join(', '), lookNames.join(', ')].filter(Boolean).join(' / ')} />
        <Direction icon={<ArrowRight />} label={t('cinematic.produce.transitionDirection')} value={packet?.continuity.transitionToNext || direction?.transitionToNext || shot.transitionToNext} />
      </dl>
      <section className="cinematic-produce-motion-direction">
        <div>
          <label htmlFor={`cinematic-produce-motion-${shot.id}`}>{t('cinematic.produce.additionalMotionDirection')}</label>
          <p>{t('cinematic.produce.additionalMotionDirectionHelp')}</p>
        </div>
        <textarea
          id={`cinematic-produce-motion-${shot.id}`}
          rows={3}
          value={motionDirection}
          maxLength={300}
          placeholder={t('cinematic.produce.additionalMotionDirectionPlaceholder')}
          onChange={event => onMotionDirectionChange(Array.from(event.target.value).slice(0, 300).join(''))}
        />
        <footer>
          <output htmlFor={`cinematic-produce-motion-${shot.id}`} aria-live="polite">
            {Array.from(motionDirection).length} / 300
          </output>
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={motionDirection === motionDirectionSaved || motionDirectionSaving}
              onClick={onMotionDirectionReset}
            >
              {t('cinematic.produce.resetMotionDirection')}
            </Button>
            <Button
              size="sm"
              disabled={motionDirection === motionDirectionSaved || motionDirectionSaving}
              onClick={onMotionDirectionSave}
            >
              {motionDirectionSaving ? t('cinematic.produce.savingMotionDirection') : t('cinematic.produce.saveMotionDirection')}
            </Button>
          </div>
        </footer>
        {motionDirectionError ? <p role="alert" className="cinematic-produce-motion-direction__error">{motionDirectionError}</p> : null}
      </section>
    </section>
  );
}

function StoryNeighbor({ icon, label, shot, empty }: { icon: ReactNode; label: string; shot?: CinematicShot | null; empty: string }) {
  return <div><span>{icon}{label}</span><strong>{shot?.title || empty}</strong><small>{shot?.subjectAction || shot?.visibleMoment || ''}</small></div>;
}

function Direction({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return <div><dt>{icon}<span>{label}</span></dt><dd>{value || '-'}</dd></div>;
}

function summarizeAudio(
  dialogue: Array<{ speaker: string; text: string }>,
  cues: Array<{ kind: string; description: string }>,
  intent: string
) {
  const parts = [
    intent,
    ...dialogue.slice(0, 2).map(cue => `${cue.speaker}: ${cue.text}`),
    ...cues.slice(0, 2).map(cue => `${cue.kind}: ${cue.description}`)
  ].filter(Boolean);
  return parts.join(' / ');
}
