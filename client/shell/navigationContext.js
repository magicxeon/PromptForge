(() => {
  const VERSION = 1;

  function actorId() {
    return window.ModelPromptForgeActorContext?.getActiveMockUserId?.() || null;
  }

  function create(options = {}) {
    const current = window.ModelPromptForgeRouter?.current?.() || {};
    return {
      version: VERSION,
      actorId: actorId(),
      sourceRoute: options.sourceRoute || `${current.pathname || '/community'}${current.search || ''}`,
      sourceLabel: String(options.sourceLabel || document.title || '').slice(0, 120),
      sourceModuleId: options.sourceModuleId
        || window.ModelPromptForgeNavigationRegistry?.getModuleForPath?.(current.pathname)?.id
        || null,
      sourceViewId: options.sourceViewId || null,
      sourceScrollY: Number.isFinite(options.sourceScrollY)
        ? options.sourceScrollY
        : Math.max(0, Math.round(window.scrollY || 0)),
      sourceState: sanitizeState(options.sourceState || current.state?.viewState || {})
    };
  }

  function isValid(context) {
    if (!context || context.version !== VERSION) return false;
    if (context.actorId && actorId() && context.actorId !== actorId()) return false;
    try {
      const url = new URL(context.sourceRoute, window.location.origin);
      return url.origin === window.location.origin
        && window.ModelPromptForgeNavigationRegistry?.isAllowedRoute?.(url.pathname) === true
        && window.ModelPromptForgeNavigationRegistry?.isAccessibleRoute?.(url.pathname) !== false;
    } catch {
      return false;
    }
  }

  function navigateBack({ canonicalParent = '/community' } = {}) {
    const route = window.ModelPromptForgeRouter?.current?.();
    const context = route?.state?.navigationContext;
    if (isValid(context)) {
      const target = new URL(context.sourceRoute, window.location.origin);
      return window.ModelPromptForgeRouter.navigate(
        `${target.pathname}${target.search}${target.hash}`,
        {
          replace: true,
          state: {
            viewState: context.sourceState || {},
            scrollY: context.sourceScrollY || 0
          }
        }
      );
    }
    return window.ModelPromptForgeRouter?.navigate?.(canonicalParent, { replace: true }) || false;
  }

  function clearIfActorChanged() {
    const route = window.ModelPromptForgeRouter?.current?.();
    if (!route?.state?.navigationContext || isValid(route.state.navigationContext)) return;
    window.history.replaceState({ ...route.state, navigationContext: null }, '', location.href);
  }

  function sanitizeState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const output = {};
    Object.entries(value).slice(0, 20).forEach(([key, item]) => {
      if (['string', 'number', 'boolean'].includes(typeof item) || item === null) {
        output[String(key).slice(0, 80)] = typeof item === 'string' ? item.slice(0, 300) : item;
      }
    });
    return output;
  }

  window.addEventListener('modelpromptforge:actorchange', clearIfActorChanged);
  window.ModelPromptForgeNavigationContext = { create, isValid, back: navigateBack };
})();
