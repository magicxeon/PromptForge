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
  const backdropPressed = useRef(false);
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
      onPointerDown={(event) => {
        backdropPressed.current = event.isPrimary && event.button === 0 && isBackdrop(event);
      }}
      onPointerCancel={() => {
        backdropPressed.current = false;
      }}
      onClick={(event) => {
        const dismiss = backdropPressed.current && isBackdrop(event);
        backdropPressed.current = false;
        if (dismiss) {
          event.stopPropagation();
          onClose();
        }
      }}
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

function isBackdrop(event: {
  target: EventTarget;
  currentTarget: HTMLDialogElement;
  clientX: number;
  clientY: number;
}) {
  if (event.target !== event.currentTarget) return false;
  const {left, right, top, bottom} = event.currentTarget.getBoundingClientRect();
  return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
}
