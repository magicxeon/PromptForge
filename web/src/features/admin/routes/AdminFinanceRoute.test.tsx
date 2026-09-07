import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFinanceRoute } from './AdminFinanceRoute';
import en from '../../../../../client/i18n/locales/en/admin.json';
import {
  financeInventorySchema,
  financeReportSchema,
} from '../schemas/financeSchemas';

const mocks = vi.hoisted(() => ({
  inventory: vi.fn(),
  report: vi.fn(),
  drafts: vi.fn(),
  save: vi.fn(),
  actor: { userId: 'usr_admin', role: 'admin' },
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: mocks.actor }),
}));
vi.mock('../api/financeApi', () => ({
  getFinanceInventory: mocks.inventory,
  getFinanceReport: mocks.report,
  getFinanceDrafts: mocks.drafts,
  createFinanceDraft: mocks.save,
}));
const language = i18n.createInstance();
const inventory = {
  revision: 'a'.repeat(64),
  retailPolicyVersion: 'original-policy',
  effectiveAt: null,
  pricingFxThbPerUsd: '35',
  creditsPerThbAssumption: '10',
  rows: [
    {
      id: 'meta-muse/muse-image-1.0/image',
      providerId: 'meta-muse',
      providerName: 'Meta Muse',
      modelId: 'muse-image-1.0',
      displayName: 'Muse Image',
      mediaType: 'image',
      enabled: true,
      workflows: ['playground.image'],
      coverage: 'configured',
      rates: [{ dimension: 'providerCostUsd', value: '0.01' }],
      retail: [{ dimension: 'publishedCredits', value: '15' }],
      rateVersion: 'original-policy',
      effectiveAt: null,
      billingMetric: 'returned_image',
      sourceDate: null,
      source: null,
    },
  ],
};
const report = {
  asOf: '2026-09-07T12:00:00.000Z',
  revision: 'r1',
  timezone: 'Asia/Bangkok',
  year: 2026,
  month: 0,
  page: 1,
  pageSize: 50,
  sourceStatus: 'available',
  invalidCount: 0,
  unallocatedCount: 0,
  totals: { capturedCredits: 15, returnedCredits: 0, eventCount: 1 },
  periods: [
    {
      period: '2026-09',
      status: 'available',
      capturedCredits: 15,
      returnedCredits: 0,
      eventCount: 1,
      cashReceived: null,
      supplierPayments: null,
      usageCost: null,
      profit: null,
      closingBalance: null,
    },
  ],
  events: [
    {
      ledgerEntryId: 'event-one',
      operationType: 'capture',
      amountCredits: 15,
      createdAt: '2026-09-07T12:00:00.000Z',
      period: '2026-09',
      providerId: 'meta-muse',
      modelId: 'muse-image-1.0',
      pricingPolicyVersion: 'original-policy',
    },
  ],
  hasMore: false,
  sources: { credits: 'available', payments: 'unavailable' },
};

beforeAll(async () => {
  await language
    .use(initReactI18next)
    .init({
      lng: 'en',
      resources: { en: { admin: en } },
      keySeparator: false,
      interpolation: { prefix: '{', suffix: '}', escapeValue: false },
    });
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.actor.role = 'admin';
  mocks.inventory.mockResolvedValue(financeInventorySchema.parse(inventory));
  mocks.report.mockResolvedValue(financeReportSchema.parse(report));
  mocks.drafts.mockResolvedValue({
    publicationAvailable: false,
    reason: 'gate',
    revisions: [],
  });
  mocks.save.mockResolvedValue({
    id: 'cfgrev-test',
    scope: 'finance_provider_cost',
    status: 'draft',
    createdAt: report.asOf,
    values: {},
  });
});
function renderRoute() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([
    { path: '*', element: <AdminFinanceRoute /> },
  ]);
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={language}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('Finance workspace', () => {
  it('shows ledger evidence and unknown money without changing neighboring Admin navigation', async () => {
    renderRoute();
    expect(await screen.findByText('event-one')).toBeVisible();
    expect(screen.getByText('Partial financial coverage')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeEnabled();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(1);
    expect(screen.getByRole('link', { name: 'Providers' })).toHaveAttribute(
      'href',
      '/admin/providers',
    );
    expect(screen.getByRole('link', { name: 'Finance' })).toHaveAttribute(
      'href',
      '/admin/finance',
    );
  });
  it('does not fetch Finance data or render controls for Support', () => {
    mocks.actor.role = 'support';
    renderRoute();
    expect(screen.getByText('Finance requires Admin access')).toBeVisible();
    expect(mocks.inventory).not.toHaveBeenCalled();
    expect(mocks.report).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Export Excel' })).not.toBeInTheDocument();
  });
  it('allows rate inspection and a typed draft while publication remains gated', async () => {
    const user = userEvent.setup();
    renderRoute();
    await screen.findByText('event-one');
    await user.click(screen.getByRole('tab', { name: 'Provider rates' }));
    expect(screen.getByText('Muse Image')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Prepare draft' }));
    await screen.findByText('Prepare cost revision');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Proposed unit cost (USD)'), {
      target: { value: '0.02' },
    });
    fireEvent.change(screen.getByLabelText('Version label'), {
      target: { value: 'planned-v2' },
    });
    fireEvent.change(screen.getByLabelText('Intended effective date'), {
      target: { value: '2026-10-01T09:00' },
    });
    fireEvent.change(
      screen.getByLabelText('Source evidence / document reference'),
      { target: { value: 'Test document' } },
    );
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Supplier rate proposal' },
    });
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0]?.[0]).toMatchObject({
      scope: 'finance_provider_cost',
      values: {
        unitCostUsd: '0.02',
        baselineRevision: inventory.revision,
        intendedEffectiveAt: '2026-10-01T02:00:00.000Z',
      },
    });
    expect(await screen.findByText('Draft saved')).toBeVisible();
  });
  it('keeps provider account drafts distinct from funding balances or top-up actions', async () => {
    const user = userEvent.setup();
    renderRoute();
    await screen.findByText('event-one');
    await user.click(screen.getByRole('tab', { name: 'Provider accounts' }));
    expect(
      await screen.findByText('No confirmed supplier funding records'),
    ).toBeVisible();
    expect(screen.getByLabelText('Billing mode')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /buy|top up/i }),
    ).not.toBeInTheDocument();
  });
  it('shows a retry path after a report failure', async () => {
    mocks.report.mockRejectedValue(new Error('unavailable'));
    renderRoute();
    expect(
      await screen.findByText(
        'Refresh to load a new snapshot. Check the selected period if the error persists.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
  });
  it('keeps an unsaved draft when the user cancels a tab change', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderRoute();
    await screen.findByText('event-one');
    await user.click(screen.getByRole('tab', { name: 'Versions & schedule' }));
    fireEvent.change(screen.getByLabelText('Version label'), {
      target: { value: 'Unsaved version' },
    });
    await user.click(screen.getByRole('tab', { name: 'Provider rates' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText('Version label')).toHaveValue(
      'Unsaved version',
    );
    confirm.mockRestore();
  });
});
