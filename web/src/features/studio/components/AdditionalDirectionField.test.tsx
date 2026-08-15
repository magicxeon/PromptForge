import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ADDITIONAL_DIRECTION_MAX_LENGTH } from '../additionalDirectionContract';
import { AdditionalDirectionField } from './AdditionalDirectionField';

describe('AdditionalDirectionField', () => {
  it('limits input to 300 Unicode characters and reports the normalized value', () => {
    const onChange = vi.fn();
    render(<AdditionalDirectionField value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: {
        value: `${'a'.repeat(ADDITIONAL_DIRECTION_MAX_LENGTH)}extra`
      }
    });

    expect(onChange).toHaveBeenCalledWith(
      'a'.repeat(ADDITIONAL_DIRECTION_MAX_LENGTH)
    );
  });
});
