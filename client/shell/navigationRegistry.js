(() => {
  const featureFlags = { aiComparison: true, fashionStudio: false };
  const ROUTES = [
    route('home', /^\/community$/, 'community', '/community', [
      crumb('shell.navigation.items.home', 'Home', null, true)
    ]),
    route('character-directory', /^\/community\/characters$/, 'community', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.characters', 'Characters', null, true)
    ]),
    route('character-profile', /^\/community\/characters\/[^/]+$/, 'community', '/community/characters', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.characters', 'Characters', '/community/characters'),
      { ...crumb('character-profiles.page.kicker', 'Character', null, true), dynamic: true }
    ]),
    route('community-post', /^\/community\/(?!characters(?:\/|$))[^/]+$/, 'community', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      { ...crumb('community.detail.post', 'Post', null, true), dynamic: true }
    ]),
    route('creator-profile', /^\/creators\/[^/]+(?:\/(?:gallery|characters|templates|comparisons|collections))?$/, 'community', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      { ...crumb('community.creator.profile', 'Creator', null, true), dynamic: true }
    ]),
    route('easy-create', /^\/create\/simple$/, 'studio', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.headshotGrid', 'Headshot Grid', null, true)
    ], { workflowId: 'simple', mode: 'headshot' }),
    { ...route('fashion-studio', /^\/create\/fashion$/, 'studio', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.fashionStudio', 'Fashion Studio', null, true)
    ], { workflowId: 'fashion', mode: 'guided' }), featureFlag: 'fashionStudio' },
    route('character-builder', /^\/create\/characters$/, 'studio', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.characterBuilder', 'Character Builder', null, true)
    ], { workflowId: 'character', mode: 'character-sheet' }),
    route('scene-builder', /^\/create\/scenes$/, 'studio', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.sceneBuilder', 'Scene Builder', null, true)
    ], { workflowId: 'scene', mode: 'normal' }),
    route('studio-compat', /^\/studio$/, 'studio', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.headshotGrid', 'Create', null, true)
    ]),
    route('playground', /^\/(?:playground|create\/playground)$/, 'playground', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.playground', 'Playground', null, true)
    ]),
    route('history', /^\/(?:history|library\/images)$/, 'history', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.myImages', 'My Images', null, true)
    ]),
    route('comparisons', /^\/(?:comparisons(?:\/[^/]+)?|compare)$/, 'comparisons', '/community', [
      crumb('shell.navigation.items.home', 'Home', '/community'),
      crumb('shell.navigation.items.comparisons', 'Comparisons', null, true)
    ]),
    {
      ...route('admin', /^\/admin$/, 'admin', '/community', [
        crumb('shell.navigation.items.home', 'Home', '/community'),
        crumb('shell.navigation.items.admin', 'Admin', null, true)
      ]),
      roles: ['admin', 'support']
    }
  ];

  function route(id, pattern, moduleId, canonicalParent, breadcrumbs, workflowIntent = null) {
    return { id, pattern, moduleId, canonicalParent, breadcrumbs, workflowIntent };
  }

  function crumb(labelKey, fallback, target, current = false) {
    return { labelKey, fallback, route: target, current };
  }

  function listVisible(context = {}) {
    const config = window.ModelPromptForgeNavigationConfig?.getConfig?.();
    if (!config) return [];
    const role = context.role || 'user';
    const groupOrder = new Map(config.groups.map(group => [group.id, group.order || 99]));
    const eligible = config.items
      .filter(item => item.enabled !== false)
      .filter(item => !item.featureFlag || isFeatureEnabled(item.featureFlag, context))
      .filter(item => !item.roles || item.roles.includes(role))
      .filter(item => isAllowedRoute(new URL(item.route, location.origin).pathname))
      .filter(item => isAccessibleRoute(new URL(item.route, location.origin).pathname, context));
    const eligibleIds = new Set(eligible.map(item => item.id));
    return eligible
      .filter(item => !item.parentId || eligibleIds.has(item.parentId))
      .sort((left, right) => {
        const groupDelta = (groupOrder.get(left.groupId) || 0) - (groupOrder.get(right.groupId) || 0);
        return groupDelta || (left.order || 99) - (right.order || 99);
      })
      .map(item => ({ ...item }));
  }

  function listGroups() {
    return [...(window.ModelPromptForgeNavigationConfig?.getConfig?.().groups || [])]
      .sort((left, right) => (left.order || 99) - (right.order || 99));
  }

  function getRouteDefinition(pathname) {
    return ROUTES.find(item => item.pattern.test(pathname)) || null;
  }

  function isAllowedRoute(pathname) {
    return pathname === '/' || pathname === '/home' || Boolean(getRouteDefinition(pathname));
  }

  function isAccessibleRoute(pathname, context = {}) {
    if (pathname === '/' || pathname === '/home') return true;
    const definition = getRouteDefinition(pathname);
    if (!definition) return false;
    const role = context.role || window.state?.userRole || 'user';
    if (definition.roles && !definition.roles.includes(role)) return false;
    if (definition.featureFlag && !isFeatureEnabled(definition.featureFlag, context)) return false;
    if (definition.moduleId === 'community') {
      return window.ModelPromptForgeCommunityFeatures?.isRouteEnabled?.(
        pathname,
        { defaultValue: context.defaultFeatureValue ?? true }
      ) !== false;
    }
    return true;
  }

  function isFeatureEnabled(featureFlag, context = {}) {
    if (Object.prototype.hasOwnProperty.call(context.featureFlags || {}, featureFlag)) {
      return context.featureFlags[featureFlag] === true;
    }
    return featureFlags[featureFlag] === true;
  }

  function getModuleForPath(pathname) {
    const definition = getRouteDefinition(pathname);
    return definition
      ? { id: definition.moduleId, routeId: definition.id, workflowIntent: definition.workflowIntent }
      : null;
  }

  function getActiveItemId(pathname, search = '') {
    if (pathname === '/community/characters' && new URLSearchParams(search).get('scope') === 'own') {
      return 'my-characters';
    }
    const definition = getRouteDefinition(pathname);
    if (!definition) return null;
    if (definition.id === 'studio-compat') {
      return 'studio';
    }
    if (['community-post', 'creator-profile', 'character-directory', 'character-profile'].includes(definition.id)) {
      return 'home';
    }
    return definition.id;
  }

  window.ModelPromptForgeNavigationRegistry = {
    listVisible,
    listGroups,
    isAllowedRoute,
    isAccessibleRoute,
    getRouteDefinition,
    getModuleForPath,
    getActiveItemId
  };
})();
