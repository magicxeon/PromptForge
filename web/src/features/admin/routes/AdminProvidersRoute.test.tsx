import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProvidersRoute } from './AdminProvidersRoute';

const mocks = vi.hoisted(() => ({
  getControls: vi.fn(),
  applyControl: vi.fn(),
  actor: { userId: 'usr_admin', role: 'admin' }
}));

vi.mock('../api/adminApi', async importOriginal => {
  const original = await importOriginal<typeof import('../api/adminApi')>();
  return {
    ...original,
    getAdminProviderControls: mocks.getControls,
    applyAdminProviderControl: mocks.applyControl
  };
});
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: mocks.actor }) }));

const testI18n = i18n.createInstance();

describe('AdminProvidersRoute', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { admin: {} } },
      ns: ['admin']
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actor.role = 'admin';
    mocks.getControls.mockResolvedValue(controlState());
    mocks.applyControl.mockResolvedValue(controlState({ version: 2, updatedAt: '2026-09-05T01:00:00.000Z' }));
  });

  it('requires a reason before applying a provider-wide command', async () => {
    renderRoute();
    expect(await screen.findByText('ModelArk')).toBeVisible();
    const providerSwitch = screen.getAllByRole('switch')[0];
    expect(providerSwitch).toBeDefined();
    expect(providerSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(providerSwitch!);
    expect(screen.getByText('admin.providers.disableTitle')).toBeVisible();
    const confirm = screen.getByRole('button', { name: 'admin.providers.confirm' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('admin.providers.reasonPlaceholder'), {
      target: { value: 'Provider maintenance' }
    });
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.applyControl).toHaveBeenCalled());
    expect(mocks.applyControl.mock.calls.at(0)?.at(0)).toEqual(expect.objectContaining({
      targetType: 'provider', providerId: 'modelark', enabled: false,
      expectedVersion: 1, reason: 'Provider maintenance'
    }));
  });

  it('keeps provider controls read-only for Support', async () => {
    mocks.actor.role = 'support';
    mocks.getControls.mockResolvedValue(controlState({
      mutationAvailable: false,
      mutationReason: 'Support access is read-only.'
    }));
    renderRoute();
    expect(await screen.findByText('Support access is read-only.')).toBeVisible();
    expect(screen.getAllByRole('switch')[0]).toBeDisabled();
  });
});

function renderRoute() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter><AdminProvidersRoute /></MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function controlState(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    version: 1,
    updatedAt: null,
    mutationAvailable: true,
    mutationReason: null,
    workflows: [{ id: 'playground.image', mediaType: 'image' }],
    history: [],
    providers: [{
      providerId: 'modelark',
      displayName: 'ModelArk',
      configured: true,
      staticEnabled: true,
      mediaTypes: ['image'],
      masterOverride: null,
      runtimeEnabled: true,
      effectiveEnabled: true,
      disabledScope: null,
      reason: null,
      models: [{
        modelId: 'seedream-test',
        displayName: 'Seedream Test',
        configured: true,
        staticEnabled: true,
        routingEnabled: true,
        pricingStatus: 'priced',
        qualificationStatus: 'qualified',
        mediaTypes: ['image'],
        masterOverride: null,
        runtimeEnabled: true,
        effectiveEnabled: true,
        disabledScope: null,
        reason: null,
        workflows: [{
          id: 'playground.image', staticEnabled: true, override: null,
          runtimeEnabled: true, effectiveEnabled: true, disabledScope: null, reason: null
        }]
      }]
    }],
    ...overrides
  };
}
