import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

export function EngineTargetPanelFrame({
  title,
  description,
  badge,
  action,
  children,
  studioLayout = false,
  className,
  id = 'generation-engine'
}: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  studioLayout?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'engine-target-panel',
        studioLayout && 'engine-target-panel--studio',
        className
      )}
    >
      <div className="engine-target-panel__heading">
        <div className="engine-target-panel__title">
          {badge}
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
