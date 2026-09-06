import type { CommunityPost } from '../schemas/communitySchemas';

export function isEligibleCommunityHeroPost(post: CommunityPost) {
  if (post.visibility !== 'public') return false;
  if (post.status === 'hidden' || post.status === 'removed' || post.status === 'owner_unpublished') {
    return false;
  }
  if (post.imageUrl || post.thumbnailUrl || post.videoUrl || post.posterUrl) return true;
  if (post.comparisonSnapshot?.slots.some(slot => slot.imageUrl || slot.thumbnailUrl)) return true;
  return Boolean(post.collectionSnapshot?.items.some(item => item.imageUrl || item.thumbnailUrl));
}
