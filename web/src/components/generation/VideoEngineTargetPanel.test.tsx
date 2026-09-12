import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VideoModelCapability } from '../../features/generation/schemas/videoGenerationSchemas';
import { VideoEngineTargetPanel } from './VideoEngineTargetPanel';

const model: VideoModelCapability = {
  providerId: 'gemini',
  modelId: 'veo-test',
  displayName: 'Veo Test',
  operations: ['text_to_video'],
  commercialOperations: ['playground_video'],
  inputModes: ['text_to_video'],
  durationControlMode: 'exact',
  durations: [8],
  resolutions: ['720p'],
  aspectRatios: ['9:16', '16:9'],
  audioModes: ['generated'],
  referenceImageLimit: 0,
  supportsFirstFrame: false,
  supportsLastFrame: false,
  qualificationStatus: 'internal_testing',
  paidRoutingEnabled: false,
  testingRoutingEnabled: true
};

const seedance: VideoModelCapability = {
  ...model,
  providerId: 'modelark',
  modelId: 'seedance-test',
  displayName: 'Seedance Test'
};

describe('VideoEngineTargetPanel', () => {
  it('maps Video controls into the canonical Image Engine structure', () => {
    const { container } = render(
      <VideoEngineTargetPanel
        models={[model]}
        selectedModel={model}
        aspectRatio="9:16"
        resolution="720p"
        durationSeconds={8}
        audioMode="generated"
        comparisonEnabled={false}
        comparisonActive={false}
        quoteLoading={false}
        estimatedCredits={27}
        canAfford
        onModelChange={vi.fn()}
        onAspectRatioChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onDurationChange={vi.fn()}
        onAudioModeChange={vi.fn()}
        onComparisonChange={vi.fn()}
      />
    );

    expect(container.querySelector('.engine-target-panel--studio')).toBeInTheDocument();
    expect(container.querySelector('.studio-step-badge')).toBeInTheDocument();
    expect(container.querySelector('.engine-target-panel__controls')).toBeInTheDocument();
    expect(container.querySelector('.engine-target-panel__model-grid')).toBeInTheDocument();
    expect(container.querySelector('.engine-target-panel__output-grid')).toBeInTheDocument();
    expect(container.querySelector('.engine-target-panel__aspect')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compare/i })).toBeDisabled();
    expect(screen.getByText(/27/)).toBeInTheDocument();
  });

  it('keeps Seedance discoverable when the active source mode cannot route it', () => {
    render(
      <VideoEngineTargetPanel
        models={[model]}
        catalogModels={[model, seedance]}
        selectedModel={model}
        aspectRatio="9:16"
        resolution="720p"
        durationSeconds={8}
        audioMode="generated"
        comparisonEnabled={false}
        comparisonActive={false}
        quoteLoading={false}
        onModelChange={vi.fn()}
        onAspectRatioChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onDurationChange={vi.fn()}
        onAudioModeChange={vi.fn()}
        onComparisonChange={vi.fn()}
      />
    );

    const option = screen.getByRole('option', { name: /BytePlus ModelArk \(Seedance\)/i });
    expect(option).toBeDisabled();
  });

  it('shows only models owned by the selected provider', () => {
    render(
      <VideoEngineTargetPanel
        models={[model, seedance]}
        selectedModel={seedance}
        aspectRatio="9:16"
        resolution="720p"
        durationSeconds={8}
        audioMode="generated"
        comparisonEnabled={false}
        comparisonActive={false}
        quoteLoading={false}
        onModelChange={vi.fn()}
        onAspectRatioChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onDurationChange={vi.fn()}
        onAudioModeChange={vi.fn()}
        onComparisonChange={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const modelSelect = selects[1];
    expect(modelSelect).toHaveTextContent('Seedance Test');
    expect(modelSelect).not.toHaveTextContent('Veo Test');
  });

  it('shows the Credit estimate without adding a POC notice or model suffix', () => {
    const pocModel: VideoModelCapability = {
      ...seedance,
      developmentPocUnverified: true,
      developmentPocCredits: 1,
      developmentPocWarningCode: 'video_model_unverified_development_poc'
    };
    render(
      <VideoEngineTargetPanel
        models={[pocModel]}
        selectedModel={pocModel}
        aspectRatio="9:16"
        resolution="720p"
        durationSeconds={8}
        audioMode="generated"
        comparisonEnabled={false}
        comparisonActive={false}
        quoteLoading={false}
        estimatedCredits={1}
        canAfford
        onModelChange={vi.fn()}
        onAspectRatioChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onDurationChange={vi.fn()}
        onAudioModeChange={vi.fn()}
        onComparisonChange={vi.fn()}
      />
    );

    const modelSelect = screen.getAllByRole('combobox')[1];
    expect(modelSelect).not.toHaveTextContent('playground.video.unverifiedPocBadge');
    expect(screen.queryByText('playground.video.unverifiedPocNotice')).not.toBeInTheDocument();
    expect(screen.getByText('1 playground.comparison.credits')).toBeInTheDocument();
  });

  it('supports a compact consumer-owned header and footer without changing selection ownership', () => {
    const onAspectRatioChange = vi.fn();
    const { container } = render(
      <VideoEngineTargetPanel
        models={[model]}
        selectedModel={model}
        aspectRatio="9:16"
        resolution="720p"
        durationSeconds={8}
        audioMode="generated"
        comparisonEnabled={false}
        comparisonActive={false}
        quoteLoading={false}
        compact
        aspectRatioLocked
        title="Render motion"
        description="Selected Shot"
        badge={<span>Render</span>}
        showComparisonAction={false}
        summary={<p>First frame ready</p>}
        footer={<button type="button">Generate clip</button>}
        onModelChange={vi.fn()}
        onAspectRatioChange={onAspectRatioChange}
        onResolutionChange={vi.fn()}
        onDurationChange={vi.fn()}
        onAudioModeChange={vi.fn()}
        onComparisonChange={vi.fn()}
      />
    );

    expect(container.querySelector('.engine-target-panel--compact')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Render motion' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /compare/i })).not.toBeInTheDocument();
    expect(screen.getByText('First frame ready')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Generate clip' })).toBeVisible();
    expect(screen.getByRole('button', { name: '16:9' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '9:16' })).toBeEnabled();
  });
});
