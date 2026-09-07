import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { GeneratedVideoImagePicker } from './GeneratedVideoImagePicker';
const mocks = vi.hoisted(() => ({ history: vi.fn(), select: vi.fn(), actor: 'alice' }));
vi.mock('../../history/api/historyApi', () => ({ listHistory: mocks.history }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: mocks.actor } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
const image = { id: 'job_1', imageUrl: '/outputs/job_1.png', submodel: 'Gemini', provider: 'gemini', timestamp: 1 };
beforeEach(() => { vi.clearAllMocks(); mocks.actor = 'alice'; });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><GeneratedVideoImagePicker open onClose={() => {}} onSelect={mocks.select} /></QueryClientProvider>);
  return client;
}
it('lists images across providers, excludes unavailable media and selects the original URL', async () => {
  mocks.history.mockResolvedValue({ items: [image,
    { ...image, id: 'job_2', imageUrl: '/outputs/job_2.webp', submodel: 'Muse' },
    { ...image, id: 'failed', status: 'failed' },
    { ...image, id: 'private', artifactVisibility: 'template_owner_only' },
    { ...image, id: 'video', imageUrl: '/outputs/video.mp4' }], hasMore: false });
  const client = mount();
  fireEvent.click(await screen.findByRole('button', { name: /Muse/ }));
  expect(mocks.select.mock.calls[0]?.[0].imageUrl).toBe('/outputs/job_2.webp');
  expect(screen.getAllByRole('img')).toHaveLength(2);
  expect(client.getQueryCache().getAll()[0]?.queryKey).toContain('alice');
});
it('paginates and retries a failed page without selecting stale images', async () => {
  mocks.history.mockResolvedValueOnce({ items: [image], hasMore: true, nextCursor: 'next' })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ items: [{ ...image, id: 'job_next', submodel: 'OpenAI' }], hasMore: false });
  mount();
  await screen.findByRole('button', { name: /Gemini/ });
  fireEvent.click(screen.getByRole('button', { name: 'playground.video.trusted.next' }));
  expect(await screen.findByRole('alert')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Gemini/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'playground.video.references.retry' }));
  await screen.findByRole('button', { name: /OpenAI/ });
  await waitFor(() => expect(mocks.history).toHaveBeenLastCalledWith('next'));
});
