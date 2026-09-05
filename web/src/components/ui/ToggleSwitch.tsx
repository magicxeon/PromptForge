import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type ToggleSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role'> & {
  checked: boolean;
  label: string;
};

export function ToggleSwitch({ checked, label, className, ...props }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border border-[var(--mpf-border-strong)] transition-colors duration-150',
        checked ? 'bg-emerald-500/35' : 'bg-rose-500/20',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300',
        'disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-[2px] top-[2px] size-[18px] rounded-full bg-[var(--mpf-text)] shadow-sm transition-transform duration-150',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}
