(() => {
  const iconClasses = new Set(['studio', 'history', 'compare', 'community', 'playground', 'admin']);
  let initialized = false;
  let menuOpen = false;
  let navHover = false;
  let navFocus = false;
  let lastRoute = null;
  const language = () => window.ModelPromptForgeComparisonBridge?.getLanguage?.() || 'th';

  function initialize() {
    if (initialized) return;
    initialized = true;
    renderNavigation();
    bindMenu();
    bindNavigationFade();
    window.addEventListener('modelpromptforge:route', event => applyRoute(event.detail));
    window.addEventListener('modelpromptforge:languagechange', () => renderNavigation());
    window.addEventListener('modelpromptforge:actorchange', () => {
      renderNavigation();
      applyRoute(window.ModelPromptForgeRouter.current());
    });
    applyRoute(window.ModelPromptForgeRouter.current());
    updateNavigationVisibility();
  }

  function renderNavigation() {
    const navigation = document.getElementById('application-navigation');
    if (!navigation) return;
    navigation.innerHTML = '';
    const visibleModules = window.ModelPromptForgeNavigationRegistry.listVisible({ role: window.state?.userRole || 'user' });
    const groupLabels = window.ModelPromptForgeNavigationRegistry.groups || {};
    const groupContainers = new Map();
    visibleModules.forEach(module => {
      let group = groupContainers.get(module.group);
      if (!group) {
        group = document.createElement('section');
        group.className = 'application-nav-group';
        group.dataset.group = module.group || 'create';
        const heading = document.createElement('span');
        heading.className = 'application-nav-group-label';
        const groupLabel = groupLabels[module.group] || {};
        heading.textContent = groupLabel[language()] || groupLabel.en || module.group || '';
        group.appendChild(heading);
        navigation.appendChild(group);
        groupContainers.set(module.group, group);
      }
      const link = document.createElement('a');
      link.href = module.route;
      link.dataset.route = module.route;
      link.dataset.moduleId = module.id;
      link.className = 'application-nav-item';
      const icon = document.createElement('span');
      icon.className = `application-nav-icon icon-${iconClasses.has(module.icon) ? module.icon : 'studio'}`;
      icon.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = module.label[language()] || module.label.en;
      const detail = document.createElement('small');
      detail.textContent = module.description[language()] || module.description.en;
      copy.append(title, detail);
      link.append(icon, copy);
      group.appendChild(link);
    });
    updateActiveNavigation(lastRoute || window.ModelPromptForgeRouter.current());
  }

  function bindMenu() {
    const button = document.getElementById('application-menu-button');
    document.getElementById('application-menu-backdrop')?.addEventListener('click', () => setMenuOpen(false));
    button?.addEventListener('click', () => setMenuOpen(!menuOpen));
    document.getElementById('application-navigation')?.addEventListener('click', () => setMenuOpen(false));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuOpen) setMenuOpen(false, true);
      if (event.key !== 'Tab' || !menuOpen) return;
      const focusable = [...document.querySelectorAll('#application-menu-button, #application-navigation a')];
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
    updateNavigationVisibility();
  }

  function applyRoute(route) {
    lastRoute = route;
    const comparisonPage = route.pathname.startsWith('/comparisons');
    const communityPage = route.pathname === '/community';
    const playgroundPage = route.pathname === '/playground';
    const adminPageRoute = route.pathname === '/admin';
    document.body.dataset.appPage = comparisonPage ? 'comparisons' : communityPage ? 'community' : playgroundPage ? 'playground' : adminPageRoute ? 'admin' : route.pathname === '/history' ? 'history' : 'studio';
    const studio = document.querySelector('.app-workspace');
    const dashboard = document.getElementById('comparison-dashboard');
    const community = document.getElementById('community-home');
    const playground = document.getElementById('playground-page');
    const admin = document.getElementById('admin-page');
    if (studio) studio.hidden = comparisonPage || communityPage || playgroundPage || adminPageRoute;
    if (dashboard) dashboard.hidden = !comparisonPage;
    if (community) community.hidden = !communityPage;
    if (playground) playground.hidden = !playgroundPage;
    if (admin) admin.hidden = !adminPageRoute;
    updateActiveNavigation(route);
    setMenuOpen(false);
    requestAnimationFrame(updateNavigationVisibility);
    if (route.pathname === '/history') {
      requestAnimationFrame(() => scrollToSection('visual-dashboard'));
    } else if (route.pathname === '/studio') {
      requestAnimationFrame(() => scrollToStudio(route));
    } else if (communityPage || playgroundPage || adminPageRoute) {
      requestAnimationFrame(() => smoothScrollTo(0));
    } else if (!route.pathname.startsWith('/comparisons/')) {
      requestAnimationFrame(() => smoothScrollTo(route.state?.scrollY || 0));
    }
    if (adminPageRoute) window.ModelPromptForgeAdminPanel?.activate?.();
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
    const activeModule = window.ModelPromptForgeNavigationRegistry.getModuleForPath(route.pathname);
    document.querySelectorAll('.application-nav-item').forEach(item => {
      const active = item.dataset.moduleId === activeModule?.id;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function bindNavigationFade() {
    const shell = document.querySelector('.application-nav-shell');
    if (!shell) return;
    shell.addEventListener('pointerenter', () => {
      navHover = true;
      updateNavigationVisibility();
    });
    shell.addEventListener('pointerleave', () => {
      navHover = false;
      updateNavigationVisibility();
    });
    shell.addEventListener('focusin', () => {
      navFocus = true;
      updateNavigationVisibility();
    });
    shell.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        navFocus = shell.contains(document.activeElement);
        updateNavigationVisibility();
      });
    });
    window.addEventListener('scroll', updateNavigationVisibility, { passive: true });
  }

  function updateNavigationVisibility() {
    const shell = document.querySelector('.application-nav-shell');
    if (!shell) return;
    const muted = window.scrollY > 24 && !menuOpen && !navHover && !navFocus;
    shell.classList.toggle('application-nav-muted', muted);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  window.addEventListener('modelpromptforge:ready', initialize);
})();
