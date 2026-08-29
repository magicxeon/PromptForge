import { Check, ChevronDown, Circle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils/cn';
import { cinematicStages, type CinematicStage } from '../cinematicStages';

export function CinematicStageRail({
  activeStage,
  onStageChange
}: {
  activeStage: CinematicStage;
  onStageChange?: (stage: CinematicStage) => void;
}) {
  const { t } = useTranslation('cinematic');
  const activeIndex = cinematicStages.indexOf(activeStage);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav aria-label={t('cinematic.stages.label')} className={`cinematic-stage-navigation${mobileOpen ? ' is-mobile-open' : ''}`}>
      <button
        type="button"
        className="cinematic-stage-navigation__mobile-trigger"
        aria-expanded={mobileOpen}
        aria-controls="cinematic-stage-list"
        onClick={() => setMobileOpen(open => !open)}
      >
        <span>{t('cinematic.stages.mobileSummary', { current: activeIndex + 1, total: cinematicStages.length, stage: t(`cinematic.stages.${activeStage}`) })}</span>
        <span>{t('cinematic.stages.viewStages')} <ChevronDown aria-hidden="true" /></span>
      </button>
      <ol id="cinematic-stage-list" className="cinematic-stage-navigation__list">
        {cinematicStages.map((stage, index) => {
          const complete = index < activeIndex;
          const active = stage === activeStage;
          return (
            <li
              key={stage}
              className={cn('cinematic-stage-navigation__item', active && 'is-active')}
            >
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                className={cn('cinematic-stage-navigation__stage', active && 'is-active')}
                onClick={() => { onStageChange?.(stage); setMobileOpen(false); }}
                disabled={!onStageChange}
              >
                {complete
                  ? <Check className="size-4 shrink-0 text-[var(--theme-success)]" aria-hidden="true" />
                  : <Circle className="size-4 shrink-0" aria-hidden="true" />}
                <span>{index + 1}. {t(`cinematic.stages.${stage}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
