import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button loading state', () => {
  it('uses the shared yellow ProcessingSpinner and prevents duplicate submission', () => {
    render(<Button variant="primary" loading>Generate</Button>);
    const button = screen.getByRole('button', { name: 'Generate' });
    const spinner = button.querySelector('[data-processing-spinner="true"]');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(spinner).toHaveStyle({ color: 'var(--theme-warning)' });
  });
});
