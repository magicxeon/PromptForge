import { describe, expect, it, vi } from 'vitest';
import { focusResultRegionAfterLayout } from './resultRegionFocus';

describe('focusResultRegionAfterLayout', () => {
  it('waits for the submitted layout before focusing and scrolling the result', () => {
    const frames: FrameRequestCallback[] = [];
    const region = document.createElement('section');
    const focus = vi.spyOn(region, 'focus');
    const scrollIntoView = vi.fn();
    region.scrollIntoView = scrollIntoView;

    focusResultRegionAfterLayout(region, {
      scheduleFrame: callback => {
        frames.push(callback);
        return frames.length;
      },
      cancelFrame: vi.fn()
    });

    expect(focus).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();

    frames.shift()?.(0);
    expect(focus).not.toHaveBeenCalled();

    frames.shift()?.(0);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
