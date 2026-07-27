(() => {
  let resource = null;
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  function setResource(input) {
    resource = input?.label ? { ...input } : null;
    render(window.ModelPromptForgeRouter?.current?.());
  }

  function clearResource() {
    resource = null;
    render(window.ModelPromptForgeRouter?.current?.());
  }

  function render(route) {
    const mount = document.getElementById('application-breadcrumbs');
    if (!mount || !route) return;
    const definition = window.ModelPromptForgeNavigationRegistry?.getRouteDefinition?.(route.pathname);
    const items = definition?.breadcrumbs?.map(item => ({ ...item })) || [];
    const context = route.state?.navigationContext;
    if (context?.sourceRoute && context.sourceLabel && items.length > 1) {
      items.splice(items.length - 1, 0, {
        label: context.sourceLabel,
        route: context.sourceRoute
      });
    }
    if (resource?.label) {
      const last = items.at(-1);
      if (last?.dynamic) last.label = resource.label;
      else items.push({ label: resource.label, current: true });
    }
    if (items.length <= 1 && route.pathname === '/community') {
      mount.hidden = true;
      mount.replaceChildren();
      return;
    }
    mount.hidden = false;
    mount.replaceChildren();
    const list = document.createElement('ol');
    items.forEach((item, index) => {
      const row = document.createElement('li');
      const label = item.label || t(item.labelKey, item.fallback || 'Page');
      const current = item.current || index === items.length - 1;
      if (!current && item.route) {
        const link = document.createElement('a');
        link.href = item.route;
        link.dataset.route = item.route;
        link.textContent = label;
        row.appendChild(link);
      } else {
        const span = document.createElement('span');
        span.textContent = label;
        if (current) span.setAttribute('aria-current', 'page');
        row.appendChild(span);
      }
      list.appendChild(row);
    });
    mount.appendChild(list);
  }

  window.addEventListener('modelpromptforge:route', event => {
    resource = null;
    render(event.detail);
  });
  window.addEventListener('modelpromptforge:languagechange', () =>
    render(window.ModelPromptForgeRouter?.current?.())
  );
  window.ModelPromptForgeBreadcrumbs = { setResource, clearResource, render };
})();
