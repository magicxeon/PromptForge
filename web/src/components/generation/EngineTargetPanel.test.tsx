import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EngineTargetPanel } from './EngineTargetPanel';
import { imageModelUnavailableReason, supportedImageRatio } from './engineTargetPanelHelpers';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));

const catalog: ProviderCatalog = {
  defaultProvider: 'existing', providers: [{
    id: 'existing', displayName: 'Existing', defaultModel: 'existing-image', models: [{
      id: 'existing-image', displayName: 'Existing Image', paidRoutingEnabled: true,
      capabilities: { imageGeneration: true, imageEdit: false, imageReferences: false, maxReferenceImages: 0,
        streaming: false, aspectRatios: ['1:1', '9:16'], resolutions: ['1K', '2K'] }
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
function props(overrides: Partial<ComponentProps<typeof EngineTargetPanel>> = {}) {
  return { catalog, value: { provider: 'existing', model: 'existing-image', aspectRatio: '1:1', resolution: '1K', outputCount: 1 },
    comparison: false, comparisonSlots: [{ id: 'one', provider: 'meta-muse', model: 'muse-image-1.0' },
      { id: 'two', provider: 'existing', model: 'existing-image' }],
    onChange: vi.fn(), onSlotsChange: vi.fn(), onComparisonChange: vi.fn(), ...overrides };
}
function openDetails() {
  fireEvent.click(screen.getByText('playground.options.more'));
}
async function openModels(index = 0) {
  await userEvent.click(screen.getAllByRole('button', { name: 'playground.engine.model' })[index]!);
}

describe('qualified image engine exposure', () => {
  it('keeps a single operable Compare action when the inline model picker disappears', () => {
    const callbacks = props({ inlineModelAction: true });
    const view = render(<EngineTargetPanel {...callbacks} />);
    const compare = screen.getByRole('button', { name: 'playground.action.compare' });
    expect(compare.closest('.generation-model-picker__heading')).not.toBeNull();
    compare.focus();
    fireEvent.click(compare);
    expect(callbacks.onComparisonChange).toHaveBeenCalledWith(true);
    view.rerender(<EngineTargetPanel {...callbacks} comparison />);
    const active = screen.getByRole('button', { name: 'playground.action.compare 2/4' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(active).toHaveFocus();
    fireEvent.click(active);
    expect(callbacks.onComparisonChange).toHaveBeenLastCalledWith(false);
    view.rerender(<EngineTargetPanel {...callbacks} comparison={false} />);
    expect(screen.getByRole('button', { name: 'playground.action.compare' })).toHaveFocus();
    view.rerender(<EngineTargetPanel {...callbacks} inlineModelAction={false} />);
    expect(screen.getByRole('button', { name: 'playground.action.compare' }).closest('.engine-target-panel__heading')).not.toBeNull();
  });

  it('labels refinement free inside More and preserves its switch', () => {
    const callbacks = props({ promptRefinementAvailable: true, promptRefinementEnabled: false,
      onPromptRefinementChange: vi.fn() });
    const view = render(<EngineTargetPanel {...callbacks} />);
    expect(screen.getByText('playground.promptRefinement.free')).toBeVisible();
    expect(screen.getByRole('switch')).not.toBeVisible();
    openDetails();
    expect(screen.getByText('playground.promptRefinement.free')).toHaveClass('text-[var(--theme-success)]');
    fireEvent.click(screen.getByRole('switch', { name: 'playground.promptRefinement.label' }));
    expect(callbacks.onPromptRefinementChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'playground.engine.model' })).toBeEnabled();
    view.rerender(<EngineTargetPanel {...callbacks} promptRefinementAvailable={false} />);
    expect(screen.queryByText('playground.promptRefinement.free')).not.toBeInTheDocument();
  });

  it('displays locked portrait output despite square persisted selection', () => {
    render(<EngineTargetPanel {...props({ fixedAspectRatio: '9:16' })} />);
    const aspect = screen.getByRole('combobox', { name: 'playground.engine.aspect' });
    expect(aspect).toBeDisabled();
    expect(aspect).toHaveValue('9:16');
    expect(aspect).toHaveAccessibleDescription('playground.options.locked');
    expect(within(aspect).queryByRole('option', { name: '1:1' })).not.toBeInTheDocument();
    openDetails();
    expect(screen.getByLabelText('playground.engine.width')).toHaveTextContent('768 px');
    expect(screen.getByLabelText('playground.engine.height')).toHaveTextContent('1365 px');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('adapts document ratio when selecting a model across providers', async () => {
    const dynamic = structuredClone(catalog);
    dynamic.providers[1]!.models[0]!.capabilities.aspectRatios = ['16:9', '6:8'];
    const callbacks = props({ catalog: dynamic, adaptAspectRatio: true,
      value: { provider: 'existing', model: 'existing-image', aspectRatio: '3:4', resolution: '1K', outputCount: 1 } });
    render(<EngineTargetPanel {...callbacks} />);
    await openModels();
    const muse = screen.getByRole('menuitemradio', { name: /Muse Image 1.0/ });
    expect(muse).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(muse);
    expect(callbacks.onChange).toHaveBeenCalledExactlyOnceWith({
      provider: 'meta-muse', model: 'muse-image-1.0', aspectRatio: '6:8', resolution: null, outputCount: 1
    });
    expect(screen.getByText('playground.options.selectionChanged')).toHaveAttribute('role', 'status');
    expect(supportedImageRatio(['16:9'], '3:4')).toBe('16:9');
    expect(supportedImageRatio(['6:8', '16:9'], '16:9')).toBe('16:9');
    expect(supportedImageRatio(['3:4'], '6:8')).toBe('3:4');
  });

  it('preserves compatible resolution and count when changing model', async () => {
    const dynamic = structuredClone(catalog);
    dynamic.providers[1]!.models[0]!.capabilities.resolutions = ['1K', '2K'];
    const callbacks = props({ catalog: dynamic,
      value: { provider: 'existing', model: 'existing-image', aspectRatio: '9:16', resolution: '2K', outputCount: 3 } });
    render(<EngineTargetPanel {...callbacks} />);
    await openModels();
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Muse Image 1.0/ }));
    expect(callbacks.onChange).toHaveBeenCalledExactlyOnceWith({
      provider: 'meta-muse', model: 'muse-image-1.0', aspectRatio: '9:16', resolution: '2K', outputCount: 3
    });
    expect(screen.queryByText('playground.options.selectionChanged')).not.toBeInTheDocument();
  });

  it.each([{ fixedAspectRatio: '3:4' }, { requiredReferenceCount: 1 }])(
    'keeps ratio and reference incompatibility gates intact (%j)', async constraint => {
      const callbacks = props({ adaptAspectRatio: true, ...constraint });
      render(<EngineTargetPanel {...callbacks} />);
      await openModels();
      const unavailable = screen.getByRole('menuitemradio', { name: /Muse Image 1.0/ });
      expect(unavailable).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(unavailable);
      expect(callbacks.onChange).not.toHaveBeenCalled();
    });

  it.each([['3:4', '1024'], ['2:3', '1152']])('derives read-only dimensions for %s', (ratio, height) => {
    render(<EngineTargetPanel {...props({ fixedAspectRatio: ratio })} />);
    openDetails();
    expect(screen.getByLabelText('playground.engine.width')).toHaveTextContent('768 px');
    expect(screen.getByLabelText('playground.engine.height')).toHaveTextContent(height + ' px');
  });

  it('allows qualified Muse without invented dimensions or resolution', () => {
    const callbacks = props({ value: { provider: 'meta-muse', model: 'muse-image-1.0',
      aspectRatio: '1:1', resolution: null, outputCount: 1 } });
    render(<EngineTargetPanel {...callbacks} />);
    expect(screen.queryByText('playground.options.more')).not.toBeInTheDocument();
    expect(screen.queryByText('playground.engine.internalTesting')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('playground.engine.width')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('playground.engine.height')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'playground.engine.resolution' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'playground.engine.aspect' }), { target: { value: '9:16' } });
    expect(callbacks.onChange).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: '9:16' }));
  });

  it('preserves existing resolution selection and read-only dimensions', () => {
    const callbacks = props();
    render(<EngineTargetPanel {...callbacks} />);
    openDetails();
    expect(screen.getByLabelText('playground.engine.width')).toHaveTextContent('1024 px');
    expect(screen.getByLabelText('playground.engine.height')).toHaveTextContent('1024 px');
    fireEvent.change(screen.getByRole('combobox', { name: 'playground.engine.resolution' }), { target: { value: '2K' } });
    expect(callbacks.onChange).toHaveBeenCalledWith(expect.objectContaining({ resolution: '2K' }));
    expect(screen.queryByText('playground.engine.internalTesting')).not.toBeInTheDocument();
  });

  it('keeps eligible comparison models visible without testing labels', async () => {
    render(<EngineTargetPanel {...props({ comparison: true })} />);
    await openModels();
    expect(screen.getByRole('menuitemradio', { name: /Muse Image 1.0/ })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(/playground\.comparison\.internalTesting/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'playground.engine.increaseImages' })).not.toBeInTheDocument();
  });

  it('retains reference restrictions in comparison slots', async () => {
    render(<EngineTargetPanel {...props({ comparison: true, requiredReferenceCount: 1 })} />);
    await openModels();
    expect(screen.getByRole('menuitemradio', { name: /Muse Image 1.0/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitemradio', { name: /Muse Image 1.0/ })).toHaveTextContent('references_unsupported');
  });

  it('does not allow qualification to bypass references or paid routing', () => {
    const model = catalog.providers[1]!.models[0]!;
    expect(imageModelUnavailableReason(model, 0, '1:1')).toBeNull();
    expect(imageModelUnavailableReason(model, 1, '1:1')).toBe('references_unsupported');
    expect(imageModelUnavailableReason({ ...model, paidRoutingEnabled: false }, 0, '1:1')).toBe('provider_not_released');
  });

  it('bounds output count and hides the stepper when the template forbids it', () => {
    const callbacks = props();
    const view = render(<EngineTargetPanel {...callbacks} />);
    expect(screen.getByRole('button', { name: 'playground.engine.decreaseImages' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'playground.engine.increaseImages' }));
    expect(callbacks.onChange).toHaveBeenCalledWith(expect.objectContaining({ outputCount: 2 }));
    view.rerender(<EngineTargetPanel {...callbacks} value={{ ...callbacks.value, outputCount: 4 }} />);
    expect(screen.getByRole('button', { name: 'playground.engine.increaseImages' })).toBeDisabled();
    view.rerender(<EngineTargetPanel {...callbacks} allowMultiOutput={false} allowComparison={false} />);
    expect(screen.getByRole('combobox', { name: 'playground.engine.images' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'playground.engine.images' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'playground.engine.images' })).toHaveAccessibleDescription('playground.options.locked');
    expect(screen.queryByRole('button', { name: 'playground.engine.increaseImages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'playground.action.compare' })).not.toBeInTheDocument();
  });

  it('retains active comparison and caller controls outside and inside More', () => {
    const callbacks = props({ comparison: true, extraControls: <button>Caller control</button> });
    render(<EngineTargetPanel {...callbacks} />);
    expect(screen.getByText('playground.comparison.title')).toBeVisible();
    expect(screen.getByRole('button', { name: /playground.action.compare/ })).toHaveTextContent('2/4');
    expect(screen.getByRole('button', { name: 'Caller control' })).not.toBeVisible();
    openDetails();
    expect(screen.getByRole('button', { name: 'Caller control' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /playground.action.compare/ }));
    expect(callbacks.onComparisonChange).toHaveBeenCalledWith(false);
  });
});
