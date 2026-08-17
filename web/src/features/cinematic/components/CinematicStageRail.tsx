import { Check, Circle } from 'lucide-react';
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

  return (
    <nav aria-label={t('cinematic.stages.label')} className="border-b border-[var(--theme-border)] pb-3">
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 xl:grid-cols-6">
        {cinematicStages.map((stage, index) => {
          const complete = index < activeIndex;
          const active = stage === activeStage;
          return (
            <li
              key={stage}
              className={cn(
                'min-w-0 border-b-2',
                active && 'border-[var(--theme-primary)] text-[var(--theme-text)]',
                !active && 'border-transparent'
              )}
            >
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-12 w-full items-center gap-2 bg-transparent px-2 py-2 text-left text-xs text-[var(--theme-text-muted)]',
                  active && 'text-[var(--theme-text)]',
                  onStageChange && 'cursor-pointer hover:text-[var(--theme-text)]'
                )}
                onClick={() => onStageChange?.(stage)}
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
