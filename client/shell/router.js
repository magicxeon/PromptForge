(() => {
  const registry = () => window.ModelPromptForgeNavigationRegistry;
  const normalizePath = pathname => !pathname || pathname === '/' ? '/studio' : pathname.replace(/\/$/, '');

  function current() {
    const pathname = normalizePath(window.location.pathname);
    return {
      pathname,
      search: window.location.search,
      params: pathname.startsWith('/comparisons/')
        ? { setId: decodeURIComponent(pathname.slice('/comparisons/'.length)) }
        : {},
      state: window.history.state || {}
    };
  }

  function emitRoute() {
    const route = current();
    if (!registry()?.isAllowedRoute(route.pathname)) {
      navigate('/studio', { replace: true });
      return;
    }
    window.dispatchEvent(new CustomEvent('modelpromptforge:route', { detail: route }));
  }

  function navigate(target, { replace = false, state = {} } = {}) {
    const url = new URL(target, window.location.origin);
    const pathname = normalizePath(url.pathname);
    if (url.origin !== window.location.origin || !registry()?.isAllowedRoute(pathname)) return false;
    window.history[replace ? 'replaceState' : 'pushState'](state, '', `${pathname}${url.search}${url.hash}`);
    emitRoute();
    return true;
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-route]');
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(trigger.dataset.route);
  });
  window.addEventListener('popstate', emitRoute);
  document.addEventListener('DOMContentLoaded', () => {
    window.history.scrollRestoration = 'manual';
    if (window.location.pathname === '/') window.history.replaceState(window.history.state || {}, '', `/studio${window.location.search}`);
    emitRoute();
  });
  window.ModelPromptForgeRouter = { current, navigate, refresh: emitRoute };
})();
