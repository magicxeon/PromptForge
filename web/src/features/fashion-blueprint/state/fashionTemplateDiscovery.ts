import type { CommunityPost } from '../../community/schemas/communitySchemas';

export function filterFashionReadyCommunityTemplates(
  posts: CommunityPost[],
  readyTemplateIds: string[]
) {
  const readyIds = new Set(readyTemplateIds);
  return posts.filter(post => Boolean(
    post.templateId && readyIds.has(post.templateId)
  ));
}
