import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Presentation only: the owning panel keeps its state and callbacks. Without a
// workspace outlet, every existing caller renders these controls in place.
export const GenerationOutputTarget = createContext<HTMLElement | null>(null);

export function GenerationOutputControls({ children }: { children: ReactNode }) {
  const target = useContext(GenerationOutputTarget);
  return target ? createPortal(children, target) : children;
}
