import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { videoQuoteSchema, type VideoModelCapability } from '../../features/generation/schemas/videoGenerationSchemas';
import { VideoEngineTargetPanel } from './VideoEngineTargetPanel';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, args?: { count?: number }) =>
  args?.count === undefined ? key : `${key} ${args.count}` }) }));

const model: VideoModelCapability = {
  providerId: 'gemini', modelId: 'veo-test', displayName: 'Veo Test',
  operations: ['text_to_video'], commercialOperations: ['playground_video'], inputModes: ['text_to_video'],
  durationControlMode: 'exact', durations: [4, 8], resolutions: ['720p', '1080p'],
  aspectRatios: ['9:16', '16:9'], audioModes: ['generated'], referenceImageLimit: 0,
  supportsFirstFrame: false, supportsLastFrame: false, qualificationStatus: 'internal_testing',
  paidRoutingEnabled: false, testingRoutingEnabled: true
};
const seedance = { ...model, providerId: 'modelark', modelId: 'seedance-test', displayName: 'Seedance Test' };
function props(overrides: Partial<ComponentProps<typeof VideoEngineTargetPanel>> = {}) {
  return { models: [model], selectedModel: model, aspectRatio: '9:16', resolution: '720p',
    durationSeconds: 8, audioMode: 'generated', comparisonEnabled: false, comparisonActive: false,
    quoteLoading: false, estimatedCredits: 27, canAfford: true,
    onModelChange: vi.fn(), onAspectRatioChange: vi.fn(), onResolutionChange: vi.fn(),
    onDurationChange: vi.fn(), onAudioModeChange: vi.fn(), onComparisonChange: vi.fn(), ...overrides };
}

