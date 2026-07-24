(() => {
  const ROUTE_PATTERNS = [/^\/$/, /^\/community$/, /^\/studio$/, /^\/playground$/, /^\/history$/, /^\/comparisons$/, /^\/comparisons\/[^/]+$/];
  const modules = [
    { id: 'community', label: { en: 'Community', th: 'ชุมชน' }, description: { en: 'Discover workflows', th: 'ค้นหาไอเดีย' }, route: '/community', icon: 'community', order: 1 },
    { id: 'playground', label: { en: 'Playground', th: 'เพลย์กราวนด์' }, description: { en: 'Freeform prompting', th: 'เขียน Prompt อิสระ' }, route: '/playground', icon: 'playground', order: 15 },
    { id: 'studio', label: { en: 'Studio', th: 'สตูดิโอ' }, description: { en: 'Create images', th: 'สร้างภาพ' }, route: '/studio', icon: 'studio', order: 10 },
    { id: 'history', label: { en: 'Image History', th: 'ประวัติรูปภาพ' }, description: { en: 'Browse generations', th: 'ดูภาพที่สร้างไว้' }, route: '/history', icon: 'history', order: 20 },
    { id: 'comparisons', label: { en: 'Comparisons', th: 'เปรียบเทียบ AI' }, description: { en: 'Review model tests', th: 'ดูชุดทดสอบโมเดล' }, route: '/comparisons', icon: 'compare', order: 30, featureFlag: 'aiComparison' }
  ];
  const featureFlags = { aiComparison: true };
  const groupByModuleId = {
    studio: 'create',
    playground: 'create',
    community: 'explore',
    history: 'library',
    comparisons: 'library'
  };
  const groups = {
    create: { en: 'Create', th: 'สร้าง' },
    explore: { en: 'Explore', th: 'สำรวจ' },
    library: { en: 'Library', th: 'คลังของฉัน' }
  };
  const groupOrder = { create: 10, explore: 20, library: 30 };

  function listVisible(context = {}) {
    return modules
      .filter(module => !module.featureFlag || (context.featureFlags?.[module.featureFlag] ?? featureFlags[module.featureFlag]))
      .filter(module => !module.entitlement || context.entitlements?.includes(module.entitlement))
      .sort((a, b) => {
        const groupDelta = (groupOrder[groupByModuleId[a.id]] || 99) - (groupOrder[groupByModuleId[b.id]] || 99);
        return groupDelta || a.order - b.order;
      })
      .map(module => ({ ...module, group: groupByModuleId[module.id] || 'create', label: { ...module.label }, description: { ...module.description } }));
  }

  function isAllowedRoute(pathname) {
    return ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
  }

  function getModuleForPath(pathname) {
    if (pathname === '/' || pathname === '/community') return modules.find(module => module.id === 'community');
    if (pathname === '/playground') return modules.find(module => module.id === 'playground');
    if (pathname === '/history') return modules.find(module => module.id === 'history');
    if (pathname.startsWith('/comparisons')) return modules.find(module => module.id === 'comparisons');
    return modules.find(module => module.id === 'studio');
  }

  window.ModelPromptForgeNavigationRegistry = { listVisible, isAllowedRoute, getModuleForPath, groups };
})();
