import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GenerationStageState } from './GenerationStageState';

describe('GenerationStageState', () => {
  it('uses the shared loading halo and accessible busy status', () => {
    const { container } = render(
      <GenerationStageState
        loading
        title="Generating image"
        description="Preparing references"
      />
    );

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.generation-loading-indicator__pulse')).toBeInTheDocument();
    expect(container.querySelector('.generation-loading-indicator__glow')).toBeInTheDocument();
    expect(container.querySelector('.generation-loading-indicator__spinner')).toBeInTheDocument();
  });

  it('uses the Momelo mark without loading animation when idle', () => {
    const { container } = render(
      <GenerationStageState title="Preparing generation" description="Generate when ready" />
    );

    expect(container.querySelector('.generation-result__momelo-mark')).toBeInTheDocument();
    expect(container.querySelector('.generation-loading-indicator')).not.toBeInTheDocument();
  });
});
