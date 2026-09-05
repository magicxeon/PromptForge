import { describe, expect, it } from 'vitest';
import { comparisonPageSchema, comparisonRunSchema } from './comparisonSchemas';

describe('comparison list summary schema', () => {
  it('preserves preview media and aggregate run fields without synthesizing runs', () => {
    const page = comparisonPageSchema.parse({
      items: [{
        id: 'comparison_1',
        name: 'Fashion providers',
        description: '',
        createdAt: 100,
        updatedAt: 200,
        runCount: 1,
        status: 'completed',
        completedCount: 3,
        slotCount: 3,
        providers: ['gemini', 'openai'],
        models: ['gemini-image', 'gpt-image'],
        previewImages: [{
          jobId: 'job_1',
          thumbnailUrl: '/api/history/job_1/thumbnail',
          imageUrl: '/outputs/job_1.png',
          width: 512,
          height: 512
        }],
        latestRun: {
          id: 'run_1',
          status: 'completed',
          estimatedTotalCredit: 75,
          actualTotalCredit: 75,
          createdAt: 150,
          completedAt: 190,
          slotCount: 3
        }
      }],
      hasMore: false
    });

    expect(page.items[0]).toMatchObject({
      status: 'completed',
      slotCount: 3,
      completedCount: 3
    });
    expect(page.items[0]?.previewImages[0]?.imageUrl).toBe('/outputs/job_1.png');
    expect('runs' in (page.items[0] || {})).toBe(false);
  });
});

describe('comparison result schema', () => {
  it('preserves delivered dimensions and requested output settings', () => {
    const run = comparisonRunSchema.parse({
      id: 'run_dimensions',
      status: 'completed',
      createdAt: 100,
      configurationSnapshot: {
        aspectRatio: '6:8',
        imageResolution: '2K'
      },
      slots: [{
        id: 'slot_dimensions',
        provider: 'meta-muse',
        model: 'muse-image-1.0',
        status: 'completed',
        result: {
          imageUrl: '/outputs/muse.webp',
          mimeType: 'image/webp',
          width: 1344,
          height: 1792
        }
      }]
    });

    expect(run.configurationSnapshot).toMatchObject({
      aspectRatio: '6:8',
      imageResolution: '2K'
    });
    expect(run.slots[0]?.result).toMatchObject({
      width: 1344,
      height: 1792
    });
  });
});
