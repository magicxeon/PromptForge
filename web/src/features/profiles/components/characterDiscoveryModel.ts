import type { CommunityPost } from '../../community/schemas/communitySchemas';
import type { CharacterSummary } from '../schemas/profileSchemas';
import { characterDisplayImages } from '../characterDisplayImage';

export function characterPortraitUrl(character: CharacterSummary) {
  return characterDisplayImages(character)[0]?.src || null;
}

export function characterGalleryImageUrl(character: CharacterSummary) {
  const gallerySources = ['owner_generation', 'owner_selected_generation', 'featured_work', 'owner_selected_work'];
  return gallerySources.includes(character.displayImageSource || '') ? character.displayImageUrl || null : null;
}

export function characterDestinations(character: Pick<CharacterSummary, 'handoffAvailable' | 'destinationCapabilities'>) {
  if (!character.handoffAvailable) return [];
  return (['fashion_blueprint', 'scene_builder'] as const)
    .filter(destination => character.destinationCapabilities.includes(destination));
}

export function characterUseLabel(value: string) {
  const keys: Record<string, string> = {
    fashion: 'character-profiles.uses.fashion',
    scene_story: 'character-profiles.uses.scene',
    general: 'character-profiles.uses.general'
  };
  return { key: keys[value], fallback: value.replace(/[._/-]+/g, ' ').trim() };
}

export function characterImageMoments(posts: CommunityPost[]) {
  return posts.filter(post => post.postType === 'image' && post.visibility === 'public'
    && (!post.status || ['active', 'published'].includes(post.status))
    && Boolean(post.thumbnailUrl || post.imageUrl)).slice(0, 3);
}
