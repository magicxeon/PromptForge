import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

export type DiscoveryMetric = {
  id: string;
  icon: ReactNode;
  label: string;
  value?: ReactNode | null;
};

export function DiscoveryMetricRow({
  metrics,
  className
}: {
  metrics: DiscoveryMetric[];
  className?: string;
}) {
  const visibleMetrics = metrics.filter(metric => (
    metric.value !== null && metric.value !== undefined && metric.value !== ''
  ));
  if (!visibleMetrics.length) return null;

  return (
    <dl className={cn('discovery-metric-row', className)}>
      {visibleMetrics.map(metric => (
        <div key={metric.id} title={`${metric.label}: ${String(metric.value)}`}>
          <dt>{metric.icon}<span className="sr-only">{metric.label}</span></dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
