import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export type DiscoveryHeroAction = {
  label: string;
  to: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function DiscoveryPageHero({
  eyebrow,
  title,
  description,
  media,
  mediaLabel,
  actions = [],
  className
}: {
  eyebrow: string;
  title: string;
  description: string;
  media?: ReactNode;
  mediaLabel?: string;
  actions?: DiscoveryHeroAction[];
  className?: string;
}) {
  return (
    <section className={cn('discovery-page-hero', className)} aria-labelledby="discovery-page-title">
      <div className="discovery-page-hero__media" aria-label={mediaLabel}>
        {media || <div className="discovery-page-hero__media-fallback" />}
      </div>
      <div className="discovery-page-hero__scrim" aria-hidden="true" />
      <div className="discovery-page-hero__copy">
        <span className="discovery-page-hero__eyebrow">{eyebrow}</span>
        <h1 id="discovery-page-title">{title}</h1>
        <p>{description}</p>
        {actions.length ? (
          <div className="discovery-page-hero__actions">
            {actions.map(action => (
              <Link
                key={`${action.to}-${action.label}`}
                to={action.to}
                className={cn(
                  'discovery-page-hero__action',
                  `discovery-page-hero__action--${action.variant || 'secondary'}`
                )}
              >
                {action.icon}
                <span>{action.label}</span>
                {!action.icon ? <ArrowRight aria-hidden="true" /> : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
