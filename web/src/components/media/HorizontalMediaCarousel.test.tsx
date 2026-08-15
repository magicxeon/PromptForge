import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HorizontalMediaCarousel } from './HorizontalMediaCarousel';

describe('HorizontalMediaCarousel', () => {
  it('renders a profile handoff after the preview items', () => {
    render(
      <MemoryRouter>
        <HorizontalMediaCarousel
          heading={<h2>History</h2>}
          ariaLabel="History previews"
          previousLabel="Previous"
          nextLabel="Next"
          viewAll={{ href: '/creators/user-demo/gallery', label: 'View all images' }}
        >
          <button type="button">Image one</button>
          <button type="button">Image two</button>
        </HorizontalMediaCarousel>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /view all images/i }))
      .toHaveAttribute('href', '/creators/user-demo/gallery');
  });

  it('moves forward by two measured item widths', () => {
    render(
      <MemoryRouter>
        <HorizontalMediaCarousel
          heading={<h2>Templates</h2>}
          ariaLabel="Template previews"
          previousLabel="Previous"
          nextLabel="Next"
        >
          <button type="button">One</button>
          <button type="button">Two</button>
          <button type="button">Three</button>
        </HorizontalMediaCarousel>
      </MemoryRouter>
    );

    const viewport = screen.getByRole('region', { name: 'Template previews' });
    const firstItem = viewport.querySelector<HTMLElement>('[data-carousel-item]');
    if (!firstItem) throw new Error('Expected a measured carousel item.');
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 220 },
      scrollWidth: { configurable: true, value: 680 },
      scrollLeft: { configurable: true, writable: true, value: 0 }
    });
    vi.spyOn(firstItem, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    const scrollBy = vi.fn();
    Object.defineProperty(viewport, 'scrollBy', { configurable: true, value: scrollBy });

    fireEvent.scroll(viewport);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 200 }));
  });
});
