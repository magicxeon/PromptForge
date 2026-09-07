import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import { TemplateGalleryHero } from './TemplateGalleryHero';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const original = communityPostSchema.parse({ id: 'original', title: 'Original title', postType: 'template',
  imageUrl: '/original.jpg', visibility: 'public', status: 'published', creator: {}, engagementSummary: {} });
const creations = Array.from({ length: 3 }, (_, i) => communityPostSchema.parse({ id: `work-${i}`,
  postType: 'image', imageUrl: `/work-${i}.jpg`, visibility: 'public', status: 'published', creator: {}, engagementSummary: {} }));

it('places the original far right and highest-liked creation next to it without changing actions', () => {
  const { container } = render(<MemoryRouter><TemplateGalleryHero selection={{ original, creations }} /></MemoryRouter>);
  expect([...container.querySelectorAll('.template-hero__images img')].map(img => img.getAttribute('src')))
    .toEqual(['/work-2.jpg', '/work-1.jpg', '/work-0.jpg', '/original.jpg']);
  expect(container.querySelector('.template-hero__images')?.lastElementChild).toHaveClass('template-hero__image--original');
  expect(screen.getByRole('link', { name: /Original title/ })).toHaveAttribute('href', '/explore/templates/original');
  expect(screen.getByRole('link', { name: 'community.templates.create' })).toHaveAttribute('href', '/create/studio/scene');
  expect(screen.getByRole('link', { name: 'community.templates.browse' })).toHaveAttribute('href', '/explore/templates#template-catalog');
});

it('returns to the compact header when the current family becomes ineligible', () => {
  const { container, rerender } = render(<MemoryRouter><TemplateGalleryHero selection={{ original, creations }} /></MemoryRouter>);
  rerender(<MemoryRouter><TemplateGalleryHero selection={null} /></MemoryRouter>);
  expect(container.querySelector('.template-gallery-hero--illustrated')).toBeNull();
  expect(container.querySelector('.template-hero__images')).toBeNull();
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('community.templates.title');
});
