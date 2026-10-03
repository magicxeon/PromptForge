import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusResultRegionAfterLayout } from './resultRegionFocus';

afterEach(() => {
  document.querySelectorAll('[data-result-focus-test]').forEach(element => element.remove());
  vi.unstubAllGlobals();
});

function focusFixture() {
  const frames: FrameRequestCallback[] = [];
  const region = document.createElement('section');
  region.dataset.resultFocusTest = 'true';
  region.tabIndex = -1;
  document.body.append(region);
  const focus = vi.spyOn(region, 'focus');
  const scrollIntoView = vi.fn();
  region.scrollIntoView = scrollIntoView;
  const cancelFrame = vi.fn();
  const scheduleFrame = (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; };
  return { region, focus, scrollIntoView, frames, cancelFrame, scheduleFrame,
    flush: () => { frames.shift()?.(0); frames.shift()?.(0); } };
}

describe('focusResultRegionAfterLayout', () => {
  it('waits for the submitted layout before focusing and scrolling the result', () => {
    const frames: FrameRequestCallback[] = [];
    const region = document.createElement('section');
    region.dataset.resultFocusTest = 'true';
    document.body.append(region);
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

  it('respects reduced motion when explicitly revealing a region', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const fixture = focusFixture();
    focusResultRegionAfterLayout(fixture.region, fixture);
    fixture.flush();
    expect(fixture.region).toHaveFocus();
    expect(fixture.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('does not steal focus after a different control receives focus', () => {
    const fixture = focusFixture();
    const prompt = document.createElement('textarea');
    fixture.region.append(prompt);
    focusResultRegionAfterLayout(fixture.region, fixture);
    prompt.focus();
    fixture.flush();
    expect(prompt).toHaveFocus();
    expect(fixture.focus).not.toHaveBeenCalled();
    expect(fixture.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each(['input', 'keydown', 'pointerdown', 'wheel', 'touchstart'])('does not navigate after intervening %s activity', event => {
    const fixture = focusFixture();
    const prompt = document.createElement('textarea');
    fixture.region.append(prompt);
    prompt.focus();
    focusResultRegionAfterLayout(fixture.region, fixture);
    prompt.dispatchEvent(new Event(event, { bubbles: true }));
    fixture.flush();
    expect(prompt).toHaveFocus();
    expect(fixture.focus).not.toHaveBeenCalled();
    expect(fixture.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([false, true])('cancels navigation before or after the first layout frame (%s)', firstFrameRan => {
    const fixture = focusFixture();
    const cancel = focusResultRegionAfterLayout(fixture.region, fixture);
    if (firstFrameRan) fixture.frames.shift()?.(0);
    cancel();
    fixture.flush();
    expect(fixture.cancelFrame).toHaveBeenCalledTimes(firstFrameRan ? 2 : 1);
    expect(fixture.focus).not.toHaveBeenCalled();
    expect(fixture.scrollIntoView).not.toHaveBeenCalled();
  });

  it('ignores a region that unmounted before the layout settled', () => {
    const fixture = focusFixture();
    focusResultRegionAfterLayout(fixture.region, fixture);
    fixture.region.remove();
    fixture.flush();
    expect(fixture.focus).not.toHaveBeenCalled();
    expect(fixture.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does nothing when the target region is unavailable', () => {
    const fixture = focusFixture();
    focusResultRegionAfterLayout(null, fixture)();
    expect(fixture.frames).toHaveLength(0);
    expect(fixture.cancelFrame).not.toHaveBeenCalled();
  });
});
