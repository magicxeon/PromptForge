import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CharacterFeaturedImagePicker } from './CharacterFeaturedImagePicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

vi.mock('../media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-authenticated-media="true" />
  )
}));

describe('CharacterFeaturedImagePicker', () => {
  it('lets the owner select an eligible Character image and restore automatic selection', () => {
    const onSelect = vi.fn();
    const onUseAutomatic = vi.fn();
    render(
      <CharacterFeaturedImagePicker
        candidates={[{
          id: 'generation_result:job_1',
          sourceType: 'generation_result',
          sourceId: 'job_1',
          generationResultId: 'job_1',
          postId: null,
          ownership: 'owner',
          title: 'Gallery walk',
          imageUrl: '/api/character-profiles/char_1/featured-image-candidates/generation_result/job_1/media',
          thumbnailUrl: '/api/character-profiles/char_1/featured-image-candidates/generation_result/job_1/media',
          createdAt: '2026-08-04T00:00:00.000Z'
        }]}
        mode="manual"
        selectedSourceType={null}
        selectedSourceId={null}
        displaySource="featured_work"
        onSelect={onSelect}
        onUseAutomatic={onUseAutomatic}
      />
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'character-profiles.featured.select'
    }));
    fireEvent.click(screen.getByRole('button', {
      name: 'character-profiles.featured.useAutomatic'
    }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'generation_result',
      sourceId: 'job_1'
    }));
    expect(onUseAutomatic).toHaveBeenCalledOnce();
    expect(screen.getByRole('img', { name: 'Gallery walk' })).toHaveAttribute(
      'data-authenticated-media',
      'true'
    );
  });
});
