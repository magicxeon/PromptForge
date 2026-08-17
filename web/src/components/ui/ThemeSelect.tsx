import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

const EMPTY_VALUE = '__mpf_empty__';

export type ThemeSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ThemeSelectProps = {
  value: string;
  options: ThemeSelectOption[];
  onValueChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ThemeSelect({
  value,
  options,
  onValueChange,
  ariaLabel,
  placeholder,
  disabled = false,
  className
}: ThemeSelectProps) {
  const normalizedValue = value || EMPTY_VALUE;
  return (
    <Select.Root
      value={normalizedValue}
      onValueChange={next => onValueChange(next === EMPTY_VALUE ? '' : next)}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] bg-[var(--theme-background)] px-3 text-left text-xs text-[var(--mpf-text)] outline-none transition hover:border-[var(--theme-primary)] focus-visible:ring-2 focus-visible:ring-[var(--mpf-focus)] disabled:cursor-not-allowed disabled:opacity-45',
          className
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild><ChevronDown className="size-4 shrink-0 text-[var(--mpf-text-muted)]" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="z-[120] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] bg-[var(--theme-surface)] text-[var(--mpf-text)] shadow-[0_18px_45px_var(--theme-shadow)]"
        >
          <Select.ScrollUpButton className="grid h-7 place-items-center bg-[var(--theme-surface)] text-[var(--mpf-text-muted)]">
            <ChevronUp className="size-4" />
          </Select.ScrollUpButton>
          <Select.Viewport className="max-h-72 overflow-y-auto p-1">
            {options.map(option => (
              <Select.Item
                key={option.value || EMPTY_VALUE}
                value={option.value || EMPTY_VALUE}
                disabled={option.disabled}
                className="relative flex min-h-9 select-none items-center rounded-[var(--mpf-radius-sm)] py-2 pl-8 pr-3 text-xs outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-[var(--theme-hover)] data-[highlighted]:text-[var(--mpf-text)]"
              >
                <Select.ItemIndicator className="absolute left-2 grid size-4 place-items-center text-[var(--theme-primary)]">
                  <Check className="size-3.5" />
                </Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="grid h-7 place-items-center bg-[var(--theme-surface)] text-[var(--mpf-text-muted)]">
            <ChevronDown className="size-4" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
