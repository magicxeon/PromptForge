import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminControlPlaneRoute } from './AdminControlPlaneRoute';

const mocks = vi.hoisted(() => ({ capabilities: vi.fn(), providerHealth: vi.fn(), creditReconciliation: vi.fn(), content: vi.fn() }));
vi.mock('../api/adminApi', async importOriginal => {
  const original = await importOriginal<typeof import('../api/adminApi')>();
  return {
    ...original,
    getAdminCapabilities: mocks.capabilities,
    getAdminProviderHealth: mocks.providerHealth,
    getAdminCreditReconciliation: mocks.creditReconciliation,
    listAdminContent: mocks.content
  };
});
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'usr_admin', role: 'admin' } }) }));

const testI18n = i18n.createInstance();

describe('AdminControlPlaneRoute', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({ lng: 'en', resources: { en: { admin: {} } }, ns: ['admin'] });
  });

  it('shows active safe capabilities and disabled production commands without rendering command controls', async () => {
    mocks.capabilities.mockResolvedValue({
      generatedAt: '2026-08-26T00:00:00.000Z', environment: 'test',
      capabilities: {
        supportCases: { id: 'supportCases', enabled: true, mode: 'active', env: 'SUPPORT_CASES_ENABLED', prerequisites: [], reason: null },
        financialCommands: { id: 'financialCommands', enabled: false, mode: 'production_gated', env: 'ADMIN_FINANCIAL_COMMANDS_ENABLED', prerequisites: ['postgresql'], reason: 'Production prerequisites are not ready.' }
      }
    });
    mocks.providerHealth.mockResolvedValue({ checkedAt: '2026-08-26T00:00:00.000Z', schemaVersion: 1, defaultProvider: 'gemini', note: 'Configuration health only.', providers: [] });
    mocks.creditReconciliation.mockResolvedValue({ generatedAt: '2026-08-26T00:00:00.000Z', counts: { reserved: 2 }, reservations: [], mutationAvailable: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><I18nextProvider i18n={testI18n}><MemoryRouter><AdminControlPlaneRoute /></MemoryRouter></I18nextProvider></QueryClientProvider>);
    expect(await screen.findByText('supportCases')).toBeVisible();
    expect(screen.getByText('financialCommands')).toBeVisible();
    expect(screen.getByText('Production prerequisites are not ready.')).toBeVisible();
    expect(screen.getByText('reserved: 2')).toBeVisible();
    expect(screen.queryByRole('button', { name: /refund/i })).not.toBeInTheDocument();
  });

  it('uses the shared cursor pagination contract for bounded content results', async () => {
    mocks.content
      .mockResolvedValueOnce({ items: [{ id: 'post_first', type: 'post' }], nextCursor: 'next_page', hasMore: true })
      .mockResolvedValueOnce({ items: [{ id: 'post_second', type: 'post' }], nextCursor: null, hasMore: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><I18nextProvider i18n={testI18n}><MemoryRouter><AdminControlPlaneRoute /></MemoryRouter></I18nextProvider></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'admin.control.tab.content' }));
    expect(await screen.findByText('post_first')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'admin.pagination.next' }));
    await waitFor(() => expect(screen.getByText('post_second')).toBeVisible());
    expect(mocks.content).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'next_page' }));
  });
});
