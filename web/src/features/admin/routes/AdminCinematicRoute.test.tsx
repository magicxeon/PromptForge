import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminCinematicRoute } from './AdminCinematicRoute';

const mocks = vi.hoisted(() => ({ projects: vi.fn(), tasks: vi.fn(), capabilities: vi.fn() }));
vi.mock('../api/cinematicOperationsApi', () => ({
  listOperationalCinematicProjects: mocks.projects,
  listOperationalVideoTasks: mocks.tasks,
  getOperationalVideoCapabilities: mocks.capabilities
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'usr_support', role: 'support' } }) }));

const testI18n = i18n.createInstance();

describe('AdminCinematicRoute', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({ lng: 'en', resources: { en: { admin: {} } }, ns: ['admin'] });
  });

  it('renders non-Cinematic provider tasks and applies search to the capability catalog', async () => {
    mocks.projects.mockResolvedValue({ items: [], hasMore: false, nextCursor: null, totalApprox: 0 });
    mocks.tasks.mockResolvedValue({ items: [{ id: 'videotask_playground', projectId: null, sceneId: null, shotId: null, providerId: 'modelark', modelId: 'seedance', status: 'failed', supportReference: 'support_1' }], hasMore: false, nextCursor: null, totalApprox: 1 });
    mocks.capabilities.mockResolvedValue({ models: [
      { providerId: 'modelark', modelId: 'seedance', displayName: 'Seedance', qualificationStatus: 'qualified', pricingStatus: 'active', paidRoutingEnabled: true },
      { providerId: 'gemini', modelId: 'veo', displayName: 'Veo', qualificationStatus: 'qualified', pricingStatus: 'active', paidRoutingEnabled: true }
    ] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><I18nextProvider i18n={testI18n}><MemoryRouter><AdminCinematicRoute /></MemoryRouter></I18nextProvider></QueryClientProvider>);

    expect(await screen.findByText('videotask_playground / modelark/seedance')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText('admin.cinematic.searchPlaceholder'), { target: { value: 'veo' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.cinematic.search' }));
    await waitFor(() => expect(screen.getByText('Veo')).toBeVisible());
    expect(screen.queryByText('Seedance')).not.toBeInTheDocument();
  });
});
