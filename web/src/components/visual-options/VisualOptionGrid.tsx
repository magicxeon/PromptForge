import type { ReactNode } from 'react';

export type VisualOptionGridVariant = 'compact' | 'large' | 'swatch';

export function VisualOptionGrid({
  variant,
  children,
  className = ''
}: {
  variant: VisualOptionGridVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'visual-option-grid',
        `visual-option-grid--${variant}`,
        className
      ].filter(Boolean).join(' ')}
      role="listbox"
    >
      {children}
    </div>
  );
}
