// Identity admission only. Public resource owners still enforce publication and
// sanitization. AUTH-013 owns this exact allowlist; new APIs default to private.
export const optionalIdentityReadPaths = Object.freeze([
  '/api/health', '/api/me', '/api/mock-users', '/api/providers', '/api/attributes/bundle',
  '/api/learning/config', '/api/fashion-blueprints/model-catalog',
  '/api/generation/look-sheet-preset', '/api/generation/video/capabilities',
  '/api/references/processing-policy', '/api/cinematic/video-capabilities',
  '/api/cinematic/authoring-manifest', '/api/cinematic/faceless-previs/capabilities',
  '/api/community/features', '/api/community/taxonomy', '/api/community/readiness',
  '/api/community/posts', '/api/community/template-previews',
  '/api/community/posts/:postId/template-detail',
  '/api/community/posts/:postId/:mediaKind(video|poster)',
  '/api/community/posts/:postId/collection-items/:itemId/:mediaKind(image|thumbnail)',
  '/api/community/posts/:postId/comparison-slots/:slotId/image',
  '/api/community/posts/:postId/comparison-slots/:slotId/:mediaKind(video|poster)',
  '/api/community/posts/:postId/comparison-slots/:slotId/presentations/:profileId',
  '/api/community/creators/:handle', '/api/community/creators/:handle/posts',
  '/api/community/creators/:handle/page', '/api/community/creators/:handle/gallery',
  '/api/community/creators/:handle/characters',
  '/api/community/gallery/:itemId/:mediaKind(image|thumbnail)',
  '/api/community/characters', '/api/community/characters/:id',
  '/api/community/characters/:id/works', '/api/community/characters/:id/stats',
  '/api/community/characters/:itemId/:mediaKind(image|thumbnail)',
  '/api/community/character-profiles/:id/image',
  '/api/community/character-profiles/:id/featured-image',
  '/api/community/character-profiles/:id/:mediaKind(thumbnail|face|sheet)',
  '/api/scene-templates/shared', '/api/scene-templates/shared/:postId',
  '/api/scene-templates/shared/:postId/presentations/:profileId',
  '/api/scene-templates/shared/:postId/:mediaKind(image|thumbnail)',
  '/api/templates', '/api/templates/:templateId',
]);

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const optionalMatchers = optionalIdentityReadPaths.map(pattern => new RegExp('^' + pattern.split('/').map(part => {
  if (!part.startsWith(':')) return escape(part);
  const match = /^:[A-Za-z]+(?:\(([a-z]+(?:\|[a-z]+)*)\))?$/.exec(part);
  if (!match) throw new Error('Identity endpoint policy invalid.');
  return match[1] ? `(?:${match[1]})` : '[^/]+';
}).join('/') + '/?$', 'i'));

export function requiresIdentityAdmission(pathname) {
  return /^\/(api(?:\/|$)|outputs(?:\/|$)|sub-app-game-character(?:\/|$))/i.test(pathname);
}

export function permitsOptionalIdentityRead(method, pathname) {
  if (!['GET', 'HEAD'].includes(method) || typeof pathname !== 'string'
    || /[%\\\0]/.test(pathname)) return false;
  return optionalMatchers.some(matcher => matcher.test(pathname));
}
