import { describe, expect, it } from 'vitest';
import { buildVisibleMedia } from './GenerationLibrary';
import type { HistoryItem } from '../schemas/historySchemas';
import type { VideoTask } from '../../generation/schemas/videoGenerationSchemas';

const image = (id: string, timestamp: number): HistoryItem => ({
  id,
  timestamp,
  prompt: '',
  imageUrl: `/outputs/${id}.jpg`,
  provider: 'gemini',
  submodel: 'image-model',
  mode: 'normal',
  referencedFaceJobIds: [],
  referencedStyleJobIds: [],
  referencedCharacterJobIds: [],
  referencedOutfitJobIds: []
});

const video = (id: string, createdAt: string): VideoTask => ({
  id,
  createdAt,
  status: 'completed',
  outputAsset: { publicUrl: `/outputs/${id}.mp4` }
});

describe('GenerationLibrary media projection', () => {
  it('merges Images and Videos by creation time without changing either source record', () => {
    const result = buildVisibleMedia(
      [image('image_old', Date.parse('2026-08-20T00:00:00Z'))],
      [video('video_new', '2026-08-21T00:00:00Z')],
      'all'
    );

    expect(result.map(item => `${item.mediaType}:${item.item.id}`)).toEqual([
      'video:video_new',
      'image:image_old'
    ]);
  });

  it('keeps Image and Video filters mutually exclusive', () => {
    const images = [image('image_one', 1)];
    const videos = [video('video_one', '2026-08-21T00:00:00Z')];
    expect(buildVisibleMedia(images, videos, 'image').map(item => item.mediaType)).toEqual(['image']);
    expect(buildVisibleMedia(images, videos, 'video').map(item => item.mediaType)).toEqual(['video']);
  });
});
