import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ComparisonThumbnailGrid,
  comparisonThumbnailProfileId
} from './ComparisonThumbnailGrid';

describe('ComparisonThumbnailGrid', () => {
  it.each([1, 2, 3, 4])(
    'uses the deterministic %s-image layout',
    count => {
      const { container } = render(
        <ComparisonThumbnailGrid
          items={Array.from({ length: count }, (_, index) => ({
            id: `slot_${index + 1}`,
            thumbnailUrl: `/outputs/slot_${index + 1}.webp`
          }))}
        />
      );

      expect(container.firstElementChild).toHaveAttribute(
        'data-image-count',
        String(count)
      );
      expect(container.querySelectorAll('img')).toHaveLength(count);
      expect(comparisonThumbnailProfileId(count))
        .toBe(`comparison-card-${count}-person-focus`);
    }
  );

  it('falls back to the existing thumbnail when presentation loading fails', () => {
    const { container } = render(
      <ComparisonThumbnailGrid
        items={[{
          id: 'slot_1',
          presentationUrl: '/api/presentation/slot_1',
          thumbnailUrl: '/outputs/thumbnails/slot_1.webp'
        }]}
      />
    );
    const image = container.querySelector('img');

    expect(image).toHaveAttribute('src', '/api/presentation/slot_1');
    fireEvent.error(image as HTMLImageElement);
    expect(image).toHaveAttribute('src', '/outputs/thumbnails/slot_1.webp');
  });
});
