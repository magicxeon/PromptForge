import { Search, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type AdminFilterBarProps = {
  search: string;
  searchLabel: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  clearLabel: string;
  children?: ReactNode;
};

export function AdminFilterBar({ search, searchLabel, searchPlaceholder, onSearchChange, onSubmit, onClear, clearLabel, children }: AdminFilterBarProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  return <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={submit}>
    <label className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 size-4 text-[var(--mpf-text-muted)]" aria-hidden="true" /><span className="sr-only">{searchLabel}</span><input className="h-10 w-full border border-[var(--mpf-border)] bg-[var(--mpf-surface)] pl-10 pr-3" value={search} onChange={event => onSearchChange(event.target.value)} placeholder={searchPlaceholder} /></label>
    {children}
    <button type="submit" className="h-10 border border-cyan-400 px-4 text-sm">{searchLabel}</button>
    <button type="button" title={clearLabel} aria-label={clearLabel} className="grid size-10 place-items-center border border-[var(--mpf-border)] text-[var(--mpf-text-muted)]" onClick={onClear}><X className="size-4" aria-hidden="true" /></button>
  </form>;
}
