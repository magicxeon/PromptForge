import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaygroundVideoExperience } from './PlaygroundVideoWorkspace';
import { videoModelCapabilitySchema } from '../../generation/schemas/videoGenerationSchemas';

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  quote: vi.fn(),
  submit: vi.fn(),
  task: vi.fn(),
  recent: vi.fn(),
  actor: 'alice',
  ask: false,
}));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => mocks.actor }));
vi.mock('../../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({ isSuccess: true, isFetching: false, data: { confirmCreditUsage: mocks.ask }, save: vi.fn() }) }));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: mocks.actor } }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { id?: string; number?: number }) =>
      values?.id ? `${key}: ${values.id}` : values?.number ? `${key}: ${values.number}` : key,
  }),
}));
vi.mock('../../generation/api/videoGenerationApi', () => ({
  getVideoCapabilityCatalog: mocks.catalog,
  quoteVideoGeneration: mocks.quote,
  submitVideoGeneration: mocks.submit,
  getVideoTask: mocks.task,
  listRecentVideoTasks: mocks.recent,
}));
vi.mock('../../../components/generation/PromptEditor', () => ({
  PromptEditor: (p: {
    value: string;
    onChange: (value: string) => void;
    primaryFooter: ReactNode;
    primaryMaxLength: number;
  }) => (
    <>
      <textarea
        aria-label="Prompt"
        maxLength={p.primaryMaxLength}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
      />
      {p.primaryFooter}
    </>
  ),
}));
vi.mock('../../../components/generation/PlaygroundGenerationWorkspace', () => ({
  PlaygroundGenerationWorkspace: (p: Record<string, ReactNode>) => (
    <>
      {p.prompt}
      {p.result}
      {p.engine}
      {p.actions}
    </>
  ),
}));
vi.mock('../../../components/generation/VideoEngineTargetPanel', () => ({
  VideoEngineTargetPanel: (p: { selectedModel: { modelId: string } }) => (
    <div data-testid="model">{p.selectedModel.modelId}</div>
  ),
}));
vi.mock('./PlaygroundVideoSources', () => ({
  PlaygroundVideoSources: (p: { onChange: (value: unknown) => void; invalidFrame?: boolean }) => (
    <button
      data-invalid-frame={String(Boolean(p.invalidFrame))}
      onClick={() =>
        p.onChange({
          referenceImageUrl: '/outputs/frame.png',
          lookSheet: {
            url: '/outputs/look.png',
            assetId: 'look',
            name: 'Look',
          },
        })
      }
    >
      Attach
    </button>
  ),
}));
vi.mock('../../../components/media/GenerationVideoViewer', () => ({
  GenerationVideoViewer: () => null,
}));
vi.mock('./resultRegionFocus', () => ({
  focusResultRegionAfterLayout: () => () => {},
}));
const model = videoModelCapabilitySchema.parse({
  providerId: 'modelark',
  modelId: 'seedance',
  displayName: 'Seedance',
  operations: ['text_to_video'],
  inputModes: ['text_to_video', 'image_to_video', 'multimodal_reference'],
  referenceImageLimit: 9,
  supportsOrderedImageReferences: true,
  qualificationStatus: 'internal_testing',
  paidRoutingEnabled: false,
  testingRoutingEnabled: true,
  durations: [6],
  resolutions: ['480p'],
  aspectRatios: ['9:16'],
  audioModes: ['none'],
});
beforeEach(() => {
  mocks.ask = false;
  vi.clearAllMocks();
  localStorage.clear();
  mocks.actor = 'alice';
  mocks.catalog.mockResolvedValue({
    models: [model],
    comparison: { enabled: false },
  });
  mocks.quote.mockResolvedValue({
    estimate: {
      estimateId: 'quote',
      estimatedCredits: 1,
      expiresAt: '2099-01-01',
    },
    account: { canAfford: true },
    requestFingerprint: 'quote-fingerprint',
  });
  mocks.recent.mockResolvedValue({ items: [] });
  mocks.submit.mockResolvedValue({ id: 'task-one', status: 'provider_queued' });
  mocks.task.mockResolvedValue({ id: 'task-one', status: 'provider_queued' });
});
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PlaygroundVideoExperience />
    </QueryClientProvider>,
  );
}
async function ready(operation = 'character_to_video') {
  await screen.findByTestId('model');
  fireEvent.click(
    screen.getByRole('button', {
      name: `playground.video.operation.${operation}`,
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Small motion' },
  });
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /playground.video.generate/ }),
    ).toBeEnabled(),
  );
}

