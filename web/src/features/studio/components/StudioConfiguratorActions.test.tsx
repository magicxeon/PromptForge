import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudioConfiguratorActions } from './StudioConfiguratorActions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('StudioConfiguratorActions visibility contract', () => {
  it('keeps every required action on the standard Studio form', () => {
    renderActions();

    expect(screen.getByRole('button', { name: 'ui.studio.reset' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'ui.studio.surprise' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'ui.studio.export' })).toBeVisible();
  });

  it('keeps Reset while removing Scene actions retired by its requirement', () => {
    const onReset = vi.fn();
    renderActions({ onReset, variant: 'scene' });

    const reset = screen.getByRole('button', { name: 'ui.studio.reset' });
    expect(reset).toBeVisible();
    expect(screen.queryByRole('button', { name: 'ui.studio.surprise' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ui.studio.export' })).not.toBeInTheDocument();

    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledOnce();
  });
});

function renderActions(overrides: Partial<Parameters<typeof StudioConfiguratorActions>[0]> = {}) {
  const props = {
    onReset: vi.fn(),
    onRandomize: vi.fn(),
    onExport: vi.fn(),
    ...overrides
  };
  return render(<StudioConfiguratorActions {...props} />);
}
