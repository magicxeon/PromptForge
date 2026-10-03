type AnimationFrameScheduler = (callback: FrameRequestCallback) => number;
type AnimationFrameCanceller = (handle: number) => void;

type ResultRegionFocusOptions = {
  scheduleFrame?: AnimationFrameScheduler;
  cancelFrame?: AnimationFrameCanceller;
};

export function focusResultRegionAfterLayout(
  region: HTMLElement | null,
  options: ResultRegionFocusOptions = {}
) {
  if (!region) return () => {};

  const scheduleFrame = options.scheduleFrame ?? window.requestAnimationFrame.bind(window);
  const cancelFrame = options.cancelFrame ?? window.cancelAnimationFrame.bind(window);
  const document = region.ownerDocument;
  const initialFocus = document.activeElement;
  let interrupted = false;
  let cancelled = false;
  let secondFrame: number | null = null;
  const interrupt = () => { interrupted = true; };
  const interactionEvents = ['input', 'keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
  const removeListeners = () => {
    for (const event of interactionEvents) document.removeEventListener(event, interrupt, true);
  };
  for (const event of interactionEvents) document.addEventListener(event, interrupt, { capture: true, passive: true });

  const firstFrame = scheduleFrame(() => {
    if (cancelled) return;
    secondFrame = scheduleFrame(() => {
      removeListeners();
      if (cancelled || interrupted || !region.isConnected || document.activeElement !== initialFocus) return;
      region.focus({ preventScroll: true });
      region.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });

  return () => {
    cancelled = true;
    removeListeners();
    cancelFrame(firstFrame);
    if (secondFrame !== null) cancelFrame(secondFrame);
  };
}
