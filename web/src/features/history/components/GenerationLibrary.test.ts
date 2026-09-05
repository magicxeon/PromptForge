import { describe, expect, it } from 'vitest';
import { buildVisibleMedia } from './GenerationLibrary';
import type { HistoryItem } from '../schemas/historySchemas';
import type { VideoTask } from '../../generation/schemas/videoGenerationSchemas';
import type { ComparisonListItem } from '../../comparisons/schemas/comparisonSchemas';

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

const comparison = (id: string, updatedAt: number): ComparisonListItem => ({
  id,
  name: id,
  description: '',
  createdAt: updatedAt - 1,
  updatedAt,
  runCount: 1,
  status: 'completed',
  completedCount: 2,
  slotCount: 2,
  collectionIds: [],
  providers: [],
  models: [],
  previewImages: []
});

describe('GenerationLibrary media projection', () => {
  it('merges Images and Videos by creation time without changing either source record', () => {
    const result = buildVisibleMedia(
      [image('image_old', Date.parse('2026-08-20T00:00:00Z'))],
      [video('video_new', '2026-08-21T00:00:00Z')],
      [comparison('comparison_newest', Date.parse('2026-08-22T00:00:00Z'))],
      'all'
    );

    expect(result.map(item => `${item.mediaType}:${item.item.id}`)).toEqual([
      'comparison:comparison_newest',
      'video:video_new',
      'image:image_old'
    ]);
  });

  it('keeps Image and Video filters mutually exclusive', () => {
    const images = [image('image_one', 1)];
    const videos = [video('video_one', '2026-08-21T00:00:00Z')];
    const comparisons = [comparison('comparison_one', 2)];
    expect(buildVisibleMedia(images, videos, comparisons, 'image').map(item => item.mediaType)).toEqual(['image']);
    expect(buildVisibleMedia(images, videos, comparisons, 'video').map(item => item.mediaType)).toEqual(['video']);
    expect(buildVisibleMedia(images, videos, comparisons, 'comparison').map(item => item.mediaType)).toEqual(['comparison']);
  });

  it('groups a Comparison child in All while retaining it in Images', () => {
    const child = {
      ...image('comparison_child', 3),
      comparisonSetId: 'comparison_one'
    };
    const comparisons = [comparison('comparison_one', 4)];

    expect(buildVisibleMedia([child], [], comparisons, 'all').map(item => item.mediaType)).toEqual([
      'comparison'
    ]);
    expect(buildVisibleMedia([child], [], comparisons, 'image').map(item => item.mediaType)).toEqual([
      'image'
    ]);
  });

  it('does not hide an orphaned Comparison child when its Set is not loaded', () => {
    const child = {
      ...image('comparison_child', 3),
      comparisonSetId: 'comparison_not_loaded'
    };

    expect(buildVisibleMedia([child], [], [], 'all').map(item => item.mediaType)).toEqual([
      'image'
    ]);
  });
});
