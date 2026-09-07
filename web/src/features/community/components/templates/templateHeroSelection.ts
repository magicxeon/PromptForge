import type { CommunityPost } from '../../schemas/communitySchemas';

export type TemplateHeroSelection = { original: CommunityPost; creations: CommunityPost[] };

export function selectTemplateHero(
  posts: CommunityPost[],
  previews: ReadonlyMap<string, { items: CommunityPost[] }>
): TemplateHeroSelection | null {
  const usable = (post: CommunityPost) => post.visibility === 'public'
    && ['active', 'published', 'reported'].includes(post.status || '')
    && Boolean(post.imageUrl || post.thumbnailUrl);
  for (const original of posts) {
    if (original.postType !== 'template' || !original.templateAvailability || !usable(original)) continue;
    const seen = new Set([original.id]);
    const creations = (previews.get(original.id)?.items || []).filter(post => {
      if (post.postType !== 'image' || !usable(post) || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    }).slice(0, 3);
    if (creations.length === 3) return { original, creations };
  }
  return null;
}
