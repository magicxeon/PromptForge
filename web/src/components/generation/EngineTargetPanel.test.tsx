import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EngineTargetPanel } from './EngineTargetPanel';
import { imageModelUnavailableReason } from './engineTargetPanelHelpers';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const catalog: ProviderCatalog = {
  defaultProvider: 'existing', providers: [{
    id: 'existing', displayName: 'Existing', defaultModel: 'existing-image', models: [{
      id: 'existing-image', displayName: 'Existing Image', paidRoutingEnabled: true,
      capabilities: { imageGeneration: true, imageEdit: false, imageReferences: false, maxReferenceImages: 0,
        streaming: false, aspectRatios: ['1:1', '9:16'], resolutions: ['1K'] }
    }]
  }, {
    id: 'meta-muse', displayName: 'Meta Muse', defaultModel: 'muse-image-1.0', models: [{
      id: 'muse-image-1.0', displayName: 'Muse Image 1.0', paidRoutingEnabled: false,
      testingRoutingEnabled: true, qualificationStatus: 'internal_testing', pricingStatus: 'priced',
      capabilities: { imageGeneration: true, imageEdit: false, imageReferences: false, maxReferenceImages: 0,
        streaming: false, aspectRatios: ['1:1', '9:16'], dimensionControl: 'aspect_ratio_only' }
    }]
  }]
};

function renderPanel(provider = 'meta-muse', comparison = false, requiredReferenceCount = 0) {
  const onChange = vi.fn();
  render(<EngineTargetPanel catalog={catalog}
    value={{ provider, model: provider === 'meta-muse' ? 'muse-image-1.0' : 'existing-image', aspectRatio: '1:1', resolution: null, outputCount: 1 }}
    comparison={comparison} comparisonSlots={[{ id: 'one', provider: 'meta-muse', model: 'muse-image-1.0' }, { id: 'two', provider: 'existing', model: 'existing-image' }]}
    requiredReferenceCount={requiredReferenceCount}
    onChange={onChange} onSlotsChange={vi.fn()} onComparisonChange={vi.fn()} />);
  return onChange;
}

describe('image engine testing exposure', () => {
  it('allows internally tested Muse, shows its warning and ratio but no fictitious pixel dimensions', () => {
    const onChange = renderPanel();
    expect(screen.getByRole('option', { name: 'Meta Muse' })).not.toBeDisabled();
    expect(screen.getByText('playground.engine.internalTesting')).toBeVisible();
    expect(screen.queryByText('playground.engine.width')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.engine.height')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.engine.resolution')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '9:16 Mobile' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: '9:16' }));
  });

  it('preserves existing model dimensions and resolution', () => {
    renderPanel('existing');
    expect(screen.getByText('playground.engine.width')).toBeVisible();
    expect(screen.getByText('playground.engine.height')).toBeVisible();
    expect(screen.getByText('playground.engine.resolution')).toBeVisible();
    expect(screen.queryByText('playground.engine.internalTesting')).not.toBeInTheDocument();
  });

  it('allows internally tested Muse in eligible Playground comparison slots', () => {
    renderPanel('existing', true);
    expect(screen.getAllByRole('option', { name: 'Meta Muse' })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'Meta Muse' }).every(option => (
      !(option as HTMLOptionElement).disabled
    ))).toBe(true);
    expect(screen.getByRole('option', { name: 'Muse Image 1.0' })).not.toBeDisabled();
    expect(screen.getByText(/playground\.comparison\.internalTesting/)).toBeVisible();
  });

  it('keeps Muse unavailable in comparison when the draft has references', () => {
    renderPanel('existing', true, 1);
    expect(screen.getAllByRole('option', { name: 'Meta Muse' }).every(option => (
      (option as HTMLOptionElement).disabled
    ))).toBe(true);
    expect(screen.getByRole('option', { name: 'Muse Image 1.0' })).toBeDisabled();
  });

  it('does not allow testing flags to bypass reference or environment restrictions', () => {
    const model = catalog.providers[1]?.models[0];
    expect(model).toBeDefined();
    expect(imageModelUnavailableReason(model, 0, '1:1')).toBeNull();
    expect(imageModelUnavailableReason(model, 1, '1:1')).toBe('references_unsupported');
    expect(imageModelUnavailableReason({ ...model!, testingRoutingEnabled: false }, 0, '1:1')).toBe('provider_not_released');
  });
});
