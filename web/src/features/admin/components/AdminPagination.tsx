type AdminPaginationProps = {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  label?: string;
  previousLabel: string;
  nextLabel: string;
};

export function AdminPagination({ canPrevious, canNext, onPrevious, onNext, label, previousLabel, nextLabel }: AdminPaginationProps) {
  return <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
    <button type="button" className="h-10 border border-[var(--mpf-border)] px-4 text-sm disabled:opacity-40" disabled={!canPrevious} onClick={onPrevious}>{previousLabel}</button>
    {label ? <small className="text-[var(--mpf-text-muted)]">{label}</small> : <span />}
    <button type="button" className="h-10 border border-[var(--mpf-border)] px-4 text-sm disabled:opacity-40" disabled={!canNext} onClick={onNext}>{nextLabel}</button>
  </nav>;
}
