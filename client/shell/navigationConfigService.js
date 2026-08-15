(() => {
  const CONFIG_URL = '/shell/navigation.config.json';
  const FALLBACK = {
    version: 1,
    homeRoute: '/community',
    groups: [
      {
        id: 'create',
        labelKey: 'shell.navigation.groups.create',
        order: 10,
        collapsible: true,
        defaultExpanded: true
      }
    ],
    items: [
      {
        id: 'home',
        groupId: null,
        labelKey: 'shell.navigation.items.home',
        route: '/community',
        icon: 'home',
        order: 1,
        enabled: true
      },
      {
        id: 'studio',
        groupId: 'create',
        labelKey: 'shell.navigation.items.studio',
        route: '/studio',
        icon: 'sparkles',
        order: 10,
        enabled: true
      },
      {
        id: 'easy-create',
        groupId: 'create',
        parentId: 'studio',
        labelKey: 'shell.navigation.items.headshotGrid',
        route: '/create/simple',
        icon: 'sparkles',
        order: 10,
        enabled: true,
        workflowIntent: { moduleId: 'studio', workflowId: 'simple', mode: 'headshot' }
      }
    ]
  };
  let config = null;
  let pending = null;

  async function initialize() {
    if (config) return config;
    if (pending) return pending;
    pending = fetch(CONFIG_URL, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(validate)
      .catch(error => {
        console.warn('[Navigation] Config unavailable; using the safe fallback.', error);
        return validate(FALLBACK);
      })
      .then(value => {
        config = value;
        window.dispatchEvent(new CustomEvent('modelpromptforge:navigationconfigready', {
          detail: value
        }));
        return value;
      });
    return pending;
  }

  function validate(input) {
    if (!input || input.version !== 1 || !Array.isArray(input.items)) {
      throw new Error('Unsupported navigation config.');
    }
    const groupIds = new Set((input.groups || []).map(group => group.id));
    const itemIds = new Set();
    const routes = new Map();
    const items = input.items.filter(item => {
      if (!item?.id || !item?.route || !item?.labelKey || itemIds.has(item.id)) {
        console.warn('[Navigation] Ignoring an invalid or duplicate item.', item?.id);
        return false;
      }
      if (item.groupId && !groupIds.has(item.groupId)) {
        console.warn('[Navigation] Ignoring item with an unknown group.', item.id);
        return false;
      }
      if (routes.has(item.route) && routes.get(item.route) !== item.id) {
        console.warn('[Navigation] Ignoring item with a conflicting route.', item.id);
        return false;
      }
      itemIds.add(item.id);
      routes.set(item.route, item.id);
      return true;
    });
    const itemById = new Map(items.map(item => [item.id, item]));
    const nestedItems = items.filter(item => {
      if (!item.parentId) return true;
      const parent = itemById.get(item.parentId);
      if (!parent || parent.id === item.id || parent.groupId !== item.groupId) {
        console.warn('[Navigation] Ignoring item with an invalid parent.', item.id);
        return false;
      }
      return true;
    });
    return {
      version: 1,
      homeRoute: input.homeRoute || '/community',
      groups: [...(input.groups || [])],
      items: nestedItems
    };
  }

  function getConfig() {
    return config || validate(FALLBACK);
  }

  window.ModelPromptForgeNavigationConfig = { initialize, getConfig };
})();
