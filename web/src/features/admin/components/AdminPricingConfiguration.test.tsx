import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPricingConfiguration } from './AdminPricingConfiguration';
import type { AdminConfigurationState } from '../schemas/adminSchemas';

const mocks = vi.hoisted(() => ({ save: vi.fn(), publish: vi.fn(), refresh: vi.fn() }));
vi.mock('../api/adminApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/adminApi')>(),
  createAdminPricingDraft: mocks.save, publishAdminPricingRevision: mocks.publish
}));
const testI18n = i18n.createInstance();
const values = { profitMarkupPercentByMedia: { text: 20, image: 30, video: 40 },
  baseActiveRevisionId: null, commandId: 'draft_command', reason: 'Retail policy review' };
const draft = { id: 'cfgrev_fixture', scope: 'pricing' as const, status: 'draft', version: 1, values,
  createdAt: '2026-10-02T00:00:00Z', createdByUserId: 'usr_admin', validation: {} };
const state: AdminConfigurationState = { activeRevisionIds: {},
  activePricing: { pricingPolicyVersion: 'policy-v1', revisionId: null,
    profitMarkupPercentByMedia: { text: 30, image: 30, video: 30 } }, revisions: [draft] };

function show(options: Partial<{ state: AdminConfigurationState; canEdit: boolean; canPublish: boolean }> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><I18nextProvider i18n={testI18n}>
    <AdminPricingConfiguration state={state} canEdit canPublish onRefresh={mocks.refresh} {...options} />
  </I18nextProvider></QueryClientProvider>);
}

describe('Admin Pricing configuration', () => {
  beforeAll(async () => { await testI18n.use(initReactI18next).init({ lng: 'en', ns: ['admin', 'react-ui'],
    resources: { en: { admin: {}, 'react-ui': {} } } }); });
  beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue(draft); mocks.publish.mockResolvedValue({ ...draft, status: 'active', version: 2 }); });

  it('saves three numeric markup fields with a reason without changing active pricing', async () => {
    show();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'admin.pricing.text (%)' }), { target: { value: '20' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'admin.pricing.video (%)' }), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('admin.providers.reason'), { target: { value: values.reason } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.control.saveDraft' }));
    expect(await screen.findByText('admin.pricing.saved')).toBeVisible();
    expect(mocks.save.mock.calls[0]?.[0]).toEqual({ ...values, commandId: expect.stringMatching(/^pricing_/) });
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(screen.getAllByText('30%')).toHaveLength(3);
    expect(screen.getByText('admin.pricing.fixedImage')).toBeVisible();
  });

  it('requires confirmation and publishes the selected immutable version/baseline', async () => {
    show();
    fireEvent.change(screen.getByLabelText('admin.pricing.draft'), { target: { value: draft.id } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.pricing.publish' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(mocks.publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'admin.pricing.publish' }).at(-1)!);
    expect(await screen.findByText('admin.pricing.published')).toBeVisible();
    expect(mocks.publish).toHaveBeenCalledWith(draft.id, { expectedVersion: 1, baseActiveRevisionId: null,
      commandId: expect.stringMatching(/^pricing_publish_/), reason: values.reason });
  });

  it('keeps failed publication visible and retries the same command without changing active values', async () => {
    mocks.publish.mockRejectedValueOnce(new Error('Publication failed'));
    show();
    fireEvent.change(screen.getByLabelText('admin.pricing.draft'), { target: { value: draft.id } });
    const confirm = () => {
      fireEvent.click(screen.getByRole('button', { name: 'admin.pricing.publish' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'admin.pricing.publish' }).at(-1)!);
    };
    confirm();
    expect(await screen.findByRole('alert')).toHaveTextContent('Publication failed');
    const firstCommand = mocks.publish.mock.calls[0];
    expect(screen.getAllByText('30%')).toHaveLength(3);
    confirm();
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledTimes(2));
    expect(mocks.publish.mock.calls[1]).toEqual(firstCommand);
  });

  it('blocks stale drafts and missing active-policy contracts', () => {
    show({ state: { ...state, activePricing: { ...state.activePricing!, revisionId: 'cfgrev_changed' } } });
    fireEvent.change(screen.getByLabelText('admin.pricing.draft'), { target: { value: draft.id } });
    expect(screen.getByRole('button', { name: 'admin.pricing.publish' })).toBeDisabled();
    expect(screen.getByText('admin.pricing.stale')).toBeVisible();
  });

  it.each([{ canEdit: false, canPublish: false }, { canEdit: true, canPublish: false },
    { state: { ...state, activePricing: undefined }, canEdit: true, canPublish: true }])('enforces read-only and publication-gated states %#', options => {
    show(options);
    fireEvent.change(screen.getByLabelText('admin.pricing.draft'), { target: { value: draft.id } });
    expect(screen.getByRole('button', { name: 'admin.pricing.publish' })).toBeDisabled();
    if (options.canEdit === false || options.state) expect(screen.getByRole('button', { name: 'admin.control.saveDraft' })).toBeDisabled();
  });

  it('rejects invalid amounts even when form validity is bypassed', async () => {
    const view = show();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'admin.pricing.text (%)' }), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText('admin.providers.reason'), { target: { value: values.reason } });
    fireEvent.submit(view.container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('admin.pricing.invalid');
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
