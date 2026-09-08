import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import type { ReturnNavigationState } from '../../lib/navigation/returnNavigation';

type Position = { url: string; x: number; y: number };
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/** Owns document scrolling only; nested workspaces retain their own controls. */
export function RouteScrollManager({ actorId }: { actorId: string }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const entries = useRef(new Map<string, Position>());
  const previous = useRef<{ actorId: string; pathname: string } | null>(null);

  useLayoutEffect(() => {
    const original = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = original; };
  }, []);

  useLayoutEffect(() => {
    const actorChanged = previous.current?.actorId !== actorId;
    const samePage = !actorChanged && previous.current?.pathname === location.pathname;
    if (actorChanged) entries.current.clear();
    previous.current = { actorId, pathname: location.pathname };
    const url = `${location.pathname}${location.search}${location.hash}`;
    const state = location.state as ReturnNavigationState | null;
    const returnKey = state?.mpfScrollRestore?.actorId === actorId
      ? state.mpfScrollRestore.entryKey : undefined;
    const candidate = navigationType === 'POP'
      ? entries.current.get(location.key)
      : returnKey ? entries.current.get(returnKey) : undefined;
    const saved = candidate?.url === url ? candidate : undefined;
    let anchor = '';
    try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { /* Ignore malformed anchors. */ }
    let restoring = true;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resize: ResizeObserver | undefined;
    let mutation: MutationObserver | undefined;

    function remember() {
      if (restoring) return;
      const x = Math.max(0, window.scrollX);
      const y = Math.max(0, window.scrollY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      entries.current.delete(location.key);
      entries.current.set(location.key, { url, x, y });
      if (entries.current.size > 100) entries.current.delete(entries.current.keys().next().value!);
    }
    function stop() {
      restoring = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(timer);
      resize?.disconnect();
      mutation?.disconnect();
      remember();
    }
    function attempt() {
      frame = 0;
      if (!restoring) return;
      if (saved) {
        window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
        if (Math.abs(window.scrollY - saved.y) < 2 && Math.abs(window.scrollX - saved.x) < 2) stop();
      } else if (anchor) {
        const target = document.getElementById(anchor);
        if (target) { target.scrollIntoView({ block: 'start', behavior: 'instant' }); stop(); }
      } else {
        if (!samePage || navigationType === 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        stop();
      }
    }
    function schedule() {
      if (restoring && !frame) frame = requestAnimationFrame(attempt);
    }
    function interrupt(event: Event) {
      if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
      stop();
    }
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('pointerdown', interrupt, { passive: true });
    window.addEventListener('keydown', interrupt);
    attempt();
    if (restoring) {
      resize = new ResizeObserver(schedule);
      resize.observe(document.body);
      mutation = new MutationObserver(schedule);
      mutation.observe(document.body, { subtree: true, childList: true, attributes: true });
      timer = setTimeout(stop, 5000);
    }
    return () => {
      // Do not sample the new Outlet's (possibly shorter) document during cleanup.
      restoring = false;
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(timer);
      resize?.disconnect();
      mutation?.disconnect();
      window.removeEventListener('scroll', remember);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('pointerdown', interrupt);
      window.removeEventListener('keydown', interrupt);
    };
  }, [actorId, location.key, location.pathname, location.search, location.hash, location.state, navigationType]);

  return null;
}
