import { Surface } from '../../../components/ui/Surface';

type DailyBucket = {
  date: string;
  success: number;
  failed: number;
  active: number;
  other: number;
  total: number;
};

type AdminDailyJobChartProps = {
  title: string;
  description: string;
  daily: DailyBucket[];
  successLabel: string;
  failedLabel: string;
  activeLabel: string;
  otherLabel: string;
};

export function AdminDailyJobChart({ title, description, daily, successLabel, failedLabel, activeLabel, otherLabel }: AdminDailyJobChartProps) {
  const peak = Math.max(1, ...daily.map(bucket => bucket.total));
  return <Surface className="overflow-hidden">
    <header className="border-b border-[var(--mpf-border)] p-4">
      <strong>{title}</strong>
      <p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{description}</p>
    </header>
    <div className="overflow-x-auto p-4">
      <div className="grid min-w-[620px] gap-2" style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(36px, 1fr))` }}>
        {daily.map(bucket => <div key={bucket.date} className="grid min-w-0 grid-rows-[160px_auto] gap-2" title={`${bucket.date}: ${bucket.total}`}>
          <div className="flex h-40 flex-col justify-end overflow-hidden border border-[var(--mpf-border)] bg-black/20" aria-label={`${bucket.date}: ${bucket.total}`}>
            <span className="bg-emerald-400/80" style={{ height: `${(bucket.success / peak) * 100}%` }} />
            <span className="bg-rose-400/80" style={{ height: `${(bucket.failed / peak) * 100}%` }} />
            <span className="bg-amber-300/80" style={{ height: `${(bucket.active / peak) * 100}%` }} />
            <span className="bg-slate-400/70" style={{ height: `${(bucket.other / peak) * 100}%` }} />
          </div>
          <small className="truncate text-center text-[var(--mpf-text-muted)]">{bucket.date.slice(5)}</small>
        </div>)}
      </div>
    </div>
    <footer className="flex flex-wrap gap-4 border-t border-[var(--mpf-border)] p-4 text-xs">
      <Legend color="bg-emerald-400" label={successLabel} />
      <Legend color="bg-rose-400" label={failedLabel} />
      <Legend color="bg-amber-300" label={activeLabel} />
      <Legend color="bg-slate-400" label={otherLabel} />
    </footer>
  </Surface>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`size-2 ${color}`} aria-hidden="true" />{label}</span>;
}
