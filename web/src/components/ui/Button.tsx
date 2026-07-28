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
        primary: 'border-transparent bg-gradient-to-r from-cyan-500 to-pink-500 text-white hover:brightness-110',
        secondary: 'border-[var(--mpf-border-strong)] bg-[var(--mpf-surface)] text-[var(--mpf-text)] hover:border-cyan-400/70',
        ghost: 'border-transparent bg-transparent text-[var(--mpf-text-muted)] hover:bg-white/5 hover:text-white',
        danger: 'border-red-400/50 bg-red-500/10 text-red-200 hover:bg-red-500/20'
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
