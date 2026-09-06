import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { CharacterGalleryHero } from './CharacterGalleryHero';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

it('bounds real identity previews and preserves the filter on catalog navigation', () => {
  const characters = Array.from({ length: 6 }, (_, i) => characterSummarySchema.parse({ id: `c${i}`, displayName: `Name ${i}`, faceThumbnailUrl: `/face-${i}.jpg`, displayImageUrl: `/gallery-${i}.jpg`, displayImageSource: 'owner_generation' }));
  render(<MemoryRouter initialEntries={['/explore/characters?creator=alice']}><CharacterGalleryHero characters={characters} /></MemoryRouter>);
  expect(screen.getAllByRole('img')).toHaveLength(4);
  expect(screen.getByRole('img', { name: 'Name 0' })).toHaveAttribute('src', '/gallery-0.jpg');
  expect(screen.getByRole('link', { name: 'Name 0' })).toHaveAttribute('href', '/characters/c0');
  expect(screen.getByRole('link', { name: 'character-profiles.gallery.browse' })).toHaveAttribute('href', '/explore/characters?creator=alice#character-catalog');
  expect(screen.getByRole('link', { name: 'character-profiles.gallery.create' })).toHaveAttribute('href', '/create/studio/character');
});

it('skips reference-only identities instead of showing face or canonical sheet images', () => {
  const characters = ['casting_preview', 'canonical_sheet', 'owner_selected_work'].map((source, i) =>
    characterSummarySchema.parse({ id: `c${i}`, displayName: source, faceThumbnailUrl: '/face.jpg', displayImageUrl: `/${source}.jpg`, displayImageSource: source }));
  render(<MemoryRouter><CharacterGalleryHero characters={characters} /></MemoryRouter>);
  expect(screen.getAllByRole('img')).toHaveLength(1);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/owner_selected_work.jpg');
  expect(screen.queryByRole('link', { name: 'canonical_sheet' })).not.toBeInTheDocument();
});

it('retains Studio entry without fabricated identity previews for an empty directory', () => {
  render(<MemoryRouter><CharacterGalleryHero characters={[]} /></MemoryRouter>);
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
});
