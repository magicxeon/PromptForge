(() => {
  const registry = () => window.ModelPromptForgeNavigationRegistry;
  const normalizePath = pathname => {
    if (!pathname || pathname === '/' || pathname === '/home') return '/community';
    return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  };

  function current() {
    const pathname = normalizePath(window.location.pathname);
    const definition = registry()?.getRouteDefinition?.(pathname);
    return {
      pathname,
      search: window.location.search,
      hash: window.location.hash,
      params: pathname.startsWith('/comparisons/')
        ? { setId: decodeURIComponent(pathname.slice('/comparisons/'.length)) }
        : {},
      state: window.history.state || {},
      moduleId: definition?.moduleId || null,
      workflowIntent: definition?.workflowIntent || null,
      canonicalParent: definition?.canonicalParent || '/community'
    };
  }

  function emitRoute() {
    const route = current();
    if (!registry()?.isAllowedRoute(route.pathname)) {
      navigate('/community', { replace: true });
      return;
    }
    if (registry()?.isAccessibleRoute?.(route.pathname) === false) {
      navigate('/community', { replace: true });
      return;
    }
    window.dispatchEvent(new CustomEvent('modelpromptforge:route', { detail: route }));
  }

  function navigate(target, {
    replace = false,
    state = {},
    navigationContext = undefined
  } = {}) {
    const url = new URL(target, window.location.origin);
    const pathname = normalizePath(url.pathname);
    if (url.origin !== window.location.origin
      || !registry()?.isAllowedRoute(pathname)
      || registry()?.isAccessibleRoute?.(pathname) === false) return false;
    const nextState = {
      ...state,
      ...(navigationContext === undefined ? {} : { navigationContext })
    };
    window.history[replace ? 'replaceState' : 'pushState'](
      nextState,
      '',
      `${pathname}${url.search}${url.hash}`
    );
    emitRoute();
    return true;
  }

  function navigateToResource(target, options = {}) {
    const navigationContext = window.ModelPromptForgeNavigationContext?.create?.(options)
      || null;
    return navigate(target, { state: options.state || {}, navigationContext });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-route]');
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    if (trigger.dataset.resourceRoute === 'true') {
      navigateToResource(trigger.dataset.route, {
        sourceLabel: trigger.dataset.sourceLabel,
        sourceViewId: trigger.dataset.sourceViewId
      });
    } else {
      navigate(trigger.dataset.route);
    }
  });
  window.addEventListener('popstate', emitRoute);
  document.addEventListener('DOMContentLoaded', () => {
    window.history.scrollRestoration = 'manual';
    if (['/', '/home'].includes(window.location.pathname)) {
      window.history.replaceState(
        window.history.state || {},
        '',
        `/community${window.location.search}`
      );
    }
    emitRoute();
  });
  window.ModelPromptForgeRouter = {
    current,
    navigate,
    navigateToResource,
    back: options => window.ModelPromptForgeNavigationContext?.back?.(options),
    refresh: emitRoute
  };
})();