describe('Playground video execution controls', () => {
  it('asks before spending and sends the confirmed quote only after consent', async () => {
    mocks.ask = true; mount(); await ready();
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    expect(mocks.submit).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' })); });
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'ui.creditConsent.confirm' }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit.mock.calls[0]?.[0]).toMatchObject({ estimateId: 'quote', requestFingerprint: 'quote-fingerprint' });
  });
  it('uses the server-owned 8000-character Video prompt limit', async () => {
    mocks.catalog.mockResolvedValue({
      models: [model],
      comparison: { enabled: false },
      promptMaximumCharacters: 8000,
    });
    mount();
    const prompt = await screen.findByLabelText('Prompt');
    expect(prompt).toHaveAttribute('maxlength', '8000');
  });
  it('refreshes an expired quote without submitting a paid request', async () => {
    mocks.quote.mockResolvedValue({
      estimate: { estimateId: 'expired', estimatedCredits: 1, expiresAt: '2000-01-01' },
      account: { canAfford: true }, requestFingerprint: 'old',
    });
    mount();
    await ready();
    const previous = mocks.quote.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    await waitFor(() => expect(mocks.quote.mock.calls.length).toBeGreaterThan(previous));
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('quotes and submits the same two references and fingerprint, blocking duplicates/active tasks', async () => {
    mount();
    await ready();
    const quoteInput = mocks.quote.mock.calls.at(-1)?.[0];
    expect(quoteInput.references).toHaveLength(2);
    const button = screen.getByRole('button', {
      name: /playground.video.generate/,
    });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(mocks.submit.mock.calls[0]?.[0]).toMatchObject({
      ...quoteInput,
      requestFingerprint: 'quote-fingerprint',
      estimateId: 'quote',
    });
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByTestId('model')).toHaveTextContent('seedance');
  });
  it('does not silently switch models or quote unsupported reference modes', async () => {
    mocks.catalog.mockResolvedValue({
      models: [{ ...model, inputModes: ['text_to_video'] }],
      comparison: { enabled: false },
    });
    mount();
    await screen.findByTestId('model');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'playground.video.operation.character_to_video',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Attach' }));
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Test' },
    });
    expect(
      screen.getAllByText('playground.video.references.unsupportedMode')[0],
    ).toBeVisible();
    expect(screen.getByTestId('model')).toHaveTextContent('seedance');
    expect(mocks.quote).not.toHaveBeenCalled();
  });
  it('sends only first frame in image mode and shows terminal provider request ID', async () => {
    mocks.submit.mockResolvedValue({
      id: 'failed-task',
      status: 'failed',
      providerError: {
        code: 'video_provider_input_image_rejected',
        providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
        providerRequestId: 'request-123',
        referenceIssue: { contentIndex: 1, referenceIndex: 0, reason: 'possible_real_person' },
      },
    });
    mocks.task.mockResolvedValue({
      id: 'failed-task',
      status: 'failed',
      providerError: {
        code: 'video_provider_input_image_rejected',
        providerCode: 'InputImageSensitiveContentDetected.PrivacyInformation',
        providerRequestId: 'request-123',
        referenceIssue: { contentIndex: 1, referenceIndex: 0, reason: 'possible_real_person' },
      },
    });
    mount();
    await ready('image_to_video');
    fireEvent.click(
      screen.getByRole('button', { name: /playground.video.generate/ }),
    );
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
    expect(mocks.submit.mock.calls[0]?.[0].references).toEqual([
      {
        role: 'first_frame',
        purpose: 'opening_frame',
        referenceImageUrl: '/outputs/frame.png',
      },
    ]);
    expect(await screen.findByText(/request-123/)).toBeVisible();
    expect(screen.getByText('playground.video.providerError.possibleRealPerson: 1')).toBeVisible();
    const source = screen.getByRole('button', { name: 'Attach' });
    expect(source).toHaveAttribute('data-invalid-frame', 'true');
    fireEvent.click(source);
    await waitFor(() => expect(source).toHaveAttribute('data-invalid-frame', 'false'));
  });

  it('presents provider processing as a bounded friendly task status', async () => {
    mocks.submit.mockResolvedValue({ id: 'task-processing', status: 'provider_processing' });
    mocks.task.mockResolvedValue({ id: 'task-processing', status: 'provider_processing' });
    mount();
    await screen.findByTestId('model');
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Small motion' },
    });
    await waitFor(() => expect(
      screen.getByRole('button', { name: /playground.video.generate/ }),
    ).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /playground.video.generate/ }));
    expect(await screen.findByText('playground.video.taskStatus.processing')).toBeVisible();
    expect(screen.getByTitle('task-processing')).toHaveTextContent('task-processing');
    expect(screen.queryByText(/provider_processing\s*·/)).not.toBeInTheDocument();
  });
});
