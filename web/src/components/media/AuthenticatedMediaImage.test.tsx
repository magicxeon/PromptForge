import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiMediaBlob } from '../../lib/api/apiClient';
import { AuthenticatedMediaImage } from './AuthenticatedMediaImage';

vi.mock('../../lib/api/apiClient', () => ({
  apiMediaBlob: vi.fn()
}));

vi.mock('../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_alice' } })
}));

describe('AuthenticatedMediaImage', () => {
  beforeEach(() => {
    vi.mocked(apiMediaBlob).mockReset();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:authenticated-character-image'),
      revokeObjectURL: vi.fn()
    });
  });

  it('loads owner-only media through the authenticated API boundary', async () => {
    vi.mocked(apiMediaBlob).mockResolvedValue(new Blob(['image'], { type: 'image/webp' }));
    const source = '/api/character-profiles/char_1/featured-image-candidates/generation_result/job_1/media';

    render(<AuthenticatedMediaImage src={source} alt="Featured Character" />);

    await waitFor(() => expect(screen.getByRole('img', {
      name: 'Featured Character'
    })).toHaveAttribute('src', 'blob:authenticated-character-image'));
    expect(apiMediaBlob).toHaveBeenCalledWith(source, expect.any(AbortSignal));
  });
});
