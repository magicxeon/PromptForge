import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils/cn';

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--mpf-radius-sm)] border px-4 py-2 text-[0.75rem] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'border-transparent [background:var(--theme-primary-gradient)] text-[var(--theme-on-primary)] shadow-[0_8px_22px_var(--theme-shadow)] hover:brightness-110',
        secondary: 'border-[var(--mpf-border-strong)] bg-[var(--mpf-surface)] text-[var(--mpf-text)] hover:border-[var(--theme-primary)]',
        ghost: 'border-transparent bg-transparent text-[var(--mpf-text-muted)] hover:bg-[var(--theme-hover)] hover:text-[var(--mpf-text)]',
        danger: 'border-[var(--theme-danger)] bg-transparent text-[var(--theme-danger)] hover:bg-[var(--theme-hover)]'
      },
      size: {
        sm: 'min-h-9 px-3 text-xs',
        md: 'min-h-10 px-4',
        lg: 'min-h-12 px-5',
        icon: 'size-10 min-h-10 px-0'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md'
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
  & VariantProps<typeof buttonVariants>
  & {
    icon?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, icon, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});
