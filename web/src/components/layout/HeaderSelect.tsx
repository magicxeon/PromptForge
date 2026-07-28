import type { ChangeEvent } from 'react';
import { cn } from '../../lib/utils/cn';

export type HeaderSelectOption = {
  value: string;
  label: string;
};

type HeaderSelectProps = {
  id: string;
  label: string;
  value: string;
  options: HeaderSelectOption[];
  className?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
};

export function HeaderSelect({
  id,
  label,
  value,
  options,
  className,
  disabled = false,
  onValueChange
}: HeaderSelectProps) {
  function changeValue(event: ChangeEvent<HTMLSelectElement>) {
    onValueChange(event.target.value);
  }

  return (
    <>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={changeValue}
        className={cn('global-header-select', className)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
