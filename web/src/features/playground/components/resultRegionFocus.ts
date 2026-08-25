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
  let secondFrame: number | null = null;

  const firstFrame = scheduleFrame(() => {
    secondFrame = scheduleFrame(() => {
      region.focus({ preventScroll: true });
      region.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  return () => {
    cancelFrame(firstFrame);
    if (secondFrame !== null) cancelFrame(secondFrame);
  };
}
