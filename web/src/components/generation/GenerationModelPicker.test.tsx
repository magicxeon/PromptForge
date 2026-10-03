import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GenerationModelPicker, type GenerationModelOption } from './GenerationModelPicker';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const options: GenerationModelOption[] = [
  { providerId: 'alpha', modelId: 'shared', providerLabel: 'Alpha', modelLabel: 'First Model' },
  { providerId: 'beta', modelId: 'shared', providerLabel: 'Beta', modelLabel: 'Second Model' },
  { providerId: 'blocked', modelId: 'restricted', providerLabel: 'Restricted Provider',
    modelLabel: 'Unavailable Model', disabledReason: 'References are not supported' }
];

function setup(providerId = 'alpha', modelId = 'shared') {
  const onChange = vi.fn();
  render(<GenerationModelPicker options={options} providerId={providerId} modelId={modelId} onChange={onChange} />);
  return { user: userEvent.setup(), onChange, trigger: screen.getByRole('button', { name: 'playground.engine.model' }) };
}

describe('GenerationModelPicker', () => {
  it('selects provider and model atomically even when model IDs are shared', async () => {
    const { user, onChange, trigger } = setup();
    expect(trigger).toHaveTextContent('First Model');
    expect(trigger).toHaveTextContent('Alpha');
    await user.click(trigger);
    expect(screen.getByRole('menuitemradio', { name: /First Model/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('menuitemradio', { name: /Second Model/ }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ providerId: 'beta', modelId: 'shared' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('searches providers, preserves disabled reasons, and reports no matches', async () => {
    const { user, onChange, trigger } = setup();
    await user.click(trigger);
    const search = screen.getByRole('searchbox', { name: 'playground.options.searchModels' });
    await user.type(search, 'Restricted Provider');
    expect(screen.queryByRole('menuitemradio', { name: /First Model/ })).not.toBeInTheDocument();
    const unavailable = screen.getByRole('menuitemradio', { name: /Unavailable Model/ });
    expect(unavailable).toHaveAttribute('aria-disabled', 'true');
    expect(unavailable).toHaveTextContent('References are not supported');
    await user.click(unavailable);
    expect(onChange).not.toHaveBeenCalled();
    await user.clear(search);
    await user.type(search, 'no such engine');
    expect(screen.getByRole('status')).toHaveTextContent('playground.options.noModels');
    expect(screen.queryAllByRole('menuitemradio')).toHaveLength(0);
  });

  it('keeps unavailable persisted selection visible without silently changing it', () => {
    const { trigger, onChange } = setup('removed', 'saved-model');
    expect(trigger).toHaveTextContent('saved-model');
    expect(trigger).toHaveTextContent('removed');
    expect(screen.getByRole('status')).toHaveTextContent('playground.options.modelUnavailable');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('announces the selected model incompatibility reason', () => {
    setup('blocked', 'restricted');
    expect(screen.getByRole('status')).toHaveTextContent('References are not supported');
  });

  it('supports keyboard selection and restores trigger focus on Escape', async () => {
    const { user, trigger, onChange } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole('searchbox'));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /First Model/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ providerId: 'beta', modelId: 'shared' });
    await user.click(trigger);
    await user.click(screen.getByRole('searchbox'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not treat Thai IME arrow events as menu navigation', async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const search = screen.getByRole('searchbox');
    search.focus();
    fireEvent.keyDown(search, { key: 'ArrowDown', isComposing: true });
    expect(search).toHaveFocus();
  });

  it('focuses search on open and returns from the first item with ArrowUp', async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    const search = screen.getByRole('searchbox');
    await waitFor(() => expect(search).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /First Model/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(search).toHaveFocus();
    await user.type(search, 'Beta');
    const result = screen.getByRole('menuitemradio', { name: /Second Model/ });
    await user.hover(result);
    expect(search).toHaveFocus();
    await user.unhover(result);
    expect(search).toHaveFocus();
  });

  it('skips unavailable models when navigating from search', async () => {
    const onChange = vi.fn();
    render(<GenerationModelPicker options={[options[2]!, options[1]!]}
      providerId="beta" modelId="shared" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'playground.engine.model' }));
    await user.click(screen.getByRole('searchbox'));
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ providerId: 'beta', modelId: 'shared' });
  });

  it('keeps Tab within the parent dialog instead of entering background controls', async () => {
    const rects = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    try {
      render(<><button>Background before</button><div role="dialog" aria-label="Generation settings">
        <button>Dialog first</button><GenerationModelPicker options={options} providerId="alpha"
          modelId="shared" onChange={vi.fn()} /></div><button>Background after</button></>);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'playground.engine.model' }));
      await user.click(screen.getByRole('searchbox'));
      await user.tab();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Dialog first' })).toHaveFocus());
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    } finally {
      rects.mockRestore();
    }
  });

  it.each([false, true])('exits Tab (backward=%s) to the surrounding form', async backward => {
    const rects = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    try {
      render(<><button>Before</button><GenerationModelPicker options={options}
        providerId="alpha" modelId="shared" onChange={vi.fn()} /><button>After</button></>);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'playground.engine.model' }));
      await user.click(screen.getByRole('searchbox'));
      await user.tab({ shift: backward });
      await waitFor(() => expect(screen.getByRole('button', { name: backward ? 'Before' : 'After' })).toHaveFocus());
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    } finally {
      rects.mockRestore();
    }
  });
});
