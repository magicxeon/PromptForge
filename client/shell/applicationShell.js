(() => {
  const iconClasses = new Set([
    'home', 'sparkles', 'shirt', 'user', 'clapperboard', 'flask',
    'columns', 'image', 'users', 'settings'
  ]);
  let initialized = false;
  let menuOpen = false;
  let createMenuOpen = false;
  let lastRoute = null;
  const t = (key, fallback) =>
    window.ModelPromptForgeI18n?.t?.(key, {}, { defaultValue: fallback }) || fallback;

  async function initialize() {
    if (initialized) return;
    initialized = true;
    await window.ModelPromptForgeNavigationConfig?.initialize?.();
    renderNavigation();
    bindMenu();
    bindGlobalCreateMenu();
    bindGlobalSearch();
    window.addEventListener('modelpromptforge:route', event => applyRoute(event.detail));
    window.addEventListener('modelpromptforge:languagechange', () => {
      renderNavigation();
      renderCreateMenu();
      refreshGlobalLabels();
    });
    window.addEventListener('modelpromptforge:communityfeatureschange', () => {
      renderNavigation();
      renderCreateMenu();
      window.ModelPromptForgeRouter?.refresh?.();
    });
    window.addEventListener('modelpromptforge:actorchange', () => {
      renderNavigation();
      renderCreateMenu();
      applyRoute(window.ModelPromptForgeRouter.current());
    });
    applyRoute(window.ModelPromptForgeRouter.current());
    refreshGlobalLabels();
  }

  function renderNavigation() {
    const navigation = document.getElementById('application-navigation');
    if (!navigation) return;
    navigation.replaceChildren();
    const visibleModules = window.ModelPromptForgeNavigationRegistry.listVisible({
      role: window.state?.userRole || 'user'
    });
    const groupDefinitions = new Map(
      window.ModelPromptForgeNavigationRegistry.listGroups().map(group => [group.id, group])
    );
    const groupContainers = new Map();
    const visibleIds = new Set(visibleModules.map(module => module.id));
    const childrenByParent = new Map();
    visibleModules.forEach(module => {
      if (!module.parentId || !visibleIds.has(module.parentId)) return;
      const children = childrenByParent.get(module.parentId) || [];
      children.push(module);
      childrenByParent.set(module.parentId, children);
    });
    visibleModules
      .filter(module => !module.parentId || !visibleIds.has(module.parentId))
      .forEach(module => {
      const groupId = module.groupId || 'primary';
      let group = groupContainers.get(groupId);
      if (!group) {
        group = document.createElement('section');
        group.className = 'application-nav-group';
        group.dataset.group = groupId;
        if (module.groupId) {
          const definition = groupDefinitions.get(module.groupId);
          const heading = document.createElement('button');
          heading.type = 'button';
          heading.className = 'application-nav-group-toggle';
          const expanded = groupExpanded(module.groupId, definition);
          heading.setAttribute('aria-expanded', String(expanded));
          heading.innerHTML = `<span>${escapeHtml(t(
            definition?.labelKey,
            module.groupId
          ))}</span><span aria-hidden="true">\u2304</span>`;
          group.classList.toggle('is-collapsed', !expanded);
          heading.addEventListener('click', () => {
            const expanded = heading.getAttribute('aria-expanded') !== 'true';
            heading.setAttribute('aria-expanded', String(expanded));
            group.classList.toggle('is-collapsed', !expanded);
            localStorage.setItem(
              `momelo.navigation.group.${module.groupId}`,
              expanded ? 'expanded' : 'collapsed'
            );
          });
          group.appendChild(heading);
        }
        navigation.appendChild(group);
        groupContainers.set(groupId, group);
      }
      const children = childrenByParent.get(module.id) || [];
      group.appendChild(navigationLink(module, {
        hasChildren: children.length > 0
      }));
      if (children.length) {
        const nested = document.createElement('div');
        nested.className = 'application-nav-children';
        nested.setAttribute('aria-label', t(module.labelKey, module.id));
        children
          .sort((left, right) => (left.order || 99) - (right.order || 99))
          .forEach(child => nested.appendChild(navigationLink(child, { isChild: true })));
        group.appendChild(nested);
      }
    });
    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'application-nav-collapse';
    collapse.setAttribute('aria-pressed', String(document.body.classList.contains('application-sidebar-collapsed')));
    collapse.innerHTML = `<span aria-hidden="true">\u2039</span><span>${escapeHtml(t(
      'shell.navigation.collapse',
      'Collapse menu'
    ))}</span>`;
    collapse.addEventListener('click', toggleSidebar);
    navigation.appendChild(collapse);
    updateActiveNavigation(lastRoute || window.ModelPromptForgeRouter.current());
  }

  function navigationLink(module, { isChild = false, hasChildren = false } = {}) {
    const link = document.createElement('a');
    link.href = module.route;
    link.dataset.route = module.route;
    link.dataset.navigationItemId = module.id;
    link.className = `application-nav-item${isChild ? ' is-child' : ''}${hasChildren ? ' has-children' : ''}`;
    link.title = t(module.descriptionKey, t(module.labelKey, module.id));
    const icon = document.createElement('span');
    icon.className = `application-nav-icon icon-${iconClasses.has(module.icon) ? module.icon : 'sparkles'}`;
    icon.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'application-nav-copy';
    const title = document.createElement('strong');
    title.textContent = t(module.labelKey, module.id);
    copy.appendChild(title);
    link.append(icon, copy);
    return link;
  }

  function bindMenu() {
    const button = document.getElementById('application-menu-button');
    document.getElementById('application-menu-backdrop')?.addEventListener('click', () => setMenuOpen(false));
    button?.addEventListener('click', () => setMenuOpen(!menuOpen));
    document.getElementById('application-navigation')?.addEventListener('click', event => {
      if (event.target.closest('a')) setMenuOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuOpen) setMenuOpen(false, true);
      if (event.key !== 'Tab' || !menuOpen) return;
      const focusable = [...document.querySelectorAll(
        '#application-menu-button, #application-navigation a, #application-navigation button'
      )];
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    });
  }

  function setMenuOpen(open, restoreFocus = false) {
    menuOpen = open;
    document.body.classList.toggle('application-menu-open', open);
    const button = document.getElementById('application-menu-button');
    button?.setAttribute('aria-expanded', String(open));
    const backdrop = document.getElementById('application-menu-backdrop');
    if (backdrop) backdrop.hidden = !open;
    if (open) document.querySelector('#application-navigation a')?.focus();
    else if (restoreFocus) button?.focus();
  }

  function toggleSidebar() {
    const collapsed = !document.body.classList.contains('application-sidebar-collapsed');
    document.body.classList.toggle('application-sidebar-collapsed', collapsed);
    localStorage.setItem('momelo.navigation.sidebarPreference', collapsed ? 'collapsed' : 'expanded');
    const button = document.querySelector('.application-nav-collapse');
    button?.setAttribute('aria-pressed', String(collapsed));
    const arrow = button?.querySelector('span[aria-hidden]');
    if (arrow) arrow.textContent = collapsed ? '\u203A' : '\u2039';
  }

  function groupExpanded(groupId, definition) {
    const preference = localStorage.getItem(`momelo.navigation.group.${groupId}`);
    if (preference) return preference !== 'collapsed';
    return definition?.defaultExpanded !== false;
  }

  function restoreSidebarPreference() {
    const collapsed = localStorage.getItem('momelo.navigation.sidebarPreference') === 'collapsed';
    document.body.classList.toggle('application-sidebar-collapsed', collapsed);
  }

  function bindGlobalCreateMenu() {
    restoreSidebarPreference();
    const trigger = document.getElementById('global-create-trigger');
    const menu = document.getElementById('global-create-menu');
    if (!trigger || !menu) return;
    trigger.addEventListener('click', () => setCreateMenuOpen(!createMenuOpen));
    document.addEventListener('click', event => {
      if (!event.target.closest('#global-create-control')) setCreateMenuOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setCreateMenuOpen(false, true);
    });
    renderCreateMenu();
  }

  function renderCreateMenu() {
    const menu = document.getElementById('global-create-menu');
    if (!menu) return;
    menu.replaceChildren();
    const visible = window.ModelPromptForgeNavigationRegistry
      .listVisible({ role: window.state?.userRole || 'user' });
    const parentIds = new Set(visible.map(item => item.parentId).filter(Boolean));
    const items = visible.filter(item =>
      item.groupId === 'create' && !parentIds.has(item.id)
    );
    items.forEach(item => {
      const link = document.createElement('a');
      link.href = item.route;
      link.dataset.route = item.route;
      link.className = item.featured ? 'is-featured' : '';
      const icon = document.createElement('span');
      icon.className = `application-nav-icon icon-${iconClasses.has(item.icon) ? item.icon : 'sparkles'}`;
      icon.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = t(item.labelKey, item.id);
      const detail = document.createElement('small');
      detail.textContent = t(item.descriptionKey, '');
      copy.append(title, detail);
      link.append(icon, copy);
      link.addEventListener('click', () => setCreateMenuOpen(false));
      menu.appendChild(link);
    });
  }

  function setCreateMenuOpen(open, restoreFocus = false) {
    createMenuOpen = open;
    const trigger = document.getElementById('global-create-trigger');
    const menu = document.getElementById('global-create-menu');
    if (!trigger || !menu) return;
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (open) menu.querySelector('a')?.focus();
    else if (restoreFocus) trigger.focus();
  }

  function bindGlobalSearch() {
    const input = document.getElementById('global-navigation-search');
    const results = document.getElementById('global-navigation-search-results');
    if (!input || !results) return;
    const refresh = () => {
      const query = input.value.trim().toLocaleLowerCase();
      results.replaceChildren();
      if (!query) {
        results.hidden = true;
        return;
      }
      const matches = window.ModelPromptForgeNavigationRegistry
        .listVisible({ role: window.state?.userRole || 'user' })
        .filter(item => `${t(item.labelKey, item.id)} ${t(item.descriptionKey, '')}`
          .toLocaleLowerCase()
          .includes(query))
        .slice(0, 6);
      matches.forEach(item => {
        const link = document.createElement('a');
        link.href = item.route;
        link.dataset.route = item.route;
        link.textContent = t(item.labelKey, item.id);
        link.addEventListener('click', () => {
          input.value = '';
          results.hidden = true;
        });
        results.appendChild(link);
      });
      results.hidden = matches.length === 0;
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const first = results.querySelector('a');
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
      if (event.key === 'Escape') {
        input.value = '';
        results.hidden = true;
      }
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.global-navigation-search')) results.hidden = true;
    });
  }

  function refreshGlobalLabels() {
    const search = document.getElementById('global-navigation-search');
    const create = document.getElementById('global-create-trigger');
    const menu = document.getElementById('application-menu-button');
    if (search) {
      search.placeholder = t('shell.navigation.searchPlaceholder', 'Search tools...');
      search.setAttribute('aria-label', t('shell.navigation.searchLabel', 'Search application tools'));
    }
    if (create) {
      create.querySelector('[data-global-create-label]').textContent = t(
        'shell.navigation.create',
        'Create'
      );
    }
    if (menu) menu.querySelector('span:last-child').textContent = t('shell.navigation.menu', 'Menu');
  }

  function applyRoute(route) {
    lastRoute = route;
    const comparisonPage = route.moduleId === 'comparisons';
    const communityPage = route.pathname === '/community';
    const characterDirectoryPage = route.pathname === '/community/characters';
    const characterProfilePage = /^\/community\/characters\/[^/]+$/.test(route.pathname);
    const communityDetailPage = route.pathname.startsWith('/community/')
      && !characterDirectoryPage
      && !characterProfilePage;
    const creatorProfilePage = route.pathname.startsWith('/creators/');
    const playgroundPage = route.moduleId === 'playground';
    const adminPageRoute = route.pathname === '/admin';
    const historyPage = route.moduleId === 'history';
    const studioPage = route.moduleId === 'studio';
    document.body.dataset.appPage = comparisonPage ? 'comparisons'
      : communityPage ? 'community'
        : characterDirectoryPage ? 'community-characters'
          : characterProfilePage ? 'character-profile'
            : communityDetailPage ? 'community-detail'
              : creatorProfilePage ? 'creator-profile'
                : playgroundPage ? 'playground'
                  : adminPageRoute ? 'admin'
                    : historyPage ? 'history'
                      : 'studio';
    const studio = document.querySelector('.app-workspace');
    const dashboard = document.getElementById('comparison-dashboard');
    const community = document.getElementById('community-home');
    const communityDetail = document.getElementById('community-post-detail');
    const characterDirectory = document.getElementById('community-character-directory');
    const characterProfile = document.getElementById('character-profile-page');
    const creatorProfile = document.getElementById('creator-profile-page');
    const playground = document.getElementById('playground-page');
    const admin = document.getElementById('admin-page');
    if (studio) studio.hidden = !studioPage && !historyPage;
    if (dashboard) dashboard.hidden = !comparisonPage;
    if (community) community.hidden = !communityPage;
    if (communityDetail) communityDetail.hidden = !communityDetailPage;
    if (characterDirectory) characterDirectory.hidden = !characterDirectoryPage;
    if (characterProfile) characterProfile.hidden = !characterProfilePage;
    if (creatorProfile) creatorProfile.hidden = !creatorProfilePage;
    if (playground) playground.hidden = !playgroundPage;
    if (admin) admin.hidden = !adminPageRoute;
    updateActiveNavigation(route);
    setMenuOpen(false);
    if (historyPage) {
      requestAnimationFrame(() => scrollToSection('visual-dashboard'));
    } else if (studioPage) {
      applyWorkflowIntent(route.workflowIntent);
      requestAnimationFrame(() => scrollToStudio(route));
    } else if (communityPage || characterDirectoryPage || characterProfilePage || communityDetailPage || creatorProfilePage || playgroundPage || adminPageRoute) {
      requestAnimationFrame(() => smoothScrollTo(0));
    } else if (!route.pathname.startsWith('/comparisons/')) {
      requestAnimationFrame(() => smoothScrollTo(route.state?.scrollY || 0));
    }
    if (adminPageRoute) window.ModelPromptForgeAdminPanel?.activate?.();
  }

  function applyWorkflowIntent(intent) {
    if (!intent?.mode) return;
    const apply = () => {
      const chip = document.querySelector(`.mode-chip[data-mode="${CSS.escape(intent.mode)}"]`);
      if (!chip || window.state?.mode === intent.mode) return;
      chip.click();
    };
    requestAnimationFrame(apply);
    window.addEventListener('modelpromptforge:ready', apply, { once: true });
  }

  function scrollToStudio(route) {
    if (typeof route.state?.scrollY === 'number') {
      smoothScrollTo(route.state.scrollY);
      return;
    }
    scrollToSection('creative-configurator');
  }

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function smoothScrollTo(top) {
    window.scrollTo({
      top,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  }

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const reducedMotion = prefersReducedMotion();
    section.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    const heading = section.querySelector('h2, h1, h3');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      window.setTimeout(() => heading.focus({ preventScroll: true }), reducedMotion ? 0 : 450);
    }
  }

  function updateActiveNavigation(route) {
    const activeItemId = window.ModelPromptForgeNavigationRegistry
      .getActiveItemId(route.pathname, route.search);
    const activeItem = window.ModelPromptForgeNavigationConfig
      ?.getConfig?.()
      ?.items?.find(item => item.id === activeItemId);
    document.querySelectorAll('.application-nav-item').forEach(item => {
      const active = item.dataset.navigationItemId === activeItemId;
      const activeParent = item.dataset.navigationItemId === activeItem?.parentId;
      item.classList.toggle('active', active);
      item.classList.toggle('active-parent', activeParent);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  document.addEventListener('DOMContentLoaded', initialize);
  window.addEventListener('modelpromptforge:ready', initialize);
})();
