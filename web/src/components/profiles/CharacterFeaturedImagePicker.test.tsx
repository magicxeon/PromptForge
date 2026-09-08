import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('requires display consent for an unlinked image and keeps failed selection retryable', async () => {
    const candidate = { id: 'generation_result:old', sourceType: 'generation_result' as const,
      sourceId: 'old', generationResultId: 'old', postId: null, ownership: 'owner' as const,
      title: 'Old image', imageUrl: '/authorized-image', createdAt: '2026-09-08', linkedToCharacter: false };
    const onSelect = vi.fn().mockRejectedValueOnce(new Error('save failed')).mockResolvedValueOnce(undefined);
    render(<CharacterFeaturedImagePicker candidates={[candidate]} scope="own" mode="auto"
      selectedSourceType={null} selectedSourceId={null} onSelect={onSelect} onUseAutomatic={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.select' }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.delete.cancel' }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.select' }));
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('character-profiles.featured.saveFailed');
    expect(onSelect).toHaveBeenCalledWith(candidate, true);
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.confirm' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('supports source changes, empty-page pagination and retry without selecting a cover', () => {
    const scope = vi.fn(), previous = vi.fn(), next = vi.fn(), retry = vi.fn(), select = vi.fn();
    render(<CharacterFeaturedImagePicker candidates={[]} mode="auto" scope="own" onScopeChange={scope}
      pageNumber={2} hasMore onPrevious={previous} onNext={next} error="network" onRetry={retry}
      selectedSourceType={null} selectedSourceId={null} onSelect={select} onUseAutomatic={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'linked' } });
    expect(scope).toHaveBeenCalledWith('linked');
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.next' }));
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.featured.retry' }));
    expect(next).toHaveBeenCalledOnce(); expect(previous).toHaveBeenCalledOnce(); expect(retry).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
  });

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
