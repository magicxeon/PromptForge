import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Surface } from './Surface';

describe('Surface layout contract', () => {
  it('keeps fill and centered content opt-in', () => {
    const { container, rerender } = render(<Surface>Content</Surface>);
    expect(container.firstElementChild).not.toHaveClass('surface--fill');
    expect(container.firstElementChild).not.toHaveClass('surface--center-content');

    rerender(<Surface fill centerContent>Centered content</Surface>);
    expect(container.firstElementChild).toHaveClass('surface--fill');
    expect(container.firstElementChild).toHaveClass('surface--center-content');
  });
});
