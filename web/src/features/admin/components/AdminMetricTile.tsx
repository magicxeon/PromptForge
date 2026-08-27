import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Surface } from '../../../components/ui/Surface';
import { AdminStatusBadge } from './AdminStatusBadge';

type AdminMetricTileProps = {
  icon: ReactNode;
  label: string;
  value: number | null;
  detail?: string;
  status?: string;
  href?: string;
};

export function AdminMetricTile({ icon, label, value, detail, status, href }: AdminMetricTileProps) {
  const content = <Surface className="h-full p-4 transition-colors hover:border-cyan-400/50">
    <div className="flex items-start justify-between gap-3">
      <span className="text-cyan-300">{icon}</span>
      {status ? <AdminStatusBadge status={status} /> : null}
    </div>
    <strong className="mt-5 block text-3xl">{value ?? '\u2014'}</strong>
    <span className="text-sm">{label}</span>
    {detail ? <small className="mt-2 block text-[var(--mpf-text-muted)]">{detail}</small> : null}
  </Surface>;
  return href ? <Link className="block min-w-0 no-underline" to={href}>{content}</Link> : content;
}
