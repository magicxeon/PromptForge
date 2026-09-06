import { Search, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils/cn';

export type DiscoveryOption = { label: string; value: string };

export function DiscoveryToolbar({
  searchValue,
  searchLabel,
  searchPlaceholder,
  clearLabel,
  onSearchChange,
  onSearchClear,
  onSearchSubmit,
  children,
  className
}: {
  searchValue: string;
  searchLabel: string;
  searchPlaceholder: string;
  clearLabel: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onSearchSubmit: () => void;
  children?: ReactNode;
  className?: string;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <section className={cn('discovery-toolbar', className)} aria-label={searchLabel}>
      <form className="discovery-toolbar__search" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="discovery-search">{searchLabel}</label>
        <Search aria-hidden="true" />
        <input
          id="discovery-search"
          type="search"
          value={searchValue}
          placeholder={searchPlaceholder}
          onChange={event => onSearchChange(event.target.value)}
        />
        {searchValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="discovery-toolbar__clear"
            title={clearLabel}
            aria-label={clearLabel}
            onClick={onSearchClear}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </form>
      {children ? <div className="discovery-toolbar__controls">{children}</div> : null}
    </section>
  );
}

export function DiscoverySegmentedControl({
  label,
  value,
  options,
  onChange,
  className
}: {
  label: string;
  value: string;
  options: DiscoveryOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('discovery-segmented-control', className)} role="group" aria-label={label}>
      {options.map(option => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function DiscoverySelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: DiscoveryOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="discovery-select">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
