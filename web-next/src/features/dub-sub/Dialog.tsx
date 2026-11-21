import { useLayoutEffect, useRef, type ReactNode } from "react";
export function Dialog({
  children,
  onClose,
  label,
  descriptionId,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  descriptionId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const trigger = document.activeElement;
    el?.showModal();
    return () => {
      el?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      aria-label={label}
      aria-describedby={descriptionId}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