describe('VideoEngineTargetPanel', () => {
  it('preserves comparison availability and callbacks with the inline model action', () => {
    const callbacks = props({ inlineModelAction: true });
    const view = render(<VideoEngineTargetPanel {...callbacks} />);
    expect(screen.getByRole('button', { name: 'playground.action.compare' })).toBeDisabled();
    view.rerender(<VideoEngineTargetPanel {...callbacks} comparisonEnabled comparisonActive />);
    const compare = screen.getByRole('button', { name: 'playground.action.compare' });
    expect(compare.closest('.generation-model-picker__heading')).not.toBeNull();
    expect(compare).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(compare);
    expect(callbacks.onComparisonChange).toHaveBeenCalledOnce();
    view.rerender(<VideoEngineTargetPanel {...callbacks} showComparisonAction={false} />);
    expect(screen.queryByRole('button', { name: 'playground.action.compare' })).not.toBeInTheDocument();
  });

  it('opts into a compact qualification notice without hiding catalog blockers', () => {
    const view = render(<VideoEngineTargetPanel {...props({ compactNotices: true, showQuote: false })} />);
    const details = view.container.querySelector<HTMLDetailsElement>('.engine-target-panel__video-notice--compact')!;
    expect(details.open).toBe(false);
    expect(screen.getByText('playground.options.internalTestingOnly')).toBeVisible();
    expect(screen.getByText('playground.video.internalTestingNotice')).toBeInTheDocument();
    expect(screen.queryByText('27 playground.comparison.credits')).not.toBeInTheDocument();
    view.rerender(<VideoEngineTargetPanel {...props({ compactNotices: true, selectedModel: { ...model, pricingStatus: 'unavailable' } })} />);
    expect(screen.getByRole('status')).toHaveTextContent('playground.video.catalogOnlyNotice');
    view.rerender(<VideoEngineTargetPanel {...props()} />);
    expect(view.container.querySelector('.engine-target-panel__video-notice--compact')).toBeNull();
    expect(screen.getByText('playground.video.internalTestingNotice')).toBeVisible();
  });

  it('shows native output values and emits exact typed callbacks', () => {
    const callbacks = props();
    render(<VideoEngineTargetPanel {...callbacks} />);
    expect(screen.getByRole('button', { name: 'playground.engine.model' })).toHaveTextContent('Veo Test');
    expect(screen.getByRole('combobox', { name: 'playground.engine.aspect' })).toHaveValue('9:16');
    fireEvent.change(screen.getByRole('combobox', { name: 'playground.video.duration' }), { target: { value: '4' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'playground.engine.resolution' }), { target: { value: '1080p' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'playground.engine.aspect' }), { target: { value: '16:9' } });
    expect(callbacks.onDurationChange).toHaveBeenCalledWith(4);
    expect(callbacks.onResolutionChange).toHaveBeenCalledWith('1080p');
    expect(callbacks.onAspectRatioChange).toHaveBeenCalledWith('16:9');
    expect(screen.getByRole('button', { name: 'playground.action.compare' })).toBeDisabled();
    expect(screen.getByText('27 playground.comparison.credits')).toBeVisible();
  });

  it('keeps incompatible catalog entries discoverable but disabled', async () => {
    const callbacks = props({ catalogModels: [model, seedance] });
    render(<VideoEngineTargetPanel {...callbacks} />);
    await userEvent.click(screen.getByRole('button', { name: 'playground.engine.model' }));
    const unavailable = screen.getByRole('menuitemradio', { name: /Seedance Test/ });
    expect(unavailable).toHaveAttribute('aria-disabled', 'true');
    expect(unavailable).toHaveTextContent('playground.video.promptOnlyProvider');
    await userEvent.click(unavailable);
    expect(callbacks.onModelChange).not.toHaveBeenCalled();
  });

  it('selects across providers with one combined callback', async () => {
    const callbacks = props({ models: [model, seedance] });
    render(<VideoEngineTargetPanel {...callbacks} />);
    await userEvent.click(screen.getByRole('button', { name: 'playground.engine.model' }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Seedance Test/ }));
    expect(callbacks.onModelChange).toHaveBeenCalledExactlyOnceWith('modelark:seedance-test');
  });

  it('uses a switch only for the binary none/generated audio contract', () => {
    const callbacks = props({ selectedModel: { ...model, audioModes: ['none', 'generated'] }, audioMode: 'none' });
    const view = render(<VideoEngineTargetPanel {...callbacks} />);
    const audio = screen.getByRole('switch', { name: 'playground.video.audio' });
    expect(audio).not.toBeChecked();
    fireEvent.click(audio);
    expect(callbacks.onAudioModeChange).toHaveBeenCalledWith('generated');
    view.rerender(<VideoEngineTargetPanel {...callbacks} audioMode="generated" />);
    expect(audio).toBeChecked();
    fireEvent.click(audio);
    expect(callbacks.onAudioModeChange).toHaveBeenLastCalledWith('none');
    view.rerender(<VideoEngineTargetPanel {...callbacks} selectedModel={model} audioMode="generated" />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'playground.video.audio' })).toHaveValue('generated');
  });

  it('retains locked aspect, consumer header, summary and action', () => {
    render(<VideoEngineTargetPanel {...props({ compact: true, aspectRatioLocked: true, title: 'Render motion',
      description: 'Selected Shot', showComparisonAction: false, summary: <p>First frame ready</p>,
      footer: <button>Generate clip</button> })} />);
    const aspect = screen.getByRole('combobox', { name: 'playground.engine.aspect' });
    expect(aspect).toBeDisabled();
    expect(aspect).toHaveValue('9:16');
    expect(aspect).toHaveAccessibleDescription('playground.options.locked');
    expect(screen.getByRole('heading', { name: 'Render motion' })).toBeVisible();
    expect(screen.getByText('First frame ready')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generate clip' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'playground.action.compare' })).not.toBeInTheDocument();
  });

  it('shows the shared spinner during refresh instead of an old quote', () => {
    const view = render(<VideoEngineTargetPanel {...props({ quoteLoading: true, maximumCreditEstimate: true })} />);
    expect(screen.getByText('playground.estimate.loading')).toBeVisible();
    expect(view.container.querySelector('[data-processing-spinner="true"]')).toBeInTheDocument();
    expect(view.container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText(/27/)).not.toBeInTheDocument();
    view.rerender(<VideoEngineTargetPanel {...props({ maximumCreditEstimate: true, canAfford: false, quoteError: 'Quote expired' })} />);
    expect(screen.getByText('playground.options.maximumCredits 27')).toBeVisible();
    expect(screen.getByText('playground.estimate.insufficient')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Quote expired');
    expect(view.container.querySelector('[data-processing-spinner]')).not.toBeInTheDocument();
  });

  it('hides unsupported outputs and prices for unavailable contracts', () => {
    render(<VideoEngineTargetPanel {...props({ selectedModel: { ...model, pricingStatus: 'unavailable' } })} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('27 playground.comparison.credits')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('playground.video.catalogOnlyNotice');
  });

  it('retains POC credits without adding an unverified badge', () => {
    render(<VideoEngineTargetPanel {...props({ selectedModel: { ...seedance, developmentPocUnverified: true,
      developmentPocCredits: 1, developmentPocWarningCode: 'video_model_unverified_development_poc' },
      models: [seedance], estimatedCredits: 1 })} />);
    expect(screen.getByText('1 playground.comparison.credits')).toBeVisible();
    expect(screen.queryByText('playground.video.unverifiedPocNotice')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.video.unverifiedPocBadge')).not.toBeInTheDocument();
  });

  it('parses actual-usage maximum quotes without rejecting the server charge mode', () => {
    const quote = { estimate: { estimateId: 'usage', estimatedCredits: 27, chargeMode: 'actual_usage',
      expiresAt: '2099-01-01T00:00:00Z', billingStatus: 'estimated', breakdown: { maximumCredits: 27 } },
      account: { availableCredits: 100, canAfford: true }, requestFingerprint: 'current-inputs' };
    expect(videoQuoteSchema.parse(quote)).toEqual(quote);
    expect(videoQuoteSchema.safeParse({ ...quote, estimate: { ...quote.estimate, chargeMode: 'unknown' } }).success).toBe(false);
  });
});
