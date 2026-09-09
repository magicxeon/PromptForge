import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EngineTargetPanel } from './EngineTargetPanel';
import { imageModelUnavailableReason, supportedImageRatio } from './engineTargetPanelHelpers';
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
      id: 'muse-image-1.0', displayName: 'Muse Image 1.0', paidRoutingEnabled: true,
      qualificationStatus: 'qualified', pricingStatus: 'priced',
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

describe('qualified image engine exposure', () => {
  it('adapts document ratios when switching providers instead of disabling eligible engines', () => {
    const onChange = vi.fn();
    const dynamic = structuredClone(catalog);
    dynamic.providers[1]!.models[0]!.capabilities.aspectRatios = ['16:9', '6:8'];
    render(<EngineTargetPanel catalog={dynamic}
      value={{ provider: 'existing', model: 'existing-image', aspectRatio: '3:4', resolution: null, outputCount: 1 }}
      adaptAspectRatio comparison={false} comparisonSlots={[]}
      onChange={onChange} onSlotsChange={vi.fn()} onComparisonChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Meta Muse' })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText('playground.engine.provider'), { target: { value: 'meta-muse' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ provider: 'meta-muse', aspectRatio: '6:8' }));
    expect(supportedImageRatio(['16:9'], '3:4')).toBe('16:9');
    expect(supportedImageRatio(['6:8', '16:9'], '16:9')).toBe('16:9');
    expect(supportedImageRatio(['3:4'], '6:8')).toBe('3:4');
  });
  it('keeps fixed-ratio engines unavailable and dynamic reference gates intact', () => {
    const props = { catalog, value: { provider: 'existing', model: 'existing-image', aspectRatio: '3:4', resolution: null, outputCount: 1 },
      comparison: false, comparisonSlots: [], onChange: vi.fn(), onSlotsChange: vi.fn(), onComparisonChange: vi.fn() };
    const view = render(<EngineTargetPanel {...props} adaptAspectRatio fixedAspectRatio="3:4" />);
    expect(screen.getByRole('option', { name: 'Meta Muse' })).toBeDisabled();
    view.rerender(<EngineTargetPanel {...props} adaptAspectRatio requiredReferenceCount={1} />);
    expect(screen.getByRole('option', { name: 'Meta Muse' })).toBeDisabled();
  });
  it('shows portrait dimensions for the document-sheet 3:4 alias', () => {
    render(<EngineTargetPanel catalog={catalog}
      value={{ provider: 'existing', model: 'existing-image', aspectRatio: '3:4', resolution: null, outputCount: 1 }}
      fixedAspectRatio="3:4" comparison={false} comparisonSlots={[]}
      onChange={vi.fn()} onSlotsChange={vi.fn()} onComparisonChange={vi.fn()} />);
    expect(screen.getByLabelText('playground.engine.width')).toHaveValue('768');
    expect(screen.getByLabelText('playground.engine.height')).toHaveValue('1024');
  });
  it('allows qualified Muse without an internal warning or fictitious pixel dimensions', () => {
    const onChange = renderPanel();
    expect(screen.getByRole('option', { name: 'Meta Muse' })).not.toBeDisabled();
    expect(screen.queryByText('playground.engine.internalTesting')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.engine.width')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.engine.height')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.engine.resolution')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '9:16 Mobile' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: '9:16' }));
  });
  it('derives dimensions for dynamic ratios beyond the old fixed table', () => {
    render(<EngineTargetPanel catalog={catalog}
      value={{ provider: 'existing', model: 'existing-image', aspectRatio: '2:3', resolution: null, outputCount: 1 }}
      adaptAspectRatio comparison={false} comparisonSlots={[]}
      onChange={vi.fn()} onSlotsChange={vi.fn()} onComparisonChange={vi.fn()} />);
    expect(screen.getByLabelText('playground.engine.width')).toHaveValue('768');
    expect(screen.getByLabelText('playground.engine.height')).toHaveValue('1152');
  });

  it('preserves existing model dimensions and resolution', () => {
    renderPanel('existing');
    expect(screen.getByText('playground.engine.width')).toBeVisible();
    expect(screen.getByText('playground.engine.height')).toBeVisible();
    expect(screen.getByText('playground.engine.resolution')).toBeVisible();
    expect(screen.queryByText('playground.engine.internalTesting')).not.toBeInTheDocument();
  });

  it('allows qualified Muse in eligible Playground comparison slots without a testing label', () => {
    renderPanel('existing', true);
    expect(screen.getAllByRole('option', { name: 'Meta Muse' })).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'Meta Muse' }).every(option => (
      !(option as HTMLOptionElement).disabled
    ))).toBe(true);
    expect(screen.getByRole('option', { name: 'Muse Image 1.0' })).not.toBeDisabled();
    expect(screen.queryByText(/playground\.comparison\.internalTesting/)).not.toBeInTheDocument();
  });

  it('keeps Muse unavailable in comparison when the draft has references', () => {
    renderPanel('existing', true, 1);
    expect(screen.getAllByRole('option', { name: 'Meta Muse' }).every(option => (
      (option as HTMLOptionElement).disabled
    ))).toBe(true);
    expect(screen.getByRole('option', { name: 'Muse Image 1.0' })).toBeDisabled();
  });

  it('does not allow qualified routing to bypass reference restrictions', () => {
    const model = catalog.providers[1]?.models[0];
    expect(model).toBeDefined();
    expect(imageModelUnavailableReason(model, 0, '1:1')).toBeNull();
    expect(imageModelUnavailableReason(model, 1, '1:1')).toBe('references_unsupported');
    expect(imageModelUnavailableReason({ ...model!, paidRoutingEnabled: false }, 0, '1:1')).toBe('provider_not_released');
  });
});
