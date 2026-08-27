import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminOperationsRoute } from './AdminOperationsRoute';

const mocks = vi.hoisted(() => ({ listOperations: vi.fn() }));

vi.mock('../api/adminApi', async importOriginal => {
  const original = await importOriginal<typeof import('../api/adminApi')>();
  return { ...original, listAdminOperations: mocks.listOperations };
});
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_support', role: 'support' } })
}));

const testI18n = i18n.createInstance();

describe('AdminOperationsRoute', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { admin: {} } },
      ns: ['admin'],
      interpolation: { escapeValue: false }
    });
  });

  it('loads URL-backed Video attention filters and renders safe operation metadata', async () => {
    mocks.listOperations.mockResolvedValue({
      items: [{
        id: 'videotask_1', mediaType: 'video', ownerUsername: 'user_demo',
        providerId: 'modelark', modelId: 'seedance', status: 'failed',
        updatedAt: '2026-08-25T00:00:00.000Z'
      }],
      nextCursor: null,
      hasMore: false,
      totalApprox: 1
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><I18nextProvider i18n={testI18n}><MemoryRouter initialEntries={['/admin/operations?mediaType=video&status=attention']}><AdminOperationsRoute /></MemoryRouter></I18nextProvider></QueryClientProvider>);

    await waitFor(() => expect(mocks.listOperations).toHaveBeenCalledWith({ mediaType: 'video', status: 'attention', search: '', visibility: '', cursor: null }));
    expect(await screen.findByText('videotask_1')).toBeVisible();
    expect(screen.getByText('modelark / seedance')).toBeVisible();
    expect(screen.getAllByText('failed')).toHaveLength(2);
  });
});
