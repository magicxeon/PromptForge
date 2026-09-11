import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneratedLookSourceField } from './GeneratedLookSourceField';
import type { TrustedVideoSource } from '../../features/generation/api/trustedVideoSources';

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../features/generation/api/trustedVideoSources', () => ({ listTrustedVideoSources: (...args: unknown[]) => api.list(...args) }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'owner' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('../media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: (props: {
  src: string; alt: string; renderResolved?: (src: string) => unknown;
}) => props.renderResolved ? props.renderResolved(props.src) : <img src={props.src} alt={props.alt} /> }));

const source: TrustedVideoSource = { id: 'source', modelId: 'Seedream 5.0 Pro', previewUrl: '/outputs/sheet.png',
  generationMode: 'text_to_image', generatedAt: null, expiresAt: new Date(Date.now() + 86400000).toISOString(),
  eligible: true, reason: null, policyVersion: 'test', category: 'look-sheet' };

function mount() {
  const ready = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Screen() {
    const [value, setValue] = useState<TrustedVideoSource | null>(null);
    return <GeneratedLookSourceField value={value} onChange={setValue} disabled={false} onPreviewReady={ready} />;
  }
  render(<QueryClientProvider client={queryClient}><Screen /></QueryClientProvider>);
  return { ready, queryClient };
}

describe('Generated Look source selection', () => {
  beforeEach(() => api.list.mockReset());

  it('uses actor-scoped eligible pages and gates confirmation on the full preview', async () => {
    api.list.mockResolvedValue({ items: [source, { ...source, id: 'scene', modelId: 'Scene', category: 'image' }, { ...source, id: 'untagged', modelId: 'Untagged', category: undefined }, { ...source, id: 'expired', modelId: 'Expired', expiresAt: '2020-01-01' }], hasMore: false });
    const { ready, queryClient } = mount();
    fireEvent.click(await screen.findByRole('button', { name: /Seedream 5.0 Pro/i }));
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
    expect(screen.queryByText('Scene')).not.toBeInTheDocument();
    expect(screen.queryByText('Untagged')).not.toBeInTheDocument();
    expect(ready).toHaveBeenLastCalledWith(false);
    fireEvent.load(screen.getByAltText('cinematic.lookDraft.generatedPreview'));
    expect(ready).toHaveBeenLastCalledWith(true);
    expect(queryClient.getQueryCache().getAll()[0]?.queryKey).toEqual(['trusted-video-sources', 'owner', 'look-sheet', null]);
    fireEvent.click(screen.getByRole('button', { name: /changeGenerated/i }));
    expect(ready).toHaveBeenLastCalledWith(false);
  });

  it('shows error with retry and preserves pagination through an empty page', async () => {
    api.list.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [], hasMore: true, nextCursor: 'next' })
      .mockResolvedValue({ items: [source], hasMore: false });
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('generatedError');
    fireEvent.click(screen.getByRole('button', { name: /generatedRetry/ }));
    expect(await screen.findByText('cinematic.lookDraft.generatedEmpty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /generatedNext/ }));
    await waitFor(() => expect(api.list).toHaveBeenCalledWith('next', 'look-sheet'));
    expect(await screen.findByRole('button', { name: /Seedream/ })).toBeInTheDocument();
  });
});
