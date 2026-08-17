import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EngineTargetPanelFrame } from './EngineTargetPanelFrame';

describe('EngineTargetPanelFrame', () => {
  it('preserves the shared Engine panel structure for image and video adapters', () => {
    const { container } = render(
      <EngineTargetPanelFrame
        title="Engine & Target Output"
        description="Target controls"
        badge={<span>Step 2</span>}
        action={<button type="button">Compare</button>}
      >
        <div>Controls</div>
      </EngineTargetPanelFrame>
    );

    expect(container.querySelector('.engine-target-panel')).toBeInTheDocument();
    expect(container.querySelector('.engine-target-panel__heading')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Engine & Target Output' })).toBeInTheDocument();
    expect(screen.getByText('Controls')).toBeInTheDocument();
  });
});
