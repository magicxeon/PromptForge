type AdminStatusBadgeProps = {
  status: string;
};

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const tone = status === 'ready' || status === 'completed' || status === 'active'
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
    : status === 'unavailable' || status === 'failed' || status === 'reconciliation_required'
      ? 'border-rose-400/40 bg-rose-400/10 text-rose-200'
      : 'border-amber-300/40 bg-amber-300/10 text-amber-100';
  return <span className={`inline-flex min-h-7 items-center border px-2 text-xs ${tone}`}>{status.replaceAll('_', ' ')}</span>;
}
