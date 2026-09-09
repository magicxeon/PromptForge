import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LookSheetEnhancementPanel } from './LookSheetEnhancementPanel';
import { useLookSheetRender, lookSheetRenderKey, type EnhancementSelection } from '../../generation/hooks/useLookSheetRender';
import type { GenerationRequestDraft } from '../../generation/api/generationApi';
import { ApiError } from '../../../lib/api/apiError';
const api = vi.hoisted(() => ({ quoteLookSheetEnhancement: vi.fn(), executeLookSheetEnhancement: vi.fn(), readLookSheetEnhancement: vi.fn(),
  estimateGeneration: vi.fn(), submitGeneration: vi.fn(), actor: 'owner' }));
vi.mock('../../generation/api/lookSheetEnhancementApi', () => api);
vi.mock('../../generation/api/generationApi', async importOriginal => ({ ...await importOriginal<object>(),
  estimateGeneration: api.estimateGeneration, submitGeneration: api.submitGeneration }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const draft: GenerationRequestDraft = { provider: 'fixture', submodel: 'fixture', prompt: 'Original complete brief',
  aspectRatio: '3:4', imageResolution: '1K', outputCount: 1, generationMode: 'character-sheet', generationSurface: 'playground', references: {},
  lookSheetDefinition: { schemaVersion: 1, name: 'Mira', ageYears: 24, appearance: 'Dark hair', situation: 'Market seller', outfit: 'Shirt', personality: 'Warm' } };
const quote = { id: 'enh-fixture', status: 'quoted', credits: 4, expiresAt: '2099-01-01', artifactExpiresAt: '2099-01-01', errorCode: null, prompt: null };
const success = { ...quote, status: 'succeeded', prompt: 'Enhanced complete brief' };
function Harness({ input = draft, initial = null }: { input?: GenerationRequestDraft; initial?: EnhancementSelection | null }) {
  const [enabled, setEnabled] = useState(false);
  const [operation, setOperation] = useState(initial);
  const state = useLookSheetRender({ draft: input, pricedDraft: input, valid: true,
    control: { enabled, operation, onEnabledChange: setEnabled, onOperation: setOperation } });
  return <><LookSheetEnhancementPanel state={state} onEnabledChange={setEnabled} />
    <button disabled={!enabled || state.blocked || state.stage !== 'idle'} onClick={() => void state.submit(input, 10).catch(() => {})}>Generate</button>
    <output data-testid="operation">{JSON.stringify(operation)}</output></>;
}
function setup(initial: EnhancementSelection | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><Harness initial={initial} /></QueryClientProvider>);
  return { ...view, change: (input: GenerationRequestDraft) => view.rerender(<QueryClientProvider client={client}><Harness input={input} /></QueryClientProvider>) };
}
async function enable() {
  fireEvent.click(screen.getByRole('switch'));
  await waitFor(() => expect(screen.getByText('Generate')).not.toBeDisabled());
}
beforeEach(() => {
  vi.clearAllMocks(); api.actor = 'owner';
  api.quoteLookSheetEnhancement.mockResolvedValue(quote);
  api.readLookSheetEnhancement.mockResolvedValue({ ...quote, status: 'dispatching' });
  api.executeLookSheetEnhancement.mockResolvedValue(success);
  api.estimateGeneration.mockResolvedValue({ estimate: { estimateId: 'image-price', estimatedCredits: 10, expiresAt: '2099-01-01' },
    account: { availableCredits: 100, canAfford: true } });
  api.submitGeneration.mockResolvedValue({ jobId: 'job', status: 'queued' });
});

describe('one-click Look Sheet enhancement', () => {
  it('toggle quotes for free; only Generate performs text then image and retains source', async () => {
    setup(); await enable();
    expect(api.quoteLookSheetEnhancement).toHaveBeenCalledTimes(1);
    expect(api.executeLookSheetEnhancement).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(api.submitGeneration).toHaveBeenCalledTimes(1));
    expect(api.executeLookSheetEnhancement).toHaveBeenCalledTimes(1);
    expect(api.submitGeneration).toHaveBeenCalledWith(expect.objectContaining({ lookSheetEnhancementId: quote.id, prompt: draft.prompt }), 'image-price', expect.any(String));
    expect(screen.getByLabelText('lookSheet.enhancement.review', { selector: 'textarea' })).toHaveValue(success.prompt);
  });
  it('shows processing at toggle, prevents duplicate clicks, then resumes the canonical image API', async () => {
    let finish!: (value: typeof success) => void;
    api.executeLookSheetEnhancement.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    setup(); await enable();
    fireEvent.click(screen.getByText('Generate')); fireEvent.click(screen.getByText('Generate'));
    await screen.findByText('lookSheet.auto.enhancing');
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(api.submitGeneration).not.toHaveBeenCalled();
    finish(success);
    await waitFor(() => expect(api.submitGeneration).toHaveBeenCalledTimes(1));
    expect(api.executeLookSheetEnhancement).toHaveBeenCalledTimes(1);
  });
  it('missing price blocks paid execution', async () => {
    api.quoteLookSheetEnhancement.mockRejectedValue(new Error('unpriced'));
    setup(); fireEvent.click(screen.getByRole('switch'));
    await screen.findByRole('alert');
    expect(screen.getByText('Generate')).toBeDisabled();
    expect(api.executeLookSheetEnhancement).not.toHaveBeenCalled();
  });
  it('checks the combined balance before spending on text', async () => {
    api.estimateGeneration.mockResolvedValue({ estimate: { estimateId: 'image-price', estimatedCredits: 10 }, account: { availableCredits: 12, canAfford: true } });
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByText('lookSheet.auto.insufficient');
    expect(api.executeLookSheetEnhancement).not.toHaveBeenCalled();
    expect(api.submitGeneration).not.toHaveBeenCalled();
  });
  it('unknown text outcome offers status recovery without another paid call', async () => {
    api.executeLookSheetEnhancement.mockRejectedValue(new Error('connection lost'));
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('lookSheet.enhancement.refresh'));
    await waitFor(() => expect(api.readLookSheetEnhancement).toHaveBeenCalled());
    expect(api.executeLookSheetEnhancement).toHaveBeenCalledTimes(1);
    expect(api.submitGeneration).not.toHaveBeenCalled();
  });
  it('known enhancement failure never falls back to image generation', async () => {
    api.executeLookSheetEnhancement.mockResolvedValue({ ...quote, status: 'failed' });
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByText('lookSheet.auto.enhancementStopped');
    expect(api.submitGeneration).not.toHaveBeenCalled();
  });
  it('reuses a completed artifact after reload without another text fee', async () => {
    api.readLookSheetEnhancement.mockResolvedValue(success);
    setup({ id: quote.id, requestKey: lookSheetRenderKey(draft) }); await enable();
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(api.submitGeneration).toHaveBeenCalledTimes(1));
    expect(api.executeLookSheetEnhancement).not.toHaveBeenCalled();
    expect(api.quoteLookSheetEnhancement).not.toHaveBeenCalled();
  });
  it('image price increase stops after retaining delivered text', async () => {
    api.estimateGeneration.mockResolvedValueOnce({ estimate: { estimatedCredits: 10 }, account: { availableCredits: 100, canAfford: true } })
      .mockResolvedValueOnce({ estimate: { estimatedCredits: 15 }, account: { availableCredits: 100, canAfford: true } });
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByText('lookSheet.auto.priceChanged');
    expect(api.submitGeneration).not.toHaveBeenCalled();
    expect(screen.getByTestId('operation').textContent).toContain(quote.id);
  });
  it('uncertain image submission retains and replays its exact request ID', async () => {
    api.submitGeneration.mockRejectedValueOnce(new Error('lost image response'));
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByText('Generate')).not.toBeDisabled());
    const first = api.submitGeneration.mock.calls[0];
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(api.submitGeneration).toHaveBeenCalledTimes(2));
    expect(api.submitGeneration.mock.calls[1]).toEqual(first);
    expect(api.executeLookSheetEnhancement).toHaveBeenCalledTimes(1);
  });
  it('actor switch during enhancement cannot submit an image for another account', async () => {
    let finish!: (value: typeof success) => void;
    api.executeLookSheetEnhancement.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByText('lookSheet.auto.enhancing');
    api.actor = 'other'; finish(success);
    await waitFor(() => expect(api.executeLookSheetEnhancement).toHaveBeenCalledTimes(1));
    expect(api.submitGeneration).not.toHaveBeenCalled();
  });
  it('known pre-reservation image rejection refreshes its quote without buying text again', async () => {
    api.submitGeneration.mockRejectedValueOnce(new ApiError({ status: 409, code: 'credit_estimate_expired', message: 'expired' }));
    setup(); await enable(); fireEvent.click(screen.getByText('Generate'));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByText('Generate')).not.toBeDisabled());
    const firstId = api.submitGeneration.mock.calls[0]?.[2];
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => expect(api.submitGeneration).toHaveBeenCalledTimes(2));
    expect(api.submitGeneration.mock.calls[1]?.[2]).not.toBe(firstId);
    expect(api.executeLookSheetEnhancement).toHaveBeenCalledTimes(1);
  });
  it('changing aspect ratio invalidates the old artifact before generating', async () => {
    api.readLookSheetEnhancement.mockResolvedValue(success);
    const view = setup({ id: quote.id, requestKey: lookSheetRenderKey(draft) }); await enable();
    view.change({ ...draft, aspectRatio: '16:9' });
    await waitFor(() => expect(api.quoteLookSheetEnhancement).toHaveBeenCalled());
    expect(api.executeLookSheetEnhancement).not.toHaveBeenCalled();
  });
});
