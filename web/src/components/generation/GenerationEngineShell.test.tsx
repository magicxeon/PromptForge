import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GenerationEngineShell } from './GenerationEngineShell';

describe('GenerationEngineShell', () => {
  it('owns the shared Studio action-border contract for every media workspace', () => {
    render(<GenerationEngineShell aria-label="Video engine">Engine content</GenerationEngineShell>);

    expect(screen.getByRole('region', { name: 'Video engine' })).toHaveClass(
      'studio-step-card',
      'studio-step-card--generation'
    );
  });
});
