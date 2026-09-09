import { describe, expect, it } from 'vitest';
import { comparisonRunSchema } from './schemas/comparisonSchemas';
import { comparisonAspectRatio, resolveComparisonLayout } from './comparisonLayout';
import parityCases from '../../../../test/fixtures/comparison-layout-v1.json';

const run = (sizes: Array<[number, number] | null>, aspectRatio?: string, status = 'completed') => comparisonRunSchema.parse({
  id: 'layout-run', createdAt: 1, status, configurationSnapshot: { aspectRatio },
  slots: sizes.map((size, i) => ({ id: `${i}`, status: 'completed', result: {
    imageUrl: `/outputs/${i}.png`, width: size?.[0], height: size?.[1]
  } }))
});

describe('comparison layout policy v1', () => {
  it('matches the versioned export parity fixtures', () => {
    for (const item of parityCases) expect(resolveComparisonLayout(run(item.sizes as Array<[number, number] | null>, item.aspectRatio))).toBe(item.expected);
  });
  it('stacks landscapes, keeps portrait, square, mixed and unknown in rows', () => {
    expect(resolveComparisonLayout(run([[1920, 1080], [1280, 720]]))).toBe('stacked');
    for (const sizes of [[[800, 1200]], [[800, 800]], [[1920, 1080], [800, 1200]], [null]] as Array<Array<[number, number] | null>>) {
      expect(resolveComparisonLayout(run(sizes))).toBe('side_by_side');
    }
  });
  it('uses submitted ratio only for missing dimensions or an active run', () => {
    expect(resolveComparisonLayout(run([null], '16:9'))).toBe('stacked');
    expect(resolveComparisonLayout(run([[800, 1200]], '16:9'))).toBe('side_by_side');
    expect(resolveComparisonLayout(run([[800, 1200]], '16:9', 'processing'))).toBe('stacked');
    for (const ratio of ['0:0', '16:0', 'bad', '-1:2']) expect(comparisonAspectRatio(ratio)).toBeNull();
  });
  it('checks off-page slots, respects explicit override and never stacks video', () => {
    const mixed = run([[1600, 900], [1600, 900], [1600, 900], [900, 1600]]);
    expect(resolveComparisonLayout(mixed)).toBe('side_by_side');
    expect(resolveComparisonLayout(mixed, 'stacked')).toBe('stacked');
    expect(resolveComparisonLayout({ ...mixed, mediaType: 'video' }, 'stacked')).toBe('side_by_side');
  });
});
