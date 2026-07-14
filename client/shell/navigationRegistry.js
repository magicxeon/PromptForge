(() => {
  const ROUTE_PATTERNS = [/^\/$/, /^\/studio$/, /^\/history$/, /^\/comparisons$/, /^\/comparisons\/[^/]+$/];
  const modules = [
    { id: 'studio', label: { en: 'Studio', th: 'สตูดิโอ' }, description: { en: 'Create images', th: 'สร้างภาพ' }, route: '/studio', icon: 'studio', order: 10 },
    { id: 'history', label: { en: 'Image History', th: 'ประวัติรูปภาพ' }, description: { en: 'Browse generations', th: 'ดูภาพที่สร้างไว้' }, route: '/history', icon: 'history', order: 20 },
    { id: 'comparisons', label: { en: 'Comparisons', th: 'เปรียบเทียบ AI' }, description: { en: 'Review model tests', th: 'ดูชุดทดสอบโมเดล' }, route: '/comparisons', icon: 'compare', order: 30, featureFlag: 'aiComparison' }
  ];
  const featureFlags = { aiComparison: true };

  function listVisible(context = {}) {
    return modules
      .filter(module => !module.featureFlag || (context.featureFlags?.[module.featureFlag] ?? featureFlags[module.featureFlag]))
      .filter(module => !module.entitlement || context.entitlements?.includes(module.entitlement))
      .sort((a, b) => a.order - b.order)
      .map(module => ({ ...module, label: { ...module.label }, description: { ...module.description } }));
  }

  function isAllowedRoute(pathname) {
    return ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
  }

  function getModuleForPath(pathname) {
    if (pathname === '/history') return modules.find(module => module.id === 'history');
    if (pathname.startsWith('/comparisons')) return modules.find(module => module.id === 'comparisons');
    return modules.find(module => module.id === 'studio');
  }

  window.ModelPromptForgeNavigationRegistry = { listVisible, isAllowedRoute, getModuleForPath };
})();
