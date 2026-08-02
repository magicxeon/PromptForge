import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { VisualOptionPicker } from './VisualOptionPicker';

const testI18n = i18next.createInstance();
const field = {
  name: 'Pose Intent',
  control: 'select',
  group: 'Pose',
  options: []
};

describe('VisualOptionPicker custom input limits', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.visual.custom': 'Custom write-in',
            'ui.visual.customCharacterCount': '{count} / {limit}; {total} / {totalLimit}',
            'ui.visual.customFieldTooLong': '{count} exceeds {limit}',
            'ui.visual.customPlaceholder': 'Custom {field}',
            'ui.visual.customTotalTooLong': '{count} total exceeds {limit}',
            'ui.visual.lock': 'Lock',
            'ui.visual.select': 'Select',
            'ui.visual.use': 'Use'
          }
        }
      },
      ns: ['react-ui'],
      defaultNS: 'react-ui',
      keySeparator: false,
      interpolation: { escapeValue: false, prefix: '{', suffix: '}' }
    });
  });

  it('preserves a detailed pose and blocks over-limit text without truncation', () => {
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <VisualOptionPicker
          field={field}
          customInputLimits={{ maxCharactersPerField: 1000, maxCharactersTotal: 2000 }}
          onChange={onChange}
        />
      </I18nextProvider>
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__custom__' } });
    const input = screen.getByRole('textbox');
    const pose = 'A'.repeat(829);
    fireEvent.change(input, { target: { value: pose } });
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: pose }));

    const overLimit = 'B'.repeat(1001);
    fireEvent.change(input, { target: { value: overLimit } });
    expect(input).toHaveValue(overLimit);
    expect(screen.getByRole('button', { name: 'Use' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('1001 exceeds 1000');
  });
});
