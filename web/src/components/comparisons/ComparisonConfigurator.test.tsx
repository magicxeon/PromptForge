import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import { ComparisonConfigurator } from './ComparisonConfigurator';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
const capabilities = { imageGeneration: true, imageEdit: true, imageReferences: true, maxReferenceImages: 3,
  streaming: false, aspectRatios: ['1:1', '9:16'] };
const catalog: ProviderCatalog = { defaultProvider: 'alpha', providers: [
  { id: 'alpha', displayName: 'Alpha', defaultModel: 'shared', models: [
    { id: 'shared', displayName: 'First Model', paidRoutingEnabled: true, capabilities }] },
  { id: 'beta', displayName: 'Beta', defaultModel: 'shared', models: [
    { id: 'shared', displayName: 'Second Model', paidRoutingEnabled: true, capabilities }] },
  { id: 'blocked', displayName: 'Blocked', defaultModel: 'unsupported', models: [
    { id: 'unsupported', displayName: 'No References', paidRoutingEnabled: true,
      capabilities: { ...capabilities, imageReferences: false, maxReferenceImages: 0 } }] }
] };
const slots = [{ id: 'first', provider: 'alpha', model: 'shared' }, { id: 'second', provider: 'beta', model: 'shared' }];

describe('ComparisonConfigurator', () => {
  it('updates only the selected slot with an atomic provider/model pair', async () => {
    const onChange = vi.fn();
    render(<ComparisonConfigurator catalog={catalog} slots={slots} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'playground.engine.model' })[1]!);
    await userEvent.click(screen.getByRole('menuitemradio', { name: /First Model/ }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith([slots[0], { id: 'second', provider: 'alpha', model: 'shared' }]);
    expect(slots[1]).toEqual({ id: 'second', provider: 'beta', model: 'shared' });
  });

  it('retains model reference and aspect gates in each slot', async () => {
    const onChange = vi.fn();
    const view = render(<ComparisonConfigurator catalog={catalog} slots={slots} requiredReferenceCount={1} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'playground.engine.model' })[0]!);
    const unavailable = screen.getByRole('menuitemradio', { name: /No References/ });
    expect(unavailable).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(unavailable);
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    view.rerender(<ComparisonConfigurator catalog={catalog} slots={slots} aspectRatio="16:9" onChange={onChange} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'playground.engine.model' })[1]!);
    expect(screen.getAllByRole('menuitemradio').every(item => item.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('preserves slot identity, reorder bounds and minimum removal count', () => {
    const onChange = vi.fn();
    render(<ComparisonConfigurator catalog={catalog} slots={slots} onChange={onChange} />);
    expect(screen.getAllByRole('button', { name: 'playground.comparison.moveLeft' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'playground.comparison.moveRight' })[1]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'playground.comparison.remove' }).every(button => button.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'playground.comparison.moveRight' })[0]!);
    expect(onChange).toHaveBeenCalledExactlyOnceWith([slots[1], slots[0]]);
  });

  it('adds an eligible slot, removes only its ID, and stops at four slots', () => {
    const onChange = vi.fn();
    const view = render(<ComparisonConfigurator catalog={catalog} slots={slots} requiredReferenceCount={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /playground.comparison.add/ }));
    const added = onChange.mock.calls[0]![0];
    expect(added.slice(0, 2)).toEqual(slots);
    expect(added[2]).toEqual({ id: expect.any(String), provider: 'alpha', model: 'shared' });
    expect(added[2].id).not.toBe(slots[0]!.id);
    view.rerender(<ComparisonConfigurator catalog={catalog} slots={added} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'playground.comparison.remove' })[2]!);
    expect(onChange).toHaveBeenLastCalledWith(slots);
    view.rerender(<ComparisonConfigurator catalog={catalog} slots={[...added, { ...slots[0]!, id: 'fourth' }]} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /playground.comparison.add/ })).not.toBeInTheDocument();
  });

  it('shows per-slot quotes by ID and an aggregate only when every slot has an estimate', () => {
    const estimates = [{ id: 'second', estimatedCredit: 9 }, { id: 'first', estimatedCredit: 7 }];
    const view = render(<ComparisonConfigurator catalog={catalog} slots={slots} estimates={estimates} onChange={vi.fn()} />);
    const articles = screen.getAllByRole('article');
    expect(within(articles[0]!).getByText('7 playground.comparison.credits')).toBeVisible();
    expect(within(articles[1]!).getByText('9 playground.comparison.credits')).toBeVisible();
    expect(screen.getByText('16 playground.comparison.credits')).toBeVisible();
    view.rerender(<ComparisonConfigurator catalog={catalog} slots={slots} estimates={estimates.slice(0, 1)}
      estimating estimateError="Quote unavailable" onChange={vi.fn()} />);
    expect(screen.queryByText('16 playground.comparison.credits')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Quote unavailable');
    expect(screen.getAllByText('playground.estimate.loading')).toHaveLength(2);
  });
});
