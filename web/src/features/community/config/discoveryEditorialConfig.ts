export const communityHeroAssets = {
  backdrop: '/assets/scene-builder/shot-recipes/color-light-editorial.jpg',
  portrait: '/assets/scene-builder/shot-recipes/soft-character-portrait.jpg',
  scene: '/assets/scene-builder/shot-recipes/sunlit-storefront.jpg'
} as const;

export const discoveryTutorialAssets = {
  templates: [
    { id: 'compose', imageUrl: '/assets/scene-builder/shot-recipes/window-shadow-lookbook.jpg', durationLabel: '02:10' },
    { id: 'adapt', imageUrl: '/assets/scene-builder/shot-recipes/sunlit-storefront.jpg', durationLabel: '03:25' },
    { id: 'finish', imageUrl: '/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg', durationLabel: '02:45' }
  ],
  characters: [
    { id: 'choose', imageUrl: '/assets/scene-builder/shot-recipes/soft-character-portrait.jpg', durationLabel: '02:30' },
    { id: 'cast', imageUrl: '/assets/scene-builder/shot-recipes/street-walk-editorial.jpg', durationLabel: '03:05' }
  ],
  comparisons: [
    { id: 'inspect', imageUrl: '/assets/scene-builder/shot-recipes/color-light-editorial.jpg', durationLabel: '02:15' },
    { id: 'decide', imageUrl: '/assets/scene-builder/shot-recipes/low-angle-campaign-hero.jpg', durationLabel: '02:50' }
  ],
  home: [
    { id: 'start', imageUrl: '/assets/scene-builder/shot-recipes/architectural-lean.jpg', durationLabel: '03:00' },
    { id: 'share', imageUrl: '/assets/scene-builder/shot-recipes/street-walk-editorial.jpg', durationLabel: '02:20' }
  ]
} as const;
