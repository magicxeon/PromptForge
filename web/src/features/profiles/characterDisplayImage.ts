import type { CharacterSummary } from './schemas/profileSchemas';
import type { DisplayMediaSource } from '../../components/media/DisplayMediaImage';

export function characterDisplayImages(character: CharacterSummary): DisplayMediaSource[] {
  const sources: DisplayMediaSource[] = [];
  const add = (src: string | null | undefined, fit: 'contain' | 'cover') => {
    if (src && !sources.some(item => item.src === src)) sources.push({ src, fit });
  };
  add(character.displayImageUrl, ['canonical_sheet', 'owner_canonical_sheet'].includes(character.displayImageSource || '') ? 'contain' : 'cover');
  add(character.thumbnailUrl, 'contain');
  add(character.faceThumbnailUrl, 'contain');
  add(character.imageUrl, 'contain');
  return sources;
}
