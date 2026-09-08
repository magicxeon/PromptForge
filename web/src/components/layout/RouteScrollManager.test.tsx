import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RouteScrollManager } from './RouteScrollManager';
import { ContextBackLink } from './ContextBackLink';
import { createReturnNavigationState } from '../../lib/navigation/returnNavigation';

vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'alice' }));
let navigate: NavigateFunction;
let current: ReturnType<typeof useLocation>;
let y = 0;
let maxY = 4000;
let notifyResize: () => void;
const disconnect = vi.fn();
function Harness({ actorId = 'alice' }: { actorId?: string }) {
  navigate = useNavigate(); current = useLocation();
  return <><RouteScrollManager actorId={actorId} /><ContextBackLink fallbackTo="/gallery">Back</ContextBackLink></>;
}
function mount(actorId = 'alice') {
  return render(<MemoryRouter initialEntries={['/gallery?sort=latest']}><Harness actorId={actorId} /></MemoryRouter>);
}
function scroll(top: number) { y = top; fireEvent.scroll(window); }
beforeEach(() => {
  y = 0; maxY = 4000; disconnect.mockClear();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notifyResize = callback; }
    observe() {} disconnect = disconnect;
  });
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
  vi.spyOn(window, 'scrollX', 'get').mockReturnValue(0);
  vi.spyOn(window, 'scrollTo').mockImplementation((...args: unknown[]) => {
    const options = args[0] as ScrollToOptions | number;
    y = Math.min(maxY, typeof options === 'object' ? options.top || 0 : 0);
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('starts new paths and different post IDs at top but preserves query-only changes', () => {
  mount(); scroll(1200);
  act(() => navigate('?sort=likes'));
  expect(y).toBe(1200);
  act(() => navigate('/posts/one')); expect(y).toBe(0);
  scroll(600); act(() => navigate('/posts/two')); expect(y).toBe(0);
});

it('restores separate entries on browser Back and Forward', () => {
  mount(); scroll(1200);
  act(() => navigate('/posts/one')); scroll(400);
  act(() => navigate(-1)); expect(y).toBe(1200);
  act(() => navigate(1)); expect(y).toBe(400);
});

it('ContextBackLink restores the captured source entry and filters', () => {
  mount(); scroll(1600);
  const state = createReturnNavigationState(current);
  act(() => navigate('/posts/one', { state }));
  expect(y).toBe(0);
  fireEvent.click(screen.getByText('Back'));
  expect(current.pathname + current.search).toBe('/gallery?sort=latest');
  expect(y).toBe(1600);
});

it('rejects unsafe or cross-actor return destinations and offsets', () => {
  mount(); scroll(900);
  const key = current.key;
  act(() => navigate('/posts/one', { state: { mpfReturn: { to: '//outside.example', actorId: 'alice', entryKey: key } } }));
  expect(screen.getByText('Back')).toHaveAttribute('href', '/gallery');
  act(() => navigate('/posts/two', { state: { mpfReturn: { to: '/private', actorId: 'bob', entryKey: key } } }));
  expect(screen.getByText('Back')).toHaveAttribute('href', '/gallery');
  act(() => navigate('/gallery?sort=latest', { state: { mpfScrollRestore: { actorId: 'bob', entryKey: key } } }));
  expect(y).toBe(0);
});

it('waits for delayed page height before restoring and disconnects afterwards', () => {
  vi.useFakeTimers(); mount(); scroll(1800);
  act(() => navigate('/posts/one')); maxY = 200;
  act(() => navigate(-1)); expect(y).toBe(200);
  maxY = 4000;
  act(() => { notifyResize(); vi.advanceTimersByTime(50); });
  expect(y).toBe(1800); expect(disconnect).toHaveBeenCalled();
});

it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])('stops delayed restoration after %s intent', event => {
  vi.useFakeTimers(); mount(); scroll(1800);
  act(() => navigate('/posts/one')); maxY = 200;
  act(() => navigate(-1));
  fireEvent(window, event === 'keydown' ? new KeyboardEvent(event, { key: 'PageDown' }) : new Event(event));
  scroll(120); maxY = 4000;
  act(() => { notifyResize(); vi.advanceTimersByTime(6000); });
  expect(y).toBe(120);
});

it('waits for an asynchronous hash target and safely ignores malformed hashes', () => {
  vi.useFakeTimers(); mount();
  act(() => navigate('/posts/one#details'));
  const target = document.createElement('div'); target.id = 'details';
  target.scrollIntoView = vi.fn(); document.body.append(target);
  act(() => { notifyResize(); vi.advanceTimersByTime(50); });
  expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  target.remove();
  act(() => navigate('/posts/two#%invalid')); expect(y).toBe(0);
});

it('clears offsets on actor change and restores native history policy on unmount', () => {
  window.history.scrollRestoration = 'auto';
  const view = mount(); scroll(1200);
  act(() => navigate('/posts/one'));
  view.rerender(<MemoryRouter initialEntries={['/gallery?sort=latest']}><Harness actorId="bob" /></MemoryRouter>);
  act(() => navigate(-1)); expect(y).toBe(0);
  view.unmount(); expect(window.history.scrollRestoration).toBe('auto');
});

it('bounds restoration retries to five seconds', () => {
  vi.useFakeTimers(); mount(); scroll(1800);
  act(() => navigate('/posts/one')); maxY = 200;
  act(() => navigate(-1));
  act(() => vi.advanceTimersByTime(5001));
  maxY = 4000;
  act(() => { notifyResize(); vi.advanceTimersByTime(50); });
  expect(y).toBe(200);
});
